# 학생 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.student import StudentResponse, StudentUpdate
from app.services.student_service import StudentService
from app.services.auth_service import AuthService

router = APIRouter()

@router.get("/", response_model=list[StudentResponse])
async def get_students(
    grade: int = None,
    class_number: int = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """학생 목록 조회"""
    student_service = StudentService(db)
    students = student_service.get_students_by_teacher(
        current_user["id"], grade, class_number
    )
    return students

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """특정 학생 정보 조회"""
    student_service = StudentService(db)
    student = student_service.get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
    return student

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student_update: StudentUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """학생 정보 수정"""
    student_service = StudentService(db)
    updated_student = student_service.update_student(student_id, student_update)
    if not updated_student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
    return updated_student
