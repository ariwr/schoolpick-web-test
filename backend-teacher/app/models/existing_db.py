# 기존 데이터베이스 테이블에 맞는 모델 (교사용)
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

# 기존 users 테이블 활용
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # 비밀번호 해시값 저장
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    birth_date = Column(Date)  # DB 스키마에 맞게 Date 타입으로 변경
    user_type = Column(String(20), nullable=False)  # teacher, student, parent
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    
    # 관계 설정
    # Teacher 모델과의 관계 (backref를 통해 teacher 속성 사용 가능)
    # 주의: Student 모델은 학생용 앱에서 사용되므로 여기서는 관계를 정의하지 않음

# 기존 teachers 테이블 활용 (교사 전용 정보)
class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    teacher_number = Column(String(20), nullable=False)  # DB 스키마에 맞게 NOT NULL로 변경, unique 제거
    school_id = Column(Integer)
    # school_name = Column(String(200))  # 데이터베이스에 컬럼이 없으므로 주석 처리
    position = Column(String(50), nullable=False, default="교과")
    hire_date = Column(Date)  # DB 스키마에 맞게 Date 타입으로 변경
    is_homeroom_teacher = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    certification_number = Column(String(50))
    
    # 관계 설정
    user = relationship("User", backref="teacher")

# 주의: Student 모델은 app.models.student에 정의되어 있습니다.
# 기존 students 테이블은 app.models.student.Student를 사용합니다.

# 기존 school_classes 테이블 활용
class SchoolClass(Base):
    __tablename__ = "school_classes"
    
    id = Column(Integer, primary_key=True, index=True)
    grade = Column(Integer)
    class_number = Column(Integer)
    class_name = Column(String)
    homeroom_teacher_id = Column(Integer, ForeignKey("teachers.id"))
    created_at = Column(DateTime(timezone=True))
    
    # 관계 설정
    homeroom_teacher = relationship("Teacher")

# 기존 subjects 테이블 활용
class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String)
    created_at = Column(DateTime(timezone=True))

# 기존 teacher_timetables 테이블 활용
class TeacherTimetable(Base):
    __tablename__ = "teacher_timetables"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    grade = Column(Integer)
    class_number = Column(Integer)
    day_of_week = Column(String)  # monday, tuesday, etc.
    period = Column(Integer)
    classroom = Column(String)
    semester = Column(Integer, default=1)
    year = Column(Integer)
    created_at = Column(DateTime(timezone=True))
    
    # 관계 설정
    teacher = relationship("Teacher")


