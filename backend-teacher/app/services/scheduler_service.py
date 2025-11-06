# 스케줄러 서비스 (야자 출석 자동 처리)
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import SessionLocal
from app.services.batch_service import BatchService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class SchedulerService:
    """야자 출석 자동 처리 스케줄러"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self._setup_jobs()
    
    def _setup_jobs(self):
        """
        스케줄 작업 설정
        - 매일 야자 종료 시간(22:00) 직후 자동 퇴실 처리
        - 매일 출석 마감 시간(19:10) 직후 자동 결석 처리
        """
        # 야자 종료 시간 직후 자동 퇴실 처리 (매일 22:05)
        self.scheduler.add_job(
            func=self._process_checkout_job,
            trigger=CronTrigger(hour=22, minute=5),
            id='night_study_auto_checkout',
            name='야자 자동 퇴실 처리',
            replace_existing=True
        )
        
        # 출석 마감 시간 직후 자동 결석 처리 (매일 19:15)
        self.scheduler.add_job(
            func=self._process_absent_job,
            trigger=CronTrigger(hour=19, minute=15),
            id='night_study_auto_absent',
            name='야자 자동 결석 처리',
            replace_existing=True
        )
        
        logger.info("야자 출석 스케줄러 작업 등록 완료")
    
    def _process_checkout_job(self):
        """야자 자동 퇴실 처리 작업"""
        try:
            db = SessionLocal()
            try:
                batch_service = BatchService(db)
                results = batch_service.process_night_study_checkout()
                logger.info(f"야자 자동 퇴실 처리 완료: {results}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"야자 자동 퇴실 처리 중 오류 발생: {str(e)}")
    
    def _process_absent_job(self):
        """야자 자동 결석 처리 작업"""
        try:
            db = SessionLocal()
            try:
                batch_service = BatchService(db)
                results = batch_service.process_night_study_absent()
                logger.info(f"야자 자동 결석 처리 완료: {results}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"야자 자동 결석 처리 중 오류 발생: {str(e)}")
    
    def start(self):
        """스케줄러 시작"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("야자 출석 스케줄러 시작됨")
        else:
            logger.warning("스케줄러가 이미 실행 중입니다")
    
    def shutdown(self):
        """스케줄러 종료"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("야자 출석 스케줄러 종료됨")
    
    def add_custom_checkout_job(self, room_id: str, hour: int, minute: int):
        """
        특정 room_id에 대한 커스텀 자동 퇴실 작업 추가
        
        Args:
            room_id: 야자 장소 ID
            hour: 종료 시간 (시)
            minute: 종료 시간 (분)
        """
        job_id = f'night_study_checkout_{room_id}'
        
        # 기존 작업이 있으면 제거
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
        
        # 새 작업 추가
        self.scheduler.add_job(
            func=lambda: self._process_checkout_job_for_room(room_id),
            trigger=CronTrigger(hour=hour, minute=minute + 5),  # 종료 시간 5분 후
            id=job_id,
            name=f'야자 자동 퇴실 처리 - {room_id}',
            replace_existing=True
        )
        
        logger.info(f"커스텀 자동 퇴실 작업 추가: {room_id} - {hour:02d}:{minute:02d}")
    
    def _process_checkout_job_for_room(self, room_id: str):
        """특정 room_id에 대한 자동 퇴실 처리"""
        try:
            db = SessionLocal()
            try:
                batch_service = BatchService(db)
                results = batch_service.process_night_study_checkout(room_id=room_id)
                logger.info(f"야자 자동 퇴실 처리 완료 ({room_id}): {results}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"야자 자동 퇴실 처리 중 오류 발생 ({room_id}): {str(e)}")


# 전역 스케줄러 인스턴스
scheduler_service = None


def get_scheduler_service() -> SchedulerService:
    """스케줄러 서비스 인스턴스 가져오기 (싱글톤)"""
    global scheduler_service
    if scheduler_service is None:
        scheduler_service = SchedulerService()
    return scheduler_service

