# 시간표 모델
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class DayOfWeek(str, enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class Schedule(Base):
    __tablename__ = "schedule"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 교사 정보
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher = relationship("User")
    
    # 수업 정보
    subject = Column(String, nullable=False)  # 과목명
    grade = Column(Integer, nullable=False)  # 학년
    class_number = Column(Integer, nullable=False)  # 반
    
    # 시간 정보
    day_of_week = Column(Enum(DayOfWeek), nullable=False)  # 요일
    period = Column(Integer, nullable=False)  # 교시
    start_time = Column(String)  # 시작 시간 (HH:MM)
    end_time = Column(String)    # 종료 시간 (HH:MM)
    
    # 장소 정보
    classroom = Column(String)  # 교실
    
    # 학기 정보
    semester = Column(Integer, default=1)  # 학기
    year = Column(Integer, nullable=False)  # 학년도
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
