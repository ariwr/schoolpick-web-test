# 출석 서비스
from sqlalchemy.orm import Session
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_attendance_records(self, teacher_id: int, date: str = None, student_id: int = None):
        query = self.db.query(Attendance).filter(Attendance.teacher_id == teacher_id)
        
        if date:
            query = query.filter(Attendance.date == date)
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
