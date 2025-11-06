# 출석 API 라우터
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.schemas.attendance import (
    AttendanceResponse, AttendanceCreate, AttendanceUpdate,
    QRScanRequest, QRScanResponse, QRCodeTokenResponse, QRCodeImageResponse,
    LocationSettingCreate, LocationSettingUpdate, LocationSettingResponse,
    FraudRecordResponse, AttendanceMonitoringResponse,
    EarlyLeaveRequest, EarlyLeaveRequestResponse
)
from app.services.attendance_service import AttendanceService
from app.services.auth_service import AuthService
from app.services.qr_service import QRCodeService
from app.services.attendance_validation_service import AttendanceValidationService
from app.models.attendance import LocationSetting, AttendanceStatus
from app.models.student import Student

router = APIRouter()

# 기존 출석 API
@router.get("/", response_model=list[AttendanceResponse])
async def get_attendance(
    date: str = None,
    student_id: int = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 현황 조회"""
    # 이메일로 User 객체 조회하여 ID 가져오기
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    attendance_service = AttendanceService(db)
    attendance_records = attendance_service.get_attendance_records(
        user.id, date, student_id
    )
    return attendance_records

@router.post("/", response_model=AttendanceResponse)
async def create_attendance(
    attendance_data: AttendanceCreate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 체크"""
    # 이메일로 User 객체 조회하여 ID 가져오기
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    attendance_service = AttendanceService(db)
    attendance_record = attendance_service.create_attendance_record(
        attendance_data, user.id
    )
    return attendance_record

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """출석 정보 수정"""
    attendance_service = AttendanceService(db)
    updated_attendance = attendance_service.update_attendance_record(
        attendance_id, attendance_update
    )
    if not updated_attendance:
        raise HTTPException(status_code=404, detail="출석 기록을 찾을 수 없습니다")
    return updated_attendance


# QR 코드 기반 출석 시스템 API (명세서 F-01, F-02, F-03, F-04, F-05)

@router.get("/qr/token/{room_id}", response_model=QRCodeTokenResponse)
async def get_qr_token(
    room_id: str,
    expires_in: int = Query(default=1, description="토큰 유효 기간 (분)", ge=1, le=60),
    db: Session = Depends(get_db)
):
    """
    동적 QR 코드 토큰 생성 (명세서 F-01)
    태블릿/모니터에서 1분마다 호출하여 QR 코드 갱신
    """
    qr_service = QRCodeService()
    token_data = qr_service.generate_dynamic_token(room_id, expires_in)
    
    return QRCodeTokenResponse(
        token=token_data["token"],
        expires_at=token_data["expires_at"],
        room_id=token_data["room_id"]
    )


@router.get("/qr/image/{room_id}", response_model=QRCodeImageResponse)
async def get_qr_code_image(
    room_id: str,
    expires_in: int = Query(default=1, description="토큰 유효 기간 (분)", ge=1, le=60),
    db: Session = Depends(get_db)
):
    """
    동적 QR 코드 이미지 생성 (명세서 F-01)
    태블릿/모니터에서 1분마다 호출하여 QR 코드 이미지 갱신
    """
    qr_service = QRCodeService()
    qr_data = qr_service.generate_qr_code_with_image(room_id, expires_in)
    
    return QRCodeImageResponse(
        qr_code_image=qr_data["qr_code_image"],
        token=qr_data["token"],
        expires_at=qr_data["expires_at"],
        room_id=qr_data["room_id"]
    )


@router.post("/qr/scan", response_model=QRScanResponse)
async def scan_qr_code(
    scan_request: QRScanRequest,
    db: Session = Depends(get_db)
):
    """
    QR 코드 스캔 및 출석 요청 (명세서 F-02, F-03, F-04)
    학생 앱에서 QR 코드를 스캔한 후 호출
    """
    qr_service = QRCodeService()
    validation_service = AttendanceValidationService(db)
    attendance_service = AttendanceService(db)
    
    # 1. 토큰 검증
    token_payload = qr_service.verify_token(scan_request.dynamic_token)
    room_id = token_payload.get("room_id") if token_payload else None
    
    # 2. 전체 검증
    is_valid, failure_reason, status_str = validation_service.validate_all(
        token_payload=token_payload,
        location_data=scan_request.location_data,
        device_id=scan_request.device_id,
        student_id=scan_request.student_id,
        scan_time=scan_request.timestamp,
        room_id=room_id or ""
    )
    
    # 3. 학생 정보 확인
    student = db.query(Student).filter(Student.id == scan_request.student_id).first()
    if not student:
        return QRScanResponse(
            success=False,
            message="학생 정보를 찾을 수 없습니다",
            fraud_detected=True,
            failure_reason="학생 정보 없음"
        )
    
    # 4. 담임교사 ID 확인 (학생의 담임교사)
    teacher_id = student.homeroom_teacher_id
    if not teacher_id:
        return QRScanResponse(
            success=False,
            message="담임교사 정보를 찾을 수 없습니다",
            fraud_detected=True,
            failure_reason="담임교사 정보 없음"
        )
    
    # 5. 검증 실패 시 부정행위 기록
    if not is_valid:
        attendance_status = AttendanceStatus.ABSENT
        fraud_detected = True
        
        # 부정행위 기록 생성
        attendance_record = attendance_service.create_qr_attendance_record(
            student_id=scan_request.student_id,
            teacher_id=teacher_id,
            room_id=room_id or "UNKNOWN",
            scanned_token=scan_request.dynamic_token,
            geo_data=scan_request.location_data,
            device_id=scan_request.device_id,
            check_in_time=scan_request.timestamp,
            status=attendance_status,
            is_fraud=True
        )
        
        return QRScanResponse(
            success=False,
            status=attendance_status,
            message=f"출석 실패: {failure_reason}",
            attendance_id=attendance_record.id,
            fraud_detected=True,
            failure_reason=failure_reason
        )
    
    # 6. 검증 성공 시 출석 기록
    attendance_status = AttendanceStatus.PRESENT if status_str == "present" else AttendanceStatus.LATE
    
    attendance_record = attendance_service.create_qr_attendance_record(
        student_id=scan_request.student_id,
        teacher_id=teacher_id,
        room_id=room_id,
        scanned_token=scan_request.dynamic_token,
        geo_data=scan_request.location_data,
        device_id=scan_request.device_id,
        check_in_time=scan_request.timestamp,
        status=attendance_status,
        is_fraud=False
    )
    
    status_message = "출석 완료" if attendance_status == AttendanceStatus.PRESENT else "지각 처리"
    
    return QRScanResponse(
        success=True,
        status=attendance_status,
        message=status_message,
        attendance_id=attendance_record.id,
        fraud_detected=False
    )


# 위치 설정 API
@router.post("/location-settings", response_model=LocationSettingResponse)
async def create_location_setting(
    location_data: LocationSettingCreate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """정독실 위치 설정 생성"""
    location_setting = LocationSetting(**location_data.dict())
    db.add(location_setting)
    db.commit()
    db.refresh(location_setting)
    return location_setting


@router.get("/location-settings", response_model=list[LocationSettingResponse])
async def get_location_settings(
    db: Session = Depends(get_db)
):
    """정독실 위치 설정 목록 조회"""
    return db.query(LocationSetting).all()


@router.get("/location-settings/{room_id}", response_model=LocationSettingResponse)
async def get_location_setting(
    room_id: str,
    db: Session = Depends(get_db)
):
    """정독실 위치 설정 조회"""
    location_setting = db.query(LocationSetting).filter(
        LocationSetting.room_id == room_id
    ).first()
    if not location_setting:
        raise HTTPException(status_code=404, detail="위치 설정을 찾을 수 없습니다")
    return location_setting


@router.put("/location-settings/{room_id}", response_model=LocationSettingResponse)
async def update_location_setting(
    room_id: str,
    location_update: LocationSettingUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """정독실 위치 설정 수정"""
    location_setting = db.query(LocationSetting).filter(
        LocationSetting.room_id == room_id
    ).first()
    if not location_setting:
        raise HTTPException(status_code=404, detail="위치 설정을 찾을 수 없습니다")
    
    for field, value in location_update.dict(exclude_unset=True).items():
        setattr(location_setting, field, value)
    
    db.commit()
    db.refresh(location_setting)
    return location_setting


# 관리자 모니터링 API (명세서 F-05)
@router.get("/monitoring", response_model=AttendanceMonitoringResponse)
async def get_attendance_monitoring(
    date: Optional[str] = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """실시간 출석 현황 모니터링"""
    # 이메일로 User 객체 조회하여 ID 가져오기
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    attendance_service = AttendanceService(db)
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else None
    
    stats = attendance_service.get_monitoring_stats(
        teacher_id=user.id,
        target_date=target_date
    )
    
    return AttendanceMonitoringResponse(
        total_students=stats["total_students"],
        present_count=stats["present_count"],
        late_count=stats["late_count"],
        absent_count=stats["absent_count"],
        fraud_suspected_count=stats["fraud_suspected_count"],
        recent_attendance=stats["recent_attendance"]
    )


@router.get("/fraud-records", response_model=list[FraudRecordResponse])
async def get_fraud_records(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """부정행위 의심 기록 조회"""
    # 이메일로 User 객체 조회하여 ID 가져오기
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    attendance_service = AttendanceService(db)
    fraud_records = attendance_service.get_fraud_records(
        teacher_id=user.id,
        limit=limit
    )
    
    # 학생 이름 포함하여 응답 생성
    result = []
    for record in fraud_records:
        student = db.query(Student).filter(Student.id == record.student_id).first()
        result.append(FraudRecordResponse(
            attendance_id=record.id,
            student_id=record.student_id,
            student_name=student.name if student else None,
            room_id=record.room_id,
            check_in_time=record.check_in_time,
            failure_reason="검증 실패" if record.is_fraud_detected else "알 수 없음",
            geo_data=record.geo_data,
            device_id=record.device_id,
            created_at=record.created_at
        ))
    
    return result


@router.post("/fraud-records/{attendance_id}/approve", response_model=AttendanceResponse)
async def approve_fraud_record(
    attendance_id: int,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """부정행위 의심 기록 수동 승인"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="출석 기록을 찾을 수 없습니다")
    
    # 부정행위 플래그 제거 및 상태 업데이트
    attendance.is_fraud_detected = False
    if attendance.status == AttendanceStatus.ABSENT.value:
        attendance.status = AttendanceStatus.PRESENT.value
    
    db.commit()
    db.refresh(attendance)
    return attendance


# 야자 출석 조퇴 관련 API
@router.post("/request_checkout", response_model=EarlyLeaveRequestResponse)
async def request_checkout(
    request_data: EarlyLeaveRequest,
    db: Session = Depends(get_db)
):
    """
    조퇴 요청 API (야자 출석용)
    학생이 조퇴를 요청하면 해당 attendance_id의 status를 '조퇴 요청'으로 변경
    """
    attendance_service = AttendanceService(db)
    
    attendance = attendance_service.request_early_leave(
        attendance_id=request_data.attendance_id,
        reason=request_data.reason
    )
    
    if not attendance:
        raise HTTPException(status_code=404, detail="출석 기록을 찾을 수 없습니다")
    
    return EarlyLeaveRequestResponse(
        success=True,
        message="조퇴 요청이 접수되었습니다. 관리자 승인을 기다려주세요.",
        attendance_id=attendance.id,
        status=attendance.status
    )


