# SchoolPick Teacher Backend

스쿨픽 교사용 웹 서비스를 위한 백엔드 서버입니다.

## 기술 스택

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy + Alembic
- **Authentication**: JWT
- **Deployment**: EC2 + Docker + Nginx

## 프로젝트 구조

```
backend-teacher/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 애플리케이션 진입점
│   ├── config.py               # 설정 관리
│   ├── database.py             # 데이터베이스 연결
│   ├── models/                 # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── attendance.py
│   │   └── schedule.py
│   ├── schemas/                # Pydantic 스키마
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── attendance.py
│   │   └── schedule.py
│   ├── api/                    # API 라우터
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── students.py
│   │   ├── attendance.py
│   │   └── schedule.py
│   ├── core/                   # 핵심 기능
│   │   ├── __init__.py
│   │   ├── security.py         # JWT 인증
│   │   ├── dependencies.py     # 의존성 주입
│   │   └── exceptions.py       # 커스텀 예외
│   ├── services/               # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── student_service.py
│   │   ├── attendance_service.py
│   │   └── schedule_service.py
│   └── utils/                  # 유틸리티 함수
│       ├── __init__.py
│       ├── email.py
│       └── validators.py
├── alembic/                    # 데이터베이스 마이그레이션
├── tests/                      # 테스트 코드
├── docker/                     # Docker 설정
├── requirements.txt            # Python 의존성
├── Dockerfile                  # Docker 이미지
├── docker-compose.yml          # 로컬 개발용
├── .env.example                # 환경변수 예시
└── README.md
```

## 주요 기능

### 1. 인증 및 권한 관리
- 교사 로그인/로그아웃
- JWT 토큰 기반 인증
- 역할 기반 접근 제어

### 2. 학생 관리
- 학생 목록 조회
- 학생 정보 관리
- 반별 학생 관리

### 3. 출석 관리
- 출석 체크
- 출석 현황 조회
- 출석 통계

### 4. 시간표 관리
- 교사 시간표 조회
- 수업 일정 관리

### 5. 과목 설문
- 과목별 설문 조사
- 설문 결과 분석

## 개발 환경 설정

1. Python 3.11+ 설치
2. 가상환경 생성 및 활성화
3. 의존성 설치: `pip install -r requirements.txt`
4. 환경변수 설정: `.env` 파일 생성
5. 데이터베이스 마이그레이션: `alembic upgrade head`
6. 개발 서버 실행: `npm run dev`

## 배포

EC2 인스턴스에서 Docker를 사용하여 배포합니다.

1. Docker 이미지 빌드
2. EC2에 이미지 배포
3. Nginx를 통한 리버스 프록시 설정
4. SSL 인증서 설정 (Let's Encrypt)

## API 문서

개발 서버 실행 후 `http://localhost:8000/docs`에서 Swagger UI를 통해 API 문서를 확인할 수 있습니다.