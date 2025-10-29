# 사용자 모델
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    ADMIN = "admin"
    PRINCIPAL = "principal"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    user_type = Column(Enum(UserRole), default=UserRole.TEACHER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 교사 관련 필드
    teacher_id = Column(String, unique=True, index=True)  # 교사 고유 ID
    department = Column(String)  # 부서/과목
    phone = Column(String)  # 연락처
    
    # 관계 설정
    students = relationship("Student", back_populates="homeroom_teacher")
