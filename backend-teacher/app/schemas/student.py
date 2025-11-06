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
    user_id: Optional[int] = None
    homeroom_teacher_id: Optional[int] = None  # 프로퍼티로 계산
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Student 모델을 StudentResponse로 변환"""
        # 프로퍼티를 사용하여 데이터 매핑
        data = {
            "id": obj.id,
            "student_id": obj.student_id,  # 프로퍼티
            "name": obj.name,  # 프로퍼티
            "grade": obj.grade,
            "class_number": obj.class_number,
            "student_number": int(obj.student_number) if obj.student_number.isdigit() else 0,
            "phone": None,
            "parent_phone": None,
            "address": None,
            "user_id": obj.user_id,
            "homeroom_teacher_id": obj.homeroom_teacher_id,  # 프로퍼티
            "is_active": obj.is_active,  # 프로퍼티 사용
            "created_at": obj.created_at,
            "updated_at": obj.updated_at
        }
        return cls(**data)
