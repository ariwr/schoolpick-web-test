# 시간표 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schedule import ScheduleResponse, ScheduleCreate, ScheduleUpdate
from app.services.schedule_service import ScheduleService
from app.services.auth_service import AuthService

router = APIRouter()

@router.get("/", response_model=list[ScheduleResponse])
async def get_schedule(
    day_of_week: str = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """교사 시간표 조회"""
    schedule_service = ScheduleService(db)
    schedules = schedule_service.get_teacher_schedule(
        current_user["id"], day_of_week
    )
    return schedules

@router.post("/", response_model=ScheduleResponse)
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """수업 일정 추가"""
    schedule_service = ScheduleService(db)
    schedule = schedule_service.create_schedule(schedule_data, current_user["id"])
    return schedule

@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """수업 일정 수정"""
    schedule_service = ScheduleService(db)
    updated_schedule = schedule_service.update_schedule(schedule_id, schedule_update)
    if not updated_schedule:
        raise HTTPException(status_code=404, detail="수업 일정을 찾을 수 없습니다")
    return updated_schedule
