from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.database import get_db
from app.api.deps import get_current_user
from app.models.existing_db import LectureBlock, LectureGroup, Teacher, Facility, ScheduleMetadata
from app.schemas.schedule import (
    LectureBlockCreate,
    LectureBlockResponse,
    LectureGroupCreate,
    LectureGroupCreateBatch,
    LectureGroupResponse,
    ValidationResult,
    ValidationError,
    ScheduleMetadataCreate,
    ScheduleMetadataResponse
)
from app.services.validator import ScheduleValidator
from app.services.scheduler import AutoScheduler

router = APIRouter()

# --- Schedule Metadata Endpoints ---

@router.get("/active", response_model=ScheduleMetadataResponse)
def get_active_schedule(db: Session = Depends(get_db)):
    """현재 활성화된 시간표 버전 조회"""
    schedule = db.query(ScheduleMetadata).filter(ScheduleMetadata.is_active == True).first()
    if not schedule:
        # 활성화된 것이 없으면 가장 최근 생성된 것을 반환하거나 404
        # 여기서는 가장 최근 것을 자동 활성화 하는 등의 로직을 넣거나 404를 내보냄
        schedule = db.query(ScheduleMetadata).order_by(desc(ScheduleMetadata.created_at)).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="No schedule found")
    return schedule

@router.post("/metadata", response_model=ScheduleMetadataResponse)
def create_schedule_metadata(schedule_in: ScheduleMetadataCreate, db: Session = Depends(get_db)):
    """새로운 시간표 버전 생성"""
    if schedule_in.is_active:
        # 기존 활성화된 것들을 비활성화
        db.query(ScheduleMetadata).filter(ScheduleMetadata.is_active == True).update({"is_active": False})
    
    new_schedule = ScheduleMetadata(**schedule_in.dict())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

# --- Validator Engine ---
def validate_assignment(db: Session, block_in: LectureBlockCreate) -> ValidationResult:
    errors = []
    warnings = []
    
    # 1. Fetch Context (LectureGroup -> Teacher, Grade, Class)
    group = db.query(LectureGroup).filter(LectureGroup.id == block_in.group_id).first()
    if not group:
        return ValidationResult(
            is_valid=False, 
            errors=[ValidationError(type="INVALID_GROUP", description="Invalid group_id: Lecture Group not found")]
        )

    # 2. Hard Constraint: Teacher Double Booking
    # 같은 요일(day), 교시(period)에 해당 교사(teacher_id)가 이미 다른 블록에 있는지 확인
    conflict_block = (
        db.query(LectureBlock)
        .join(LectureGroup)
        .filter(
            LectureBlock.day == block_in.day,
            LectureBlock.period == block_in.period,
            LectureGroup.teacher_id == group.teacher_id,
            LectureBlock.id != 0 # Skip self if updating (not handled here yet)
        )
        .first()
    )
    
    if conflict_block:
        teacher_name = group.teacher.name if group.teacher else "Unknown"
        errors.append(ValidationError(
            type="DOUBLE_BOOKING_TEACHER",
            description=f"교사 중복 배정: {teacher_name} 선생님은 이미 {conflict_block.day} {conflict_block.period}교시에 수업이 있습니다.",
            block_ids=[conflict_block.id],
            teacher_id=group.teacher_id,
            day=block_in.day,
            period=block_in.period
        ))

    # 3. Hard Constraint: Room Double Booking
    if block_in.room_id:
        room_conflict = (
            db.query(LectureBlock)
            .filter(
                LectureBlock.day == block_in.day,
                LectureBlock.period == block_in.period,
                LectureBlock.room_id == block_in.room_id
            )
            .first()
        )
        if room_conflict:
            room = db.query(Facility).filter(Facility.id == block_in.room_id).first()
            room_name = room.name if room else "Unknown"
            errors.append(ValidationError(
                type="DOUBLE_BOOKING_ROOM",
                description=f"특별실 중복: {room_name}은(는) 이미 사용 중입니다.",
                block_ids=[room_conflict.id],
                room_id=block_in.room_id,
                day=block_in.day,
                period=block_in.period
            ))

    # 4. Soft Constraint: Max Daily Hours (Example)
    # 해당 교사의 오늘 수업 시수 계산
    daily_count = (
        db.query(LectureBlock)
        .join(LectureGroup)
        .filter(
            LectureBlock.day == block_in.day,
            LectureGroup.teacher_id == group.teacher_id
        )
        .count()
    )
    if daily_count >= 4: # 예: 하루 4시간 이상이면 경고
        warnings.append(f"피로도 경고: 해당 교사는 {block_in.day}요일에 이미 {daily_count}시간 수업이 있습니다.")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )

