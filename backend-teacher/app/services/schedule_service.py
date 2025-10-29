# 시간표 서비스
from sqlalchemy.orm import Session
from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate

class ScheduleService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_teacher_schedule(self, teacher_id: int, day_of_week: str = None):
        query = self.db.query(Schedule).filter(Schedule.teacher_id == teacher_id)
        
        if day_of_week:
            query = query.filter(Schedule.day_of_week == day_of_week)
        
        return query.all()
    
    def create_schedule(self, schedule_data: ScheduleCreate, teacher_id: int):
        schedule = Schedule(**schedule_data.dict(), teacher_id=teacher_id)
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule
    
    def update_schedule(self, schedule_id: int, schedule_update: ScheduleUpdate):
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule:
            return None
        
        for field, value in schedule_update.dict(exclude_unset=True).items():
            setattr(schedule, field, value)
        
        self.db.commit()
        self.db.refresh(schedule)
        return schedule
