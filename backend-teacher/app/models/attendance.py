# 출석 모델
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum, Text, JSON, DECIMAL
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"  # 출석
    ABSENT = "absent"    # 결석
    LATE = "late"        # 지각
    EARLY_LEAVE = "early_leave"  # 조퇴
    EARLY_LEAVE_REQUEST = "early_leave_request"  # 조퇴 요청 (야자)
    COMPLETED = "completed"  # 정상 완료 (야자 종료 시 자동 처리)
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
    # 실제 DB에서는 VARCHAR로 저장되므로 String 사용, Enum은 값 검증용
    status = Column(String(20), nullable=False, default=AttendanceStatus.ABSENT.value)
    note = Column(String)  # 비고
    
    # 시간 정보
    check_in_time = Column(DateTime(timezone=True))  # 등교 시간
    check_out_time = Column(DateTime(timezone=True))  # 하교 시간
    
    # QR 코드 기반 출석 시스템 필드 (명세서 F-03, F-04)
    room_id = Column(String, index=True)  # 정독실/야자 공간 ID (R01, R02 등)
    scanned_token = Column(Text)  # 스캔 시 사용된 동적 토큰 (Audit용)
    geo_data = Column(JSON)  # 스캔 시 수집된 GPS 및 Wi-Fi 원본 데이터
    device_id = Column(String, index=True)  # 스캔 시 사용된 기기 ID
    is_fraud_detected = Column(Boolean, default=False)  # 부정행위 의심 기록 여부
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LocationSetting(Base):
    """정독실 위치 설정 (명세서 3.2)"""
    __tablename__ = "location_settings"
    
    room_id = Column(String, primary_key=True, index=True)  # 정독실 고유 ID (R01, R02 등)
    latitude = Column(DECIMAL(10, 8), nullable=False)  # Geo-Fence 중심 위도
    longitude = Column(DECIMAL(11, 8), nullable=False)  # Geo-Fence 중심 경도
    radius_m = Column(Integer, nullable=False)  # 허용 반경 (미터, 예: 20m)
    allowed_wifi_bssid = Column(JSON)  # 허용된 Wi-Fi AP의 BSSID 목록 (Array of String)
    
    # 출석 가능 시간 설정
    attendance_start_time = Column(String)  # 출석 가능 시작 시간 (예: "07:50")
    attendance_end_time = Column(String)  # 출석 가능 종료 시간 (예: "08:10")
    late_threshold_time = Column(String)  # 지각 기준 시간 (예: "08:00")
    # 야자 종료 시간 설정 (야자 출석용)
    checkout_time = Column(String)  # 야자 종료 시간 (예: "22:00")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
