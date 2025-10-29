# 학생 관련 스키마
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    student_id: str
    name: str
    grade: int
    class_number: int
    student_number: int
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None

class StudentCreate(StudentBase):
    homeroom_teacher_id: int

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    homeroom_teacher_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
