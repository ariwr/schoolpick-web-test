# 인증 API 라우터
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text
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
    import logging
    import sys
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # 콘솔 핸들러 추가 (터미널에 로그 출력)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
    
    try:
        logger.info(f"회원가입 요청 받음: {teacher_data.email}")
        
        # 데이터베이스 연결 테스트 (타임아웃 방지)
        try:
            # 빠른 연결 확인 (5초 타임아웃)
            result = db.execute(text("SELECT 1"))
            result.fetchone()  # 결과 소비
            logger.info("데이터베이스 연결 확인됨")
        except Exception as db_error:
            db.rollback()
            error_msg = str(db_error)
            logger.error(f"데이터베이스 연결 실패: {error_msg}")
            
            # 비밀번호 인증 실패인 경우 구체적인 메시지
            if "password authentication failed" in error_msg.lower():
                detail_msg = "데이터베이스 비밀번호가 올바르지 않습니다. .env 파일의 DATABASE_PASSWORD를 확인하세요."
            elif "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                detail_msg = "데이터베이스 서버에 연결할 수 없습니다. 네트워크 또는 방화벽 설정을 확인하세요."
            else:
                detail_msg = f"데이터베이스 연결 실패: {error_msg[:100]}"
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail_msg
            )
        
        auth_service = AuthService(db)
        result = auth_service.register_teacher(teacher_data)
        logger.info(f"회원가입 성공: {teacher_data.email}")
        return {
            "message": "회원가입이 완료되었습니다",
            "user_id": result["user"].id,
            "teacher_id": result["teacher"].id
        }
    except HTTPException as e:
        logger.error(f"회원가입 HTTP 오류: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"회원가입 중 예외 발생: {str(e)}", exc_info=True)
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
    import logging
    import sys
    from sqlalchemy.exc import OperationalError
    from sqlalchemy import text
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # 콘솔 핸들러 추가 (터미널에 로그 출력)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
    
    try:
        # 데이터베이스 연결 테스트 (타임아웃 방지)
        try:
            # 빠른 연결 확인 (5초 타임아웃)
            result = db.execute(text("SELECT 1"))
            result.fetchone()  # 결과 소비
            logger.info("데이터베이스 연결 확인됨")
        except Exception as db_error:
            db.rollback()
            error_msg = str(db_error)
            logger.error(f"데이터베이스 연결 실패: {error_msg}")
            
            # 비밀번호 인증 실패인 경우 구체적인 메시지
            if "password authentication failed" in error_msg.lower():
                detail_msg = "데이터베이스 비밀번호가 올바르지 않습니다. .env 파일의 DATABASE_PASSWORD를 확인하세요."
            elif "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                detail_msg = "데이터베이스 서버에 연결할 수 없습니다. 네트워크 또는 방화벽 설정을 확인하세요."
            else:
                detail_msg = f"데이터베이스 연결 실패: {error_msg[:100]}"
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail_msg
            )
        
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
    except HTTPException as e:
        logger.error(f"로그인 HTTP 오류: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"로그인 중 예외 발생: {str(e)}", exc_info=True)
        # 데이터베이스 연결 오류인지 확인
        error_msg = str(e)
        if "password authentication failed" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="데이터베이스 비밀번호가 올바르지 않습니다. .env 파일의 DATABASE_PASSWORD를 확인하세요."
            )
        elif "OperationalError" in str(type(e)) or "connection" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"데이터베이스 연결 실패: {error_msg[:200]}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"로그인 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """로그아웃"""
    return {"message": "로그아웃되었습니다"}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: dict = Depends(AuthService.get_current_user)
):
    """토큰 갱신"""
    # 토큰 갱신 로직 구현
    pass
