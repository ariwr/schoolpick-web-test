# 데이터베이스 구조 불일치 문제 해결

## 문제
`students` 테이블에 `student_id`, `name`, `homeroom_teacher_id` 컬럼이 존재하지 않아 발생한 오류

## 실제 데이터베이스 구조
```
students 테이블:
- id (PK)
- user_id (FK → users.id)
- student_number (VARCHAR(20))  ← 학번
- school_id
- grade
- class_number
- attendance_number  ← 출석번호
- created_at
- updated_at
```

## 해결 방법

### 1. 모델 수정 (`app/models/student.py`)
- 실제 DB 컬럼에 맞게 수정: `user_id`, `student_number`, `attendance_number` 사용
- `student_id`, `name`, `homeroom_teacher_id`는 프로퍼티로 구현하여 호환성 유지

### 2. API 수정 (`app/api/students.py`)
- 실제 DB 구조에 맞게 데이터 생성/조회 로직 수정
- `StudentResponse.from_orm()` 사용하여 프로퍼티 값 반환

### 3. 서비스 수정 (`app/services/student_service.py`)
- `user` 관계를 eager loading하여 성능 최적화

## 테스트
서버를 재시작하고 다음을 확인:
1. 학생 목록 조회: `GET /api/students/`
2. 샘플 데이터 생성: `POST /api/students/create-sample`

## 참고
- 학생 이름은 `users` 테이블의 `name` 컬럼에서 가져옴
- `user_id`를 통해 `users` 테이블과 연결

