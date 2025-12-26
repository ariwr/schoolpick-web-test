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
    department_id = Column(Integer, ForeignKey("departments.id"))
    max_hours_per_week = Column(Integer, default=15)
    
    # 관계 설정
    user = relationship("User", backref="teacher")
    department = relationship("Department")

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
    
    # New Fields
    department_id = Column(Integer, ForeignKey("departments.id"))
    required_hours = Column(Integer, default=2) # 주당 시수
    target_grade = Column(Integer) # 대상 학년
    category = Column(String) # 과목 구분 (국어, 수학, 창체 등)
    
    created_at = Column(DateTime(timezone=True))
    
    department = relationship("Department")

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

# --- New Models for Advanced Timetable ---

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # 국어과, 수학교과
    description = Column(String(200))
    created_at = Column(DateTime(timezone=True))

class Facility(Base):
    __tablename__ = "facilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # 음악실, 과학실
    type = Column(String(50)) # SPECIAL, NORMAL
    capacity = Column(Integer)
    description = Column(String(200))
    created_at = Column(DateTime(timezone=True))

# Update Teacher/Subject (We can't easily change existing class defs in-place without re-writing file, 
# but for this tool I must replace the whole class or append? 
# I will use separate attributes augmentation if I can't rewrite.
# Actually I will rewrite the classes in the file using ReplaceFileContent on a large range or standard Replace.)

# Re-defining classes with new columns for the purpose of the tool's output.
# IMPORTANT: In a real migration, we need ALEMBIC. Here we assume we define the models 
# and the user/alembic will handle the DB Schema change.

# To properly add columns to 'Teacher' and 'Subject', I need to modify their class definitions above.
# So I will target the specific class blocks.



