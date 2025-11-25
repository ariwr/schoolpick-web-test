# 관리자 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.attendance import ApproveCheckoutRequest, ApproveCheckoutResponse, AttendanceResponse
from app.services.attendance_service import AttendanceService
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/approve_checkout", response_model=ApproveCheckoutResponse)
async def approve_checkout(
    request_data: ApproveCheckoutRequest,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """
    관리자 조퇴 승인 API (야자 출석용)
    관리자가 조퇴 요청을 승인하면 check_out_time을 기록하고 status를 '조퇴'로 변경
    """
    attendance_service = AttendanceService(db)
    
    attendance = attendance_service.approve_checkout(
        attendance_id=request_data.attendance_id,
        approve=request_data.approve
    )
    
    if not attendance:
        raise HTTPException(status_code=404, detail="출석 기록을 찾을 수 없습니다")
    
    if request_data.approve:
        message = "조퇴가 승인되었습니다."
    else:
        message = "조퇴 요청이 거부되었습니다."
    
    return ApproveCheckoutResponse(
        success=True,
        message=message,
        attendance=AttendanceResponse.model_validate(attendance)
    )
















