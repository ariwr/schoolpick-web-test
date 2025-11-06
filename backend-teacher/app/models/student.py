# 학생 모델
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    # 실제 데이터베이스 구조에 맞게 수정
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # users 테이블과 연결
    student_number = Column(String(20), nullable=False)  # 학번 (실제 DB에서는 VARCHAR(20))
    school_id = Column(Integer, nullable=True)
    grade = Column(Integer, nullable=False)  # 학년
    class_number = Column(Integer, nullable=False)  # 반
    attendance_number = Column(Integer, nullable=False)  # 출석번호 (실제 DB 컬럼명)
    
    # 관계 설정 - users 테이블과 연결하여 name 가져오기
    # 문자열로 참조하여 순환 참조 방지
    user = relationship("User", foreign_keys=[user_id], lazy="joined")
    
    # 가상 속성 (프로퍼티) - 모델 호환성을 위해
    @property
    def student_id(self) -> str:
        """학번 반환 (student_number와 동일)"""
        return self.student_number
    
    @property
    def name(self) -> str:
        """이름 반환 (users 테이블에서 가져옴)"""
        if self.user:
            return self.user.name
        return ""
    
    @property
    def homeroom_teacher_id(self) -> int:
        """담임교사 ID 반환 (users 테이블의 관계를 통해)"""
        # user_id를 담임교사 ID로 사용하거나, 별도 로직 필요
        # 임시로 user_id 반환
        return self.user_id if self.user_id else 0
    
    # 상태 정보 (실제 DB에는 is_active 컬럼이 없음)
    # is_active는 프로퍼티로 구현
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    @property
    def is_active(self) -> bool:
        """활성 상태 반환 (기본값 True)"""
        # 실제 DB에 컬럼이 없으므로 항상 True 반환
        return True
