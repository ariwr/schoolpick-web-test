# 학생 서비스
from sqlalchemy.orm import Session
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate

class StudentService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_students_by_teacher(self, teacher_id: int, grade: int = None, class_number: int = None):
        """
        담임교사별 학생 목록 조회
        실제 DB 구조에 맞게 조회
        주의: students 테이블에 homeroom_teacher_id가 없으므로,
        현재는 모든 학생을 반환하거나 다른 필터링 로직이 필요할 수 있습니다.
        """
        # 실제 데이터베이스 구조: students 테이블에는 담임교사 정보가 직접 저장되지 않음
        # 임시로 모든 학생을 반환 (실제로는 다른 필터링 로직 필요)
        query = self.db.query(Student)
        
        # grade와 class_number로 필터링
        if grade:
            query = query.filter(Student.grade == grade)
        if class_number:
            query = query.filter(Student.class_number == class_number)
        
        # user 관계를 eager loading
        from sqlalchemy.orm import joinedload
        query = query.options(joinedload(Student.user))
        
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
