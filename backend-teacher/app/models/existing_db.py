# 기존 데이터베이스 테이블에 맞는 모델 (교사용)
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import ARRAY
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
    teachers = relationship("Teacher", back_populates="user", foreign_keys="[Teacher.user_id]")
    departments = relationship("Department", back_populates="user")
    subjects = relationship("Subject", back_populates="user")
    facilities = relationship("Facility", back_populates="user")
    lecture_groups = relationship("LectureGroup", back_populates="user")
    school_config = relationship("SchoolConfiguration", back_populates="user", uselist=False)
    teacher_time_offs = relationship("TeacherTimeOff", back_populates="user")
    block_definitions = relationship("BlockGroupDefinition", back_populates="user")

# 기존 teachers 테이블 활용 (교사 전용 정보)
class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    teacher_number = Column(String(20), nullable=False)  # DB 스키마에 맞게 NOT NULL로 변경, unique 제거
    school_id = Column(Integer)
    # school_name = Column(String(200))  # 데이터베이스에 컬럼이 없으므로 주석 처리
    
    # New Fields for Wizard/Ghost Teachers
    name = Column(String(100)) # 교사 이름 (User 연결 없이도 가능)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE")) # 생성자(스케줄러) ID
    
    position = Column(String(50), nullable=False, default="교과")
    hire_date = Column(Date)  # DB 스키마에 맞게 Date 타입으로 변경
    is_homeroom_teacher = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    certification_number = Column(String(50))
    department_id = Column(Integer, ForeignKey("departments.id"))
    max_hours_per_week = Column(Integer, default=15)
    
    # 관계 설정
    # 관계 설정
    user = relationship("User", back_populates="teachers", foreign_keys=[user_id])
    owner = relationship("User", foreign_keys=[owner_id]) # Optional access to owner
    department = relationship("Department", back_populates="teachers")
    constraints = relationship("TeacherTimeOff", back_populates="teacher")

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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    
    # New Fields
    department_id = Column(Integer, ForeignKey("departments.id"))
    required_hours = Column(Integer, default=2) # 주당 시수
    target_grade = Column(Integer) # 대상 학년
    category = Column(String) # 과목 구분 (국어, 수학, 창체 등)
    required_facility_id = Column(Integer, ForeignKey("facilities.id")) # 특별실 필수 여부
    
    created_at = Column(DateTime(timezone=True))
    
    department = relationship("Department", back_populates="subjects")
    user = relationship("User", back_populates="subjects")
    required_facility = relationship("Facility")

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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True))
    
    user = relationship("User", back_populates="departments")
    teachers = relationship("Teacher", back_populates="department")
    subjects = relationship("Subject", back_populates="department")

class Facility(Base):
    __tablename__ = "facilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # 음악실, 과학실
    type = Column(String(50)) # SPECIAL, NORMAL
    capacity = Column(Integer)
    description = Column(String(200))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="facilities")

# --- Phase 5: Advanced Timetable Models ---

class LectureGroup(Base):
    """
    수업 그룹 (Intent).
    예: "3학년 국어 4학점" (2+2 분할)
    """
    __tablename__ = "lecture_groups"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedule_metadata.id", ondelete="CASCADE"))
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    grade = Column(Integer, nullable=False)
    class_num = Column(Integer)  # Nullable for elective classes
    total_credits = Column(Integer, nullable=False)
    slicing_option = Column(String(20)) # "2+2", "3+1"
    neis_class_code = Column(String(50))
    student_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    # Relationships
    subject = relationship("Subject")
    teacher = relationship("Teacher")
    user = relationship("User", back_populates="lecture_groups")

class ScheduleMetadata(Base):
    """
    시간표 메타데이터 (버전 관리).
    여러 버전의 시간표를 관리하고 활성화된 버전을 추적합니다.
    """
    __tablename__ = "schedule_metadata"

    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String(100), nullable=False)  # e.g., "2024-1학기", "초안 v1"
    description = Column(Text)
    is_active = Column(Boolean, default=False)  # 현재 활성화된 시간표인지
    is_published = Column(Boolean, default=False)  # 게시 여부
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LectureBlock(Base):
    """
    수업 블록 (Implementation).
    실제 시간표 칸에 배정된 조각.
    """
    __tablename__ = "lecture_blocks"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("lecture_groups.id", ondelete="CASCADE"))
    day = Column(String(10), nullable=False)
    period = Column(Integer, nullable=False)
    room_id = Column(Integer, ForeignKey("facilities.id")) # Nullable
    is_fixed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    group = relationship("LectureGroup")
    room = relationship("Facility")

    __table_args__ = (
        Index('ix_lecture_block_unique_room_slot', 'day', 'period', 'room_id', unique=True, postgresql_where=(room_id != None)),
    )

class TeacherConstraint(Base):
    """
    교사 제약 조건.
    """
    __tablename__ = "teacher_constraints"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedule_metadata.id", ondelete="CASCADE"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day = Column(String(10), nullable=False)
    period = Column(Integer, nullable=False)
    constraint_type = Column(String(20), default='TIME_OFF') # TIME_OFF, MAX_DAILY
    reason = Column(String(255))
    is_hard_constraint = Column(Boolean, default=True)

    # Relationships
    teacher = relationship("Teacher")

class SchoolConfiguration(Base):
    """Wizard Step 1: School basic information"""
    __tablename__ = "school_configurations"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    school_name = Column(String(200), nullable=False)
    total_grades = Column(Integer, default=3)
    periods_per_day = Column(Integer, default=7)
    days_per_week = Column(Integer, default=5)
    lunch_period = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="school_config")

class TeacherTimeOff(Base):
    """Wizard Step 4: Teacher time-off constraints"""
    __tablename__ = "teacher_time_offs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"))
    day = Column(String(10), nullable=False)
    period = Column(Integer, nullable=False)
    reason = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="teacher_time_offs")
    teacher = relationship("Teacher", back_populates="constraints")

    __table_args__ = (
        UniqueConstraint('teacher_id', 'day', 'period', name='uq_teacher_time_off_slot'),
    )

class BlockGroupDefinition(Base):
    """Wizard Step 4: Block group definitions"""
    __tablename__ = "block_group_definitions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    days = Column(ARRAY(String))
    periods = Column(ARRAY(Integer))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="block_definitions")

class ScheduleConstraint(Base):
    """
    범용 제약 조건 테이블 (Solver용).
    예: 선생님 하루 최대 수업 시수, 연강 금지 등.
    """
    __tablename__ = "schedule_constraints"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    schedule_id = Column(Integer, ForeignKey("schedule_metadata.id", ondelete="CASCADE"), nullable=True) # 특정 스케줄 전용 or 전역
    
    name = Column(String(100)) # 제약 조건 이름 (예: "Max Daily Hours")
    constraint_type = Column(String(50), nullable=False) # SYSTEM, USER_DEFINED
    target_type = Column(String(50)) # TEACHER, GRADE, SUBJECT, GLOBAL
    target_id = Column(Integer, nullable=True) # 대상 ID (Optional)
    
    configuration = Column(Text) # JSON String for parameters (e.g. {"max_hours": 4})
    weight = Column(Integer, default=100) # 가중치 (Hard=1000, Soft=10-100)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User") # Link to user





