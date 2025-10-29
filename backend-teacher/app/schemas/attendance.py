# 출석 관련 스키마
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.attendance import AttendanceStatus

class AttendanceBase(BaseModel):
    student_id: int
    date: datetime
    status: AttendanceStatus
    note: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    note: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None

class AttendanceResponse(AttendanceBase):
    id: int
    teacher_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
