# 학생 API 라우터
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.student import StudentResponse, StudentUpdate, StudentCreate
from app.services.student_service import StudentService
from app.services.auth_service import AuthService
from app.models.student import Student

router = APIRouter()

@router.get("/", response_model=list[StudentResponse])
async def get_students(
    grade: int = None,
    class_number: int = None,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """학생 목록 조회"""
    # current_user는 email만 포함하므로, email로 User 객체를 찾아서 id를 가져옴
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    student_service = StudentService(db)
    students = student_service.get_students_by_teacher(
        user.id, grade, class_number
    )
    
    # StudentResponse로 변환 (프로퍼티 사용)
    from app.schemas.student import StudentResponse
    return [StudentResponse.from_orm(student) for student in students]

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
    
    # StudentResponse로 변환하여 반환
    from app.schemas.student import StudentResponse
    return StudentResponse.from_orm(student)

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
    
    # StudentResponse로 변환하여 반환
    from app.schemas.student import StudentResponse
    return StudentResponse.from_orm(updated_student)


@router.post("/", response_model=StudentResponse)
async def create_student(
    student_data: StudentCreate,
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """학생 정보 생성"""
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 학번 중복 확인 (student_number로 확인)
    existing_student = db.query(Student).filter(Student.student_number == student_data.student_id).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="이미 존재하는 학번입니다")
    
    # 실제 데이터베이스 구조에 맞게 수정
    student = Student(
        user_id=user.id,  # 실제 DB 구조에 맞게 user_id 사용
        student_number=student_data.student_id,  # student_number에 학번 저장
        grade=student_data.grade,
        class_number=student_data.class_number,
        attendance_number=student_data.student_number,  # attendance_number에 번호 저장
        school_id=None
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    
    # StudentResponse로 변환하여 반환
    from app.schemas.student import StudentResponse
    return StudentResponse.from_orm(student)


@router.post("/create-sample", response_model=list[StudentResponse])
async def create_sample_students(
    current_user: dict = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """샘플 학생 데이터 생성 (테스트/개발용)"""
    from app.models.existing_db import User
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 이미 학생이 있는지 확인 (user_id로 확인)
    existing_students = db.query(Student).filter(Student.user_id == user.id).count()
    if existing_students > 0:
        raise HTTPException(status_code=400, detail="이미 학생 데이터가 존재합니다")
    
    # 샘플 학생 데이터 (한국 이름 사용)
    korean_names = [
        "김민수", "이영희", "박지훈", "최서연", "정현우",
        "강수진", "윤태영", "임다은", "한지은", "송준혁",
        "오예진", "류민준", "신지아", "배현석", "조수빈",
        "황동현", "문서영", "전다혜", "권민성", "고혜진",
        "남도현", "노유진", "마상우", "백지우", "사미라",
        "안지훈", "엄지은", "여민서", "염태호", "유서윤"
    ]
    
    sample_students = []
    name_idx = 0
    
    # 1학년 1반 학생 20명
    for i in range(1, 21):
        sample_students.append({
            "student_id": f"2024{str(i).zfill(3)}",
            "name": korean_names[name_idx % len(korean_names)],
            "grade": 1,
            "class_number": 1,
            "student_number": i
        })
        name_idx += 1
    
    # 2학년 1반 학생 20명
    for i in range(1, 21):
        sample_students.append({
            "student_id": f"2023{str(i).zfill(3)}",
            "name": korean_names[name_idx % len(korean_names)],
            "grade": 2,
            "class_number": 1,
            "student_number": i
        })
        name_idx += 1
    
    # 3학년 1반 학생 20명
    for i in range(1, 21):
        sample_students.append({
            "student_id": f"2022{str(i).zfill(3)}",
            "name": korean_names[name_idx % len(korean_names)],
            "grade": 3,
            "class_number": 1,
            "student_number": i
        })
        name_idx += 1
    
    created_students = []
    for student_data in sample_students:
        # 실제 데이터베이스 구조에 맞게 수정
        student = Student(
            user_id=user.id,  # 실제 DB 구조에 맞게 user_id 사용
            student_number=student_data["student_id"],  # student_number에 학번 저장
            grade=student_data["grade"],
            class_number=student_data["class_number"],
        attendance_number=student_data["student_number"],  # attendance_number에 번호 저장
        school_id=None
        )
        db.add(student)
        created_students.append(student)
    
    db.commit()
    for student in created_students:
        db.refresh(student)
    
    # StudentResponse로 변환하여 반환
    from app.schemas.student import StudentResponse
    return [StudentResponse.from_orm(student) for student in created_students]
