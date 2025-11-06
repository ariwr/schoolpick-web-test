# 출석 서비스
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, String
from datetime import datetime, date as date_type
from typing import List, Optional, Dict, Any
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_attendance_records(self, teacher_id: int, date: str = None, student_id: int = None):
        query = self.db.query(Attendance).filter(Attendance.teacher_id == teacher_id)
        
        if date:
            # date는 문자열 형식 (YYYY-MM-DD)이므로 날짜 부분만 비교
            from datetime import datetime
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
                query = query.filter(func.date(Attendance.date) == date_obj)
            except ValueError:
                # 날짜 파싱 실패 시 문자열로 직접 비교
                query = query.filter(Attendance.date.cast(String).like(f"{date}%"))
        if student_id:
            query = query.filter(Attendance.student_id == student_id)
        
        return query.all()
    
    def create_attendance_record(self, attendance_data: AttendanceCreate, teacher_id: int):
        attendance = Attendance(**attendance_data.dict(), teacher_id=teacher_id)
        self.db.add(attendance)
        self.db.commit()
        self.db.refresh(attendance)
        return attendance
    
    def update_attendance_record(self, attendance_id: int, attendance_update: AttendanceUpdate):
        attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not attendance:
            return None
        
        for field, value in attendance_update.dict(exclude_unset=True).items():
            setattr(attendance, field, value)
        
        self.db.commit()
        self.db.refresh(attendance)
        return attendance
    
    def create_qr_attendance_record(
        self,
        student_id: int,
        teacher_id: int,
        room_id: str,
        scanned_token: str,
        geo_data: Dict[str, Any],
        device_id: str,
        check_in_time: datetime,
        status: AttendanceStatus,
        is_fraud: bool = False
    ) -> Attendance:
        """
        QR 코드 기반 출석 기록 생성 (명세서 F-04)
        """
        # 같은 날짜에 이미 출석 기록이 있는지 확인
        today = check_in_time.date()
        existing = self.db.query(Attendance).filter(
            and_(
                Attendance.student_id == student_id,
                func.date(Attendance.date) == today,
                Attendance.room_id == room_id
            )
        ).first()
        
        if existing:
            # 기존 기록 업데이트
            existing.status = status.value  # Enum을 String으로 변환
            existing.check_in_time = check_in_time
            existing.scanned_token = scanned_token
            existing.geo_data = geo_data
            existing.device_id = device_id
            existing.is_fraud_detected = is_fraud
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # 새 기록 생성
            attendance = Attendance(
                student_id=student_id,
                teacher_id=teacher_id,
                date=check_in_time,
                status=status.value,  # Enum을 String으로 변환
                check_in_time=check_in_time,
                room_id=room_id,
                scanned_token=scanned_token,
                geo_data=geo_data,
                device_id=device_id,
                is_fraud_detected=is_fraud
            )
            self.db.add(attendance)
            self.db.commit()
            self.db.refresh(attendance)
            return attendance
    
    def get_fraud_records(self, teacher_id: Optional[int] = None, limit: int = 50) -> List[Attendance]:
        """
        부정행위 의심 기록 조회 (명세서 F-05)
        """
        query = self.db.query(Attendance).filter(Attendance.is_fraud_detected == True)
        
        if teacher_id:
            query = query.filter(Attendance.teacher_id == teacher_id)
        
        return query.order_by(Attendance.created_at.desc()).limit(limit).all()
    
    def get_monitoring_stats(self, teacher_id: Optional[int] = None, target_date: Optional[date_type] = None) -> Dict[str, Any]:
        """
        실시간 출석 현황 통계 (명세서 F-05)
        """
        query = self.db.query(Attendance)
        
        if teacher_id:
            query = query.filter(Attendance.teacher_id == teacher_id)
        
        if target_date:
            query = query.filter(func.date(Attendance.date) == target_date)
        
        total = query.count()
        present_count = query.filter(Attendance.status == AttendanceStatus.PRESENT.value).count()
        late_count = query.filter(Attendance.status == AttendanceStatus.LATE.value).count()
        absent_count = query.filter(Attendance.status == AttendanceStatus.ABSENT.value).count()
        fraud_count = query.filter(Attendance.is_fraud_detected == True).count()
        
        # 최근 출석 기록
        recent = query.order_by(Attendance.check_in_time.desc()).limit(20).all()
        
        return {
            "total_students": total,
            "present_count": present_count,
            "late_count": late_count,
            "absent_count": absent_count,
            "fraud_suspected_count": fraud_count,
            "recent_attendance": recent
        }
    
    def request_early_leave(self, attendance_id: int, reason: Optional[str] = None) -> Optional[Attendance]:
        """
        조퇴 요청 (야자 출석용)
        attendance_id에 해당하는 출석 기록의 status를 '조퇴 요청'으로 변경
        """
        attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not attendance:
            return None
        
        # 이미 조퇴 요청이거나 조퇴 완료된 경우는 처리하지 않음
        if attendance.status == AttendanceStatus.EARLY_LEAVE_REQUEST:
            return attendance
        if attendance.status == AttendanceStatus.EARLY_LEAVE.value:
            return attendance
        if attendance.status == AttendanceStatus.COMPLETED.value:
            return attendance
        
        # 조퇴 요청 상태로 변경
        attendance.status = AttendanceStatus.EARLY_LEAVE_REQUEST.value
        if reason:
            attendance.note = reason  # 조퇴 사유를 note에 저장
        
        self.db.commit()
        self.db.refresh(attendance)
        return attendance
    
    def approve_checkout(self, attendance_id: int, approve: bool = True) -> Optional[Attendance]:
        """
        조퇴 승인/거부 (야자 출석용)
        approve=True: 조퇴 승인, check_out_time 기록하고 status를 '조퇴'로 변경
        approve=False: 조퇴 거부, status를 '정상'으로 복구
        """
        attendance = self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not attendance:
            return None
        
        if not approve:
            # 조퇴 거부: 상태를 정상으로 복구
            if attendance.status == AttendanceStatus.EARLY_LEAVE_REQUEST.value:
                attendance.status = AttendanceStatus.PRESENT.value
                self.db.commit()
                self.db.refresh(attendance)
                return attendance
            return attendance
        
        # 조퇴 승인
        if attendance.status == AttendanceStatus.EARLY_LEAVE_REQUEST.value:
            attendance.status = AttendanceStatus.EARLY_LEAVE.value
            attendance.check_out_time = datetime.utcnow()
            self.db.commit()
            self.db.refresh(attendance)
            return attendance
        
        return attendance
    
    def process_auto_checkout(self, room_id: str, checkout_time_str: str) -> Dict[str, int]:
        """
        자동 퇴실 처리 (야자 종료 시간 도달 시)
        status가 '정상'이고 check_out_time이 null인 모든 레코드의
        check_out_time을 현재 시각으로 기록하고 status를 '정상 완료'로 업데이트
        
        Returns:
            처리된 레코드 수를 담은 딕셔너리
        """
        from datetime import time
        
        # checkout_time_str을 time 객체로 파싱 (예: "22:00" -> time(22, 0))
        try:
            hour, minute = map(int, checkout_time_str.split(":"))
            checkout_time = time(hour, minute)
        except:
            return {"processed": 0, "error": "Invalid checkout_time format"}
        
        # 오늘 날짜
        today = datetime.utcnow().date()
        
        # status가 '정상'이고 check_out_time이 null인 레코드 조회
        records = self.db.query(Attendance).filter(
            and_(
                Attendance.room_id == room_id,
                func.date(Attendance.date) == today,
                Attendance.status == AttendanceStatus.PRESENT.value,
                Attendance.check_out_time.is_(None)
            )
        ).all()
        
        processed_count = 0
        checkout_datetime = datetime.utcnow()
        
        for record in records:
            record.check_out_time = checkout_datetime
            record.status = AttendanceStatus.COMPLETED.value
            processed_count += 1
        
        self.db.commit()
        
        return {"processed": processed_count}
    
    def process_auto_absent(self, room_id: str, attendance_end_time_str: str) -> Dict[str, int]:
        """
        자동 결석 처리 (출석 마감 시간 이후)
        해당일 야자 출석 대상이지만 check_in_time이 null인 모든 학생을 '결석'으로 처리
        
        Returns:
            처리된 레코드 수를 담은 딕셔너리
        """
        from datetime import time
        
        # attendance_end_time_str을 time 객체로 파싱 (예: "19:10" -> time(19, 10))
        try:
            hour, minute = map(int, attendance_end_time_str.split(":"))
            end_time = time(hour, minute)
        except:
            return {"processed": 0, "error": "Invalid attendance_end_time format"}
        
        # 오늘 날짜
        today = datetime.utcnow().date()
        
        # 해당 room_id에 대해 오늘 날짜의 출석 기록 중 check_in_time이 null인 레코드 조회
        records = self.db.query(Attendance).filter(
            and_(
                Attendance.room_id == room_id,
                func.date(Attendance.date) == today,
                Attendance.check_in_time.is_(None)
            )
        ).all()
        
        processed_count = 0
        
        for record in records:
            record.status = AttendanceStatus.ABSENT.value
            processed_count += 1
        
        self.db.commit()
        
        return {"processed": processed_count}