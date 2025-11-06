# 출석 관련 스키마
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.attendance import AttendanceStatus
from decimal import Decimal

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
    room_id: Optional[str] = None
    scanned_token: Optional[str] = None
    geo_data: Optional[Dict[str, Any]] = None
    device_id: Optional[str] = None
    is_fraud_detected: Optional[bool] = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# QR 코드 기반 출석 시스템 스키마 (명세서 F-02)
class QRScanRequest(BaseModel):
    """학생 앱에서 QR 코드 스캔 후 전송하는 요청"""
    dynamic_token: str  # QR 코드에 포함된 동적 토큰
    student_id: int  # 학생 ID
    timestamp: datetime  # 스캔 시점
    location_data: Dict[str, Any]  # GPS 좌표 및 Wi-Fi BSSID 목록
    device_id: str  # 스마트폰 고유 ID 또는 앱 설치 ID


class QRScanResponse(BaseModel):
    """출석 처리 결과 응답"""
    success: bool
    status: Optional[AttendanceStatus] = None
    message: str
    attendance_id: Optional[int] = None
    fraud_detected: bool = False
    failure_reason: Optional[str] = None


class QRCodeTokenResponse(BaseModel):
    """동적 QR 코드 토큰 응답"""
    token: str
    expires_at: datetime
    room_id: str


class QRCodeImageResponse(BaseModel):
    """QR 코드 이미지 (Base64) 응답"""
    qr_code_image: str  # Base64 인코딩된 이미지
    token: str
    expires_at: datetime
    room_id: str


# 위치 설정 스키마 (명세서 3.2)
class LocationSettingBase(BaseModel):
    room_id: str
    latitude: Decimal
    longitude: Decimal
    radius_m: int
    allowed_wifi_bssid: Optional[List[str]] = None
    attendance_start_time: Optional[str] = None  # "07:50"
    attendance_end_time: Optional[str] = None  # "08:10"
    late_threshold_time: Optional[str] = None  # "08:00"
    checkout_time: Optional[str] = None  # 야자 종료 시간 (예: "22:00")


class LocationSettingCreate(LocationSettingBase):
    pass


class LocationSettingUpdate(BaseModel):
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    radius_m: Optional[int] = None
    allowed_wifi_bssid: Optional[List[str]] = None
    attendance_start_time: Optional[str] = None
    attendance_end_time: Optional[str] = None
    late_threshold_time: Optional[str] = None
    checkout_time: Optional[str] = None  # 야자 종료 시간


class LocationSettingResponse(LocationSettingBase):
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# 관리자 모니터링 스키마 (명세서 F-05)
class FraudRecordResponse(BaseModel):
    """부정행위 의심 기록"""
    attendance_id: int
    student_id: int
    student_name: Optional[str] = None
    room_id: Optional[str] = None
    check_in_time: Optional[datetime] = None
    failure_reason: str
    geo_data: Optional[Dict[str, Any]] = None
    device_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AttendanceMonitoringResponse(BaseModel):
    """실시간 출석 현황"""
    total_students: int
    present_count: int
    late_count: int
    absent_count: int
    fraud_suspected_count: int
    recent_attendance: List[AttendanceResponse]


# 야자 출석 조퇴 관련 스키마
class EarlyLeaveRequest(BaseModel):
    """조퇴 요청"""
    attendance_id: int
    reason: Optional[str] = None  # 조퇴 사유


class EarlyLeaveRequestResponse(BaseModel):
    """조퇴 요청 응답"""
    success: bool
    message: str
    attendance_id: int
    status: AttendanceStatus


class ApproveCheckoutRequest(BaseModel):
    """조퇴 승인 요청"""
    attendance_id: int
    approve: bool = True  # True: 승인, False: 거부


class ApproveCheckoutResponse(BaseModel):
    """조퇴 승인 응답"""
    success: bool
    message: str
    attendance: AttendanceResponse
