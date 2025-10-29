# 학생 서비스
from sqlalchemy.orm import Session
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate

class StudentService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_students_by_teacher(self, teacher_id: int, grade: int = None, class_number: int = None):
        query = self.db.query(Student).filter(Student.homeroom_teacher_id == teacher_id)
        
        if grade:
            query = query.filter(Student.grade == grade)
        if class_number:
            query = query.filter(Student.class_number == class_number)
        
        return query.all()
    
    def get_student_by_id(self, student_id: int):
        return self.db.query(Student).filter(Student.id == student_id).first()
    
    def update_student(self, student_id: int, student_update: StudentUpdate):
        student = self.db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None
        
        for field, value in student_update.dict(exclude_unset=True).items():
            setattr(student, field, value)
        
        self.db.commit()
        self.db.refresh(student)
        return student
