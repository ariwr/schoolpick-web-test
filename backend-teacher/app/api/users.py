# 사용자 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth_service import AuthService

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 조회"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 수정"""
    auth_service = AuthService(db)
    updated_user = auth_service.update_user(current_user["id"], user_update)
    return updated_user
