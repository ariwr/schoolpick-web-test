# 교사 관련 스키마
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, date

class TeacherCreate(BaseModel):
    """교사 회원가입용 스키마"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="비밀번호 (최소 8자, UTF-8 기준 최대 72바이트)")
    name: str
    phone: str  # 전화번호 (필수)
    birth_date: Optional[date] = None
    position: str = "교과"  # 기본값: 교과
    hire_date: Optional[date] = None
    is_homeroom_teacher: bool = False
    certification_number: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        비밀번호 검증:
        1. 영문/숫자/특수문자만 허용 (한글 제한)
        2. UTF-8 바이트 기준 최대 72바이트
        """
        import re
        
        # 한글이나 다른 멀티바이트 문자(일본어, 중국어 등) 검사
        # 영문(대소문자), 숫자, 특수문자만 허용
        allowed_pattern = re.compile(r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~`]+$')
        
        if not allowed_pattern.match(v):
            # 한글이나 허용되지 않은 문자가 포함된 경우
            korean_chars = [char for char in v if ord(char) >= 0xAC00 and ord(char) <= 0xD7A3]
            other_non_ascii = [char for char in v if ord(char) > 127 and char not in korean_chars]
            
            error_parts = []
            if korean_chars:
                error_parts.append(f"한글 문자: {', '.join(set(korean_chars[:5]))}")
            if other_non_ascii:
                error_parts.append(f"기타 특수문자: {', '.join(set(other_non_ascii[:5]))}")
            
            error_msg = "비밀번호는 영문(대소문자), 숫자, 특수문자만 사용할 수 있습니다."
            if error_parts:
                error_msg += f" 허용되지 않은 문자: {', '.join(error_parts)}"
            
            raise ValueError(error_msg)
        
        # 비밀번호 길이 검증 (UTF-8 바이트 기준 최대 72바이트)
        # 영문/숫자/특수문자는 모두 1바이트이므로 문자 수와 바이트 수가 동일
        password_bytes = v.encode('utf-8')
        max_bytes = 72
        
        if len(password_bytes) > max_bytes:
            raise ValueError(
                f"비밀번호가 너무 깁니다. 최대 72자까지 가능합니다. (현재: {len(v)}자)"
            )
        
        return v

class TeacherResponse(BaseModel):
    """교사 정보 응답 스키마"""
    id: int
    user_id: int
    teacher_number: str
    school_id: Optional[int]
    position: str
    hire_date: Optional[date]
    is_homeroom_teacher: bool
    certification_number: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

