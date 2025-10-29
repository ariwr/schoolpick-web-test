# 기존 데이터베이스 테이블에 맞는 모델 (교사용)
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

# 기존 users 테이블 활용
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    birth_date = Column(DateTime(timezone=True))
    user_type = Column(String(20), nullable=False)  # teacher, student, parent
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

# 기존 teachers 테이블 활용
class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    teacher_number = Column(String(20), unique=True, nullable=True)
    school_id = Column(Integer)
    school_name = Column(String(200))  # 학교 이름 추가
    position = Column(String(50), nullable=False, default="교과")
    hire_date = Column(DateTime(timezone=True))
    is_homeroom_teacher = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    certification_number = Column(String(50))
    
    # 관계 설정
    user = relationship("User", backref="teacher")

# 기존 students 테이블 활용
class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    student_code = Column(String, unique=True)
    name = Column(String)
    grade = Column(Integer)
    class_number = Column(Integer)
    student_number = Column(Integer)
    phone = Column(String)
    parent_phone = Column(String)
    created_at = Column(DateTime(timezone=True))
    
    # 관계 설정
    user = relationship("User")

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

# 출석 관리를 위한 새 테이블 (기존에 없을 수 있음)
class Attendance(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    date = Column(DateTime(timezone=True))
    status = Column(String)  # present, absent, late, early_leave
    check_in_time = Column(DateTime(timezone=True))
    check_out_time = Column(DateTime(timezone=True))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 설정
    student = relationship("Student")
    teacher = relationship("Teacher")
