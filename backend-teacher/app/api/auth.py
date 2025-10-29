# 인증 API 라우터
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.schemas.teacher import TeacherCreate, TeacherResponse
from app.services.auth_service import AuthService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: str
    password: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    teacher_data: TeacherCreate,
    db: Session = Depends(get_db)
):
    """교사 회원가입"""
    auth_service = AuthService(db)
    try:
        result = auth_service.register_teacher(teacher_data)
        return {
            "message": "회원가입이 완료되었습니다",
            "user_id": result["user"].id,
            "teacher_id": result["teacher"].id
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원가입 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """교사 로그인"""
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="잘못된 이메일 또는 비밀번호입니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout():
    """로그아웃"""
    return {"message": "로그아웃되었습니다"}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: dict = Depends(auth_service.get_current_user)
):
    """토큰 갱신"""
    # 토큰 갱신 로직 구현
    pass
