# 인증 서비스
from sqlalchemy.orm import Session
from sqlalchemy import text
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.models.existing_db import User, Teacher
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.teacher import TeacherCreate

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        비밀번호 검증 - bcrypt 직접 사용
        passlib과 호환되도록 처리
        """
        try:
            # bcrypt는 바이트를 요구하므로 인코딩
            plain_bytes = plain_password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            
            # bcrypt.checkpw로 직접 검증
            return bcrypt.checkpw(plain_bytes, hashed_bytes)
        except Exception:
            # bcrypt 직접 검증 실패 시 passlib으로 폴백 (기존 데이터 호환성)
            try:
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                return pwd_context.verify(plain_password, hashed_password)
            except Exception:
                return False
    
    def get_password_hash(self, password: str) -> str:
        """
        비밀번호 해시화 - bcrypt 직접 사용
        bcrypt는 최대 72바이트까지만 처리 가능합니다.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # 비밀번호를 UTF-8로 인코딩하여 바이트 길이 확인
        password_bytes = password.encode('utf-8')
        max_bytes = 72
        password_length = len(password)
        byte_length = len(password_bytes)
        
        logger.debug(f"비밀번호 해시 요청: 문자 수={password_length}, 바이트 수={byte_length}")
        
        # 72바이트 초과 시 자르기
        if byte_length > max_bytes:
            logger.warning(f"비밀번호가 72바이트를 초과합니다. {byte_length}바이트 → 72바이트로 자르기")
            password_bytes = password_bytes[:max_bytes]
            byte_length = len(password_bytes)
        
        # bcrypt로 직접 해시 생성
        # bcrypt.gensalt()로 솔트 생성, rounds는 기본값 사용
        try:
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password_bytes, salt)
            # bytes를 문자열로 디코딩하여 반환
            hash_result = hashed.decode('utf-8')
            logger.debug(f"비밀번호 해시 성공: {byte_length}바이트")
            return hash_result
        except Exception as e:
            logger.error(f"비밀번호 해시 오류: {str(e)}, 비밀번호 길이: {byte_length}바이트")
            raise ValueError(f"비밀번호 해시화 실패: {str(e)}")
    
    def authenticate_user(self, email: str, password: str):
        import logging
        logger = logging.getLogger(__name__)
        
        # 이메일로 User 찾기
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            logger.debug(f"사용자를 찾을 수 없음: {email}")
            return False
        
        # 비밀번호 확인 (users 테이블의 password_hash 사용)
        if not self.verify_password(password, user.password_hash):
            logger.debug(f"비밀번호 불일치: {email}")
            return False
        
        # 교사만 로그인 가능하도록 확인
        if user.user_type != "teacher":
            logger.debug(f"교사가 아닌 사용자: {email}, user_type={user.user_type}")
            return False
        
        logger.debug(f"인증 성공: {email}, user_type={user.user_type}")
        return user
    
    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def get_current_user(token: str = Depends(oauth2_scheme)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        return {"email": email}
    
    def update_user(self, user_id: int, user_update: UserUpdate):
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        for field, value in user_update.dict(exclude_unset=True).items():
            setattr(user, field, value)
        
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def register_teacher(self, teacher_data: TeacherCreate):
        """교사 회원가입 - 비밀번호는 users 테이블에 저장"""
        try:
            # 이메일 중복 확인
            existing_user = self.db.query(User).filter(User.email == teacher_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이미 등록된 이메일입니다"
                )
            
            # 비밀번호 해시화
            hashed_password = self.get_password_hash(teacher_data.password)
            
            # User 생성 (비밀번호 포함)
            user = User(
                email=teacher_data.email,
                password_hash=hashed_password,  # 비밀번호는 users 테이블에 저장
                name=teacher_data.name,
                phone=teacher_data.phone,
                birth_date=teacher_data.birth_date,  # Optional이므로 None이 될 수 있음
                user_type="teacher",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(user)
            self.db.flush()  # user.id를 얻기 위해 flush
            
            # Teacher 생성 (교사 전용 정보만)
            generated_teacher_number = f"T{datetime.utcnow().year}{user.id:06d}"
            teacher = Teacher(
                user_id=user.id,
                teacher_number=generated_teacher_number,
                school_id=None,
                position=teacher_data.position,
                hire_date=teacher_data.hire_date,  # Optional이므로 None이 될 수 있음
                is_homeroom_teacher=teacher_data.is_homeroom_teacher,
                certification_number=teacher_data.certification_number,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(teacher)
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(teacher)
            
            return {
                "user": user,
                "teacher": teacher
            }
        except HTTPException:
            # HTTPException은 그대로 전달
            raise
        except Exception as e:
            # 데이터베이스 에러 등 다른 예외는 롤백하고 상세한 에러 메시지 반환
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"회원가입 중 오류가 발생했습니다: {str(e)}"
            )
