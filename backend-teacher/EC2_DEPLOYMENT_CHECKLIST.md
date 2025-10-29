# EC2 배포 체크리스트 및 연결 확인 가이드

## 🔍 현재 설정 상태

### ✅ 확인된 사항
1. **데이터베이스 연결 설정**
   - EC2 IP: `3.35.3.225`
   - 데이터베이스: `hw_project001`
   - 포트: `5432`
   - 연결 URL 형식: `postgresql://postgres:password@3.35.3.225:5432/hw_project001`

2. **모델 설정**
   - `existing_db.py` 모델 사용 중
   - 실제 DB 스키마와 일치하도록 설정됨

### ⚠️  주의사항

1. **main.py 모델 사용 문제**
   - 현재 `main.py`에서 `user`, `student` 모델을 import하고 있으나
   - 실제로는 `existing_db` 모델을 사용해야 함
   - `create_all` 호출이 잘못된 모델을 참조할 수 있음

2. **school_name 컬럼**
   - 모델에 `school_name` 필드 추가됨
   - 실제 DB에 컬럼이 없으면 마이그레이션 필요

3. **환경변수 설정**
   - `.env` 파일이 없음
   - EC2에서 환경변수 설정 필요

## 📋 EC2 배포 전 확인사항

### 1. 데이터베이스 연결 테스트
```bash
# EC2에서 실행
cd backend-teacher
python test_db_connection.py
```

### 2. 환경변수 설정 (.env 파일 생성)
```bash
# EC2에서 실행
cd backend-teacher
cp env.example .env
# .env 파일 편집하여 실제 값 입력
```

### 3. 필요한 마이그레이션 실행
```sql
-- teachers 테이블에 school_name 컬럼 추가 (필요시)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_name VARCHAR(200);
```

### 4. 네트워크 연결 확인
```bash
# EC2에서 DB 서버 연결 테스트
psql -h 3.35.3.225 -U postgres -d hw_project001 -c "SELECT 1;"
```

### 5. 방화벽 설정 확인
- EC2 Security Group에서 PostgreSQL 포트(5432) 허용 확인
- DB 서버에서 EC2 IP 허용 확인

## 🚀 EC2 배포 방법

### 방법 1: Docker 사용 (권장)
```bash
# 1. 환경변수 설정
export DATABASE_URL="postgresql://postgres:password@3.35.3.225:5432/hw_project001"
export SECRET_KEY="your-production-secret-key"
export DEBUG=False
export ENVIRONMENT=production

# 2. 배포 스크립트 실행
chmod +x deploy.sh
./deploy.sh
```

### 방법 2: 직접 실행
```bash
# 1. 가상환경 활성화
source venv/bin/activate  # 또는 python -m venv venv && source venv/bin/activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경변수 설정
export DATABASE_URL="postgresql://postgres:password@3.35.3.225:5432/hw_project001"
export SECRET_KEY="your-production-secret-key"

# 4. 애플리케이션 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🔧 수정 필요 사항

1. **main.py 수정**: `existing_db` 모델 사용
2. **Health Check 개선**: 실제 DB 연결 확인 추가
3. **에러 처리**: DB 연결 실패 시 적절한 에러 메시지

