# 인증 서비스
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.models.existing_db import User, Teacher
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.teacher import TeacherCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def authenticate_user(self, email: str, password: str):
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return False
        if not self.verify_password(password, user.password_hash):
            return False
        # 교사만 로그인 가능하도록 확인
        if user.user_type != "teacher":
            return False
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
        """교사 회원가입"""
        # 이메일 중복 확인
        existing_user = self.db.query(User).filter(User.email == teacher_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 등록된 이메일입니다"
            )
        
        # User 생성
        hashed_password = self.get_password_hash(teacher_data.password)
        user = User(
            email=teacher_data.email,
            password_hash=hashed_password,
            name=teacher_data.name,
            phone=teacher_data.phone,
            birth_date=teacher_data.birth_date,
            user_type="teacher",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(user)
        self.db.flush()  # user.id를 얻기 위해 flush
        
        # Teacher 생성
        teacher = Teacher(
            user_id=user.id,
            teacher_number=None,  # 교사 번호는 사용하지 않음
            school_id=None,  # 학교 ID는 사용하지 않음
            school_name=teacher_data.school_name,  # 학교 이름 저장
            position=teacher_data.position,
            hire_date=teacher_data.hire_date,
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
