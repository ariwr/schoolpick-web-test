# 교사 관련 스키마
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date

class TeacherCreate(BaseModel):
    """교사 회원가입용 스키마"""
    email: EmailStr
    password: str
    name: str
    phone: str  # 전화번호 (필수)
    birth_date: Optional[date] = None
    school_name: str  # 학교 이름 (필수)
    position: str = "교과"  # 기본값: 교과
    hire_date: Optional[date] = None
    is_homeroom_teacher: bool = False
    certification_number: Optional[str] = None

class TeacherResponse(BaseModel):
    """교사 정보 응답 스키마"""
    id: int
    user_id: int
    teacher_number: str
    school_id: Optional[int]
    position: str
    hire_date: Optional[date]
    is_homeroom_teacher: bool
    certification_number: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

