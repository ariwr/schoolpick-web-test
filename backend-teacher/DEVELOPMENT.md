# 개발 가이드

## 로컬 개발 환경 설정

### 1. 필수 요구사항
- Python 3.11+
- PostgreSQL 15+
- Docker & Docker Compose (선택사항)

### 2. 프로젝트 설정

```bash
# 프로젝트 클론 후 backend-teacher 디렉토리로 이동
cd backend-teacher

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp env.example .env
# .env 파일을 편집하여 실제 값으로 변경
```

### 3. 데이터베이스 설정

#### Docker Compose 사용 (권장)
```bash
# PostgreSQL과 함께 애플리케이션 실행
docker-compose up -d db
docker-compose up app
```

#### 로컬 PostgreSQL 사용
```bash
# PostgreSQL 설치 후 데이터베이스 생성
createdb schoolpick_teacher

# 마이그레이션 실행
alembic upgrade head
```

### 4. 개발 서버 실행

```bash
# 개발 모드로 실행
npm run dev
# 또는
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API 문서

개발 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 주요 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신

### 사용자 관리
- `GET /api/users/me` - 현재 사용자 정보
- `PUT /api/users/me` - 사용자 정보 수정

### 학생 관리
- `GET /api/students` - 학생 목록 조회
- `GET /api/students/{student_id}` - 특정 학생 정보
- `PUT /api/students/{student_id}` - 학생 정보 수정

### 출석 관리
- `GET /api/attendance` - 출석 현황 조회
- `POST /api/attendance` - 출석 체크
- `PUT /api/attendance/{attendance_id}` - 출석 정보 수정

### 시간표 관리
- `GET /api/schedule` - 교사 시간표 조회
- `POST /api/schedule` - 수업 일정 추가
- `PUT /api/schedule/{schedule_id}` - 수업 일정 수정

## 데이터베이스 마이그레이션

### 새 마이그레이션 생성
```bash
alembic revision --autogenerate -m "마이그레이션 설명"
```

### 마이그레이션 실행
```bash
alembic upgrade head
```

### 마이그레이션 되돌리기
```bash
alembic downgrade -1
```

## 테스트

```bash
# 모든 테스트 실행
pytest

# 특정 테스트 파일 실행
pytest tests/test_auth.py

# 커버리지와 함께 실행
pytest --cov=app
```

## 코드 품질

```bash
# 코드 포맷팅
black app/

# 린팅
flake8 app/

# 타입 체크
mypy app/
```

## 배포

### EC2 배포

1. **서버 준비**
   ```bash
   # EC2 인스턴스에 Docker 설치
   sudo yum update -y
   sudo yum install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   ```

2. **Nginx 설치 및 설정**
   ```bash
   sudo yum install -y nginx
   sudo cp nginx.conf /etc/nginx/conf.d/schoolpick-teacher.conf
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

3. **애플리케이션 배포**
   ```bash
   # 환경변수 설정
   export DATABASE_URL="postgresql://user:password@localhost:5432/schoolpick_teacher"
   export SECRET_KEY="your-production-secret-key"
   
   # 배포 스크립트 실행
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **SSL 인증서 설정 (Let's Encrypt)**
   ```bash
   sudo yum install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 모니터링 및 로그

### 로그 확인
```bash
# 애플리케이션 로그
docker logs schoolpick-teacher-backend

# 실시간 로그
docker logs -f schoolpick-teacher-backend

# Nginx 로그
sudo tail -f /var/log/nginx/schoolpick_teacher_access.log
sudo tail -f /var/log/nginx/schoolpick_teacher_error.log
```

### 헬스 체크
```bash
# 애플리케이션 상태 확인
curl http://localhost:8000/health

# 전체 시스템 상태 확인
curl http://your-domain.com/health
```

## 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 오류**
   - PostgreSQL 서비스 상태 확인
   - 연결 정보 확인 (.env 파일)
   - 방화벽 설정 확인

2. **포트 충돌**
   - 8000번 포트 사용 중인 프로세스 확인
   - 다른 포트 사용하도록 설정 변경

3. **권한 오류**
   - Docker 권한 확인
   - 파일 권한 확인

### 디버깅

```bash
# 상세 로그와 함께 실행
uvicorn app.main:app --reload --log-level debug

# 특정 모듈 디버깅
python -c "from app.database import engine; print(engine.url)"
```
