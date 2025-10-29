# 출석 모델
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"  # 출석
    ABSENT = "absent"    # 결석
    LATE = "late"        # 지각
    EARLY_LEAVE = "early_leave"  # 조퇴
    EXCUSED = "excused"  # 공결

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 학생 정보
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    student = relationship("Student")
    
    # 교사 정보
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher = relationship("User")
    
    # 출석 정보
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    note = Column(String)  # 비고
    
    # 시간 정보
    check_in_time = Column(DateTime(timezone=True))  # 등교 시간
    check_out_time = Column(DateTime(timezone=True))  # 하교 시간
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