# --- Endpoints ---

@router.post("/groups", response_model=LectureGroupResponse)
def create_lecture_group(group_in: LectureGroupCreate, db: Session = Depends(get_db)):
    """수업 그룹(Intent) 생성"""
    group = LectureGroup(**group_in.dict())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group

@router.post("/groups/batch", response_model=List[LectureGroupResponse])
def create_lecture_groups_batch(batch_in: LectureGroupCreateBatch, db: Session = Depends(get_db)):
    """수업 그룹(Intent) 일괄 생성 (Performance Optimized)"""
    new_groups = []
    
    # 1. Prepare objects
    for group_data in batch_in.groups:
        new_group = LectureGroup(
            schedule_id=batch_in.schedule_id,
            subject_id=group_data.subject_id,
            teacher_id=group_data.teacher_id,
            grade=group_data.grade,
            class_num=group_data.class_num,
            total_credits=group_data.total_credits,
            slicing_option=group_data.slicing_option,
            neis_class_code=group_data.neis_class_code,
            student_count=group_data.student_count
        )
        new_groups.append(new_group)
    
    # 2. Bulk Insert (Using add_all is simpler for getting IDs back with refresh, 
    # but bulk_save_objects is faster if IDs not needed immediately. 
    # Frontend needs IDs? Yes, for hydration. 
    # So we use add_all + commit, which is reasonably fast for <1000 items)
    db.add_all(new_groups)
    db.commit()
    
    # 3. Refresh to get IDs
    for g in new_groups:
        db.refresh(g)
        
    return new_groups

@router.post("/blocks", response_model=LectureBlockResponse)
def create_lecture_block(block_in: LectureBlockCreate, db: Session = Depends(get_db)):
    """수업 블록(Assignment) 생성 - Validator 포함"""
    
    # 1. Run Validation
    validation = validate_assignment(db, block_in)
    
    # 2. Halt on Hard Errors
    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Validation Failed",
                "errors": validation.errors,
                "warnings": validation.warnings
            }
        )

    block = LectureBlock(**block_in.dict())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block

@router.get("/groups", response_model=List[LectureGroupResponse])
def get_lecture_groups(schedule_id: int, db: Session = Depends(get_db)):
    """특정 시간표의 모든 수업 그룹 조회"""
    groups = db.query(LectureGroup).filter(LectureGroup.schedule_id == schedule_id).all()
    return groups

@router.get("/blocks", response_model=List[LectureBlockResponse])
def get_lecture_blocks(schedule_id: int, db: Session = Depends(get_db)):
    """특정 시간표의 모든 수업 블록 조회"""
    blocks = (
        db.query(LectureBlock)
        .join(LectureGroup)
        .filter(LectureGroup.schedule_id == schedule_id)
        .all()
    )
    return blocks

@router.post("/{schedule_id}/validate", response_model=ValidationResult)
def validate_full_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """전체 시간표 유효성 검사 수행"""
    validator = ScheduleValidator(db, schedule_id)
    # Run validation
    result_dataclass = validator.validate()
    
    # Convert dataclass errors to Pydantic models
    pydantic_errors = []
    for err in result_dataclass.errors:
        pydantic_errors.append(ValidationError(**err))
        
    return ValidationResult(
        is_valid=result_dataclass.is_valid,
        errors=pydantic_errors,
        warnings=[] # Warnings not implemented in service yet
    )

@router.post("/{schedule_id}/auto-schedule", response_model=List[LectureBlockResponse])
def run_auto_scheduler(schedule_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """자동 배정 실행"""
    # 1. Clear existing blocks? (Optional, depends on use case. For now, assume adding to empty or filling gaps)
    # If full reschedule requested:
    # db.query(LectureBlock).join(LectureGroup).filter(LectureGroup.schedule_id == schedule_id).delete()
    
    scheduler = AutoScheduler(db, schedule_id, current_user.id)
    try:
        new_blocks = scheduler.schedule()
        
        # Bulk insert
        for block in new_blocks:
            db.add(block)
        db.commit()
        
        # Refresh to get IDs
        for block in new_blocks:
            db.refresh(block)
            
        return new_blocks
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Scheduling failed: {str(e)}")

@router.post("/validate-check", response_model=ValidationResult)
def check_validation_only(block_in: LectureBlockCreate, db: Session = Depends(get_db)):
    """저장하지 않고 유효성 검사만 수행 (드래그 앤 드롭 미리보기용)"""
    return validate_assignment(db, block_in)
