# 시간표 관련 스키마
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.schedule import DayOfWeek

class ScheduleBase(BaseModel):
    subject: str
    grade: int
    class_number: int
    day_of_week: DayOfWeek
    period: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    classroom: Optional[str] = None
    semester: int = 1
    year: int

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    subject: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    classroom: Optional[str] = None
    note: Optional[str] = None

class ScheduleResponse(ScheduleBase):
    id: int
    teacher_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
