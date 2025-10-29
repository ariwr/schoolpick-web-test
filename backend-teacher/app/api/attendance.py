# 출석 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.attendance import AttendanceResponse, AttendanceCreate, AttendanceUpdate
from app.services.attendance_service import AttendanceService
from app.services.auth_service import AuthService

router = APIRouter()

@router.get("/", response_model=list[AttendanceResponse])
async def get_attendance(
    date: str = None,
    student_id: int = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 현황 조회"""
    attendance_service = AttendanceService(db)
    attendance_records = attendance_service.get_attendance_records(
        current_user["id"], date, student_id
    )
    return attendance_records

@router.post("/", response_model=AttendanceResponse)
async def create_attendance(
    attendance_data: AttendanceCreate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 체크"""
    attendance_service = AttendanceService(db)
    attendance_record = attendance_service.create_attendance_record(
        attendance_data, current_user["id"]
    )
    return attendance_record

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 정보 수정"""
    attendance_service = AttendanceService(db)
    updated_attendance = attendance_service.update_attendance_record(
        attendance_id, attendance_update
    )
    if not updated_attendance:
        raise HTTPException(status_code=404, detail="출석 기록을 찾을 수 없습니다")
    return updated_attendance
