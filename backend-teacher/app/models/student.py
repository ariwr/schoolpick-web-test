# 학생 모델
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)  # 학번
    name = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)  # 학년
    class_number = Column(Integer, nullable=False)  # 반
    student_number = Column(Integer, nullable=False)  # 번호
    
    # 담임교사 ID (외래키)
    homeroom_teacher_id = Column(Integer, ForeignKey("users.id"))
    homeroom_teacher = relationship("User", back_populates="students")
    
    # 기본 정보
    phone = Column(String)
    parent_phone = Column(String)
    address = Column(String)
    
    # 상태 정보
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
