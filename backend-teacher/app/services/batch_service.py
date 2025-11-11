# 배치 작업 서비스 (야자 출석 자동 처리)
from sqlalchemy.orm import Session
from datetime import datetime, time as time_type
from typing import Dict, Any
from app.services.attendance_service import AttendanceService
from app.models.attendance import LocationSetting
import logging

logger = logging.getLogger(__name__)


class BatchService:
    """야자 출석 자동 처리 배치 작업 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
        self.attendance_service = AttendanceService(db)
    
    def process_night_study_checkout(self, room_id: str = None) -> Dict[str, Any]:
        """
        야자 자동 퇴실 처리 (야자 종료 시간 도달 시)
        
        Args:
            room_id: 특정 room_id만 처리할 경우, None이면 모든 야자 장소 처리
        
        Returns:
            처리 결과 딕셔너리
        """
        results = {}
        
        if room_id:
            # 특정 room_id만 처리
            location_setting = self.db.query(LocationSetting).filter(
                LocationSetting.room_id == room_id
            ).first()
            
            if location_setting and location_setting.checkout_time:
                result = self.attendance_service.process_auto_checkout(
                    room_id=room_id,
                    checkout_time_str=location_setting.checkout_time
                )
                results[room_id] = result
        else:
            # 모든 야자 장소 처리
            location_settings = self.db.query(LocationSetting).filter(
                LocationSetting.checkout_time.isnot(None)
            ).all()
            
            for location_setting in location_settings:
                if location_setting.checkout_time:
                    result = self.attendance_service.process_auto_checkout(
                        room_id=location_setting.room_id,
                        checkout_time_str=location_setting.checkout_time
                    )
                    results[location_setting.room_id] = result
        
        return results
    
    def process_night_study_absent(self, room_id: str = None) -> Dict[str, Any]:
        """
        야자 자동 결석 처리 (출석 마감 시간 이후)
        
        Args:
            room_id: 특정 room_id만 처리할 경우, None이면 모든 야자 장소 처리
        
        Returns:
            처리 결과 딕셔너리
        """
        results = {}
        
        if room_id:
            # 특정 room_id만 처리
            location_setting = self.db.query(LocationSetting).filter(
                LocationSetting.room_id == room_id
            ).first()
            
            if location_setting and location_setting.attendance_end_time:
                result = self.attendance_service.process_auto_absent(
                    room_id=room_id,
                    attendance_end_time_str=location_setting.attendance_end_time
                )
                results[room_id] = result
        else:
            # 모든 야자 장소 처리
            location_settings = self.db.query(LocationSetting).filter(
                LocationSetting.attendance_end_time.isnot(None)
            ).all()
            
            for location_setting in location_settings:
                if location_setting.attendance_end_time:
                    result = self.attendance_service.process_auto_absent(
                        room_id=location_setting.room_id,
                        attendance_end_time_str=location_setting.attendance_end_time
                    )
                    results[location_setting.room_id] = result
        
        return results
    
    def run_daily_batch(self) -> Dict[str, Any]:
        """
        일일 배치 작업 실행
        - 야자 종료 시간 이후: 자동 퇴실 처리
        - 출석 마감 시간 이후: 자동 결석 처리
        
        Returns:
            전체 처리 결과
        """
        logger.info("야자 출석 일일 배치 작업 시작")
        
        # 자동 퇴실 처리 (야자 종료 시간 이후)
        checkout_results = self.process_night_study_checkout()
        
        # 자동 결석 처리 (출석 마감 시간 이후)
        absent_results = self.process_night_study_absent()
        
        logger.info(f"배치 작업 완료 - 퇴실 처리: {checkout_results}, 결석 처리: {absent_results}")
        
        return {
            "checkout_results": checkout_results,
            "absent_results": absent_results,
            "timestamp": datetime.utcnow().isoformat()
        }




