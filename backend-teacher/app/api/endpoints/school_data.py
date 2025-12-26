from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.existing_db import Department, Facility, Teacher, Subject, User
from app.schemas.school_data import (
    DepartmentCreate, Department as DepartmentSchema,
    FacilityCreate, Facility as FacilitySchema,
    TeacherDescUpdate, SubjectDescUpdate,
    TeacherResponse, SubjectResponse
)

router = APIRouter()

# --- Departments ---

@router.post("/departments", response_model=DepartmentSchema)
def create_department(dept: DepartmentCreate, db: Session = Depends(get_db)):
    db_dept = Department(**dept.dict())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@router.get("/departments", response_model=List[DepartmentSchema])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    departments = db.query(Department).offset(skip).limit(limit).all()
    return departments

# --- Facilities ---

@router.post("/facilities", response_model=FacilitySchema)
def create_facility(facility: FacilityCreate, db: Session = Depends(get_db)):
    db_facility = Facility(**facility.dict())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility

@router.get("/facilities", response_model=List[FacilitySchema])
def read_facilities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    facilities = db.query(Facility).offset(skip).limit(limit).all()
    return facilities

# --- Special Bulk Update / Get for Teachers ---

# Endpoint to get detailed teacher list (joined with user name)
@router.get("/teachers-detail", response_model=List[dict])
def read_teachers_detail(db: Session = Depends(get_db)):
    # Join Teacher and User to get names
    results = db.query(Teacher, User).join(User, Teacher.user_id == User.id).all()
    
    data = []
    for teacher, user in results:
        data.append({
            "id": teacher.id,
            "name": user.name,
            "teacher_number": teacher.teacher_number,
            "department_id": teacher.department_id,
            "max_hours_per_week": teacher.max_hours_per_week or 15
        })
    return data

@router.patch("/teachers/{teacher_id}", response_model=dict)
def update_teacher_info(teacher_id: int, info: TeacherDescUpdate, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    if info.department_id is not None:
        teacher.department_id = info.department_id
    if info.max_hours_per_week is not None:
        teacher.max_hours_per_week = info.max_hours_per_week
    if info.position is not None:
        teacher.position = info.position
        
    db.commit()
    return {"status": "success", "id": teacher.id}

# --- Special Bulk Update / Get for Subjects ---

@router.get("/subjects-detail", response_model=List[SubjectResponse])
def read_subjects_detail(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    return subjects

@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
def update_subject_info(subject_id: int, info: SubjectDescUpdate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    if info.department_id is not None:
        subject.department_id = info.department_id
    if info.required_hours is not None:
        subject.required_hours = info.required_hours
    if info.target_grade is not None:
        subject.target_grade = info.target_grade
    if info.category is not None:
        subject.category = info.category
        
    db.commit()
    db.refresh(subject)
    return subject
