# 사용자 API 라우터
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.models.user import UserRole
from app.services.auth_service import AuthService
from app.models.existing_db import User

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 조회"""
    # 이메일로 실제 User 객체 조회
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    # user_type 문자열을 UserRole enum으로 변환
    try:
        user_role = UserRole(user.user_type)
    except ValueError:
        # user_type이 enum에 없으면 TEACHER로 기본 설정
        user_role = UserRole.TEACHER
    
    # UserResponse 스키마에 맞게 변환
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        user_type=user_role,
        is_active=True,  # User 모델에 is_active 필드가 없으므로 기본값
        created_at=user.created_at,
        updated_at=user.updated_at,
        teacher_id=None,  # 스키마에 있지만 모델에는 없음
        department=None  # 스키마에 있지만 모델에는 없음
    )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 수정"""
    # 이메일로 실제 User 객체 조회
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    auth_service = AuthService(db)
    updated_user = auth_service.update_user(user.id, user_update)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    # user_type 문자열을 UserRole enum으로 변환
    try:
        user_role = UserRole(updated_user.user_type)
    except ValueError:
        user_role = UserRole.TEACHER
    
    # UserResponse 스키마에 맞게 변환
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        name=updated_user.name,
        phone=updated_user.phone,
        user_type=user_role,
        is_active=True,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at,
        teacher_id=None,
        department=None
    )
