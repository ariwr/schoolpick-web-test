# 백엔드 서버 연결 확인 가이드

## 🔍 문제 진단

백엔드 서버 연결 실패 오류가 발생하는 주요 원인:

### 1. 백엔드 서버가 실행되지 않음
- **확인 방법**: 브라우저에서 `http://localhost:8000/docs` 접속
- **해결**: 백엔드 서버 실행 필요

### 2. 포트 번호 불일치
- **기본 포트**: 8000
- **확인**: 백엔드 서버가 실제로 사용하는 포트 확인

### 3. 네트워크/방화벽 문제
- Windows 방화벽이 포트 8000을 차단할 수 있음

---

## ✅ 해결 방법

### 방법 1: 백엔드 서버 실행 (PowerShell)

```powershell
# 1. backend-teacher 디렉토리로 이동
cd backend-teacher

# 2. 가상환경 활성화 (이미 활성화되어 있다면 생략)
.\venv\Scripts\Activate.ps1

# 3. 서버 실행
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

또는 간단한 스크립트 사용:
```powershell
.\start_server_simple.ps1
```

### 방법 2: 서버 실행 확인

서버가 정상적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 방법 3: 브라우저에서 확인

1. 브라우저에서 `http://localhost:8000/docs` 접속
2. FastAPI 문서 페이지가 보이면 서버가 정상 실행 중
3. `http://localhost:8000/health` 접속하여 헬스 체크 확인

---

## 🧪 서버 연결 테스트

프론트엔드에서 `/api-test` 페이지를 사용하여 서버 연결을 테스트할 수 있습니다.

또는 터미널에서:
```powershell
# PowerShell에서
Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET
```

---

## ⚠️ 자주 발생하는 오류

### 오류 1: "포트가 이미 사용 중"
```
Error: [Errno 10048] Only one usage of each socket address
```
**해결**: 다른 프로그램이 포트 8000을 사용 중. 포트 변경하거나 해당 프로그램 종료

### 오류 2: "모듈을 찾을 수 없음"
```
ModuleNotFoundError: No module named 'fastapi'
```
**해결**: 가상환경 활성화 후 `pip install -r requirements.txt` 실행

### 오류 3: "데이터베이스 연결 실패"
```
Could not connect to database
```
**해결**: PostgreSQL 서버가 실행 중인지 확인, `.env` 파일의 데이터베이스 설정 확인

---

## 📝 체크리스트

서버 연결 문제 해결을 위한 체크리스트:

- [ ] 백엔드 서버가 실행 중인가? (`http://localhost:8000/docs` 접속 확인)
- [ ] 포트 8000이 다른 프로그램에서 사용 중이 아닌가?
- [ ] 가상환경이 활성화되어 있는가?
- [ ] 필요한 패키지가 모두 설치되어 있는가? (`pip install -r requirements.txt`)
- [ ] 데이터베이스 서버가 실행 중인가?
- [ ] `.env` 파일이 올바르게 설정되어 있는가?
- [ ] Windows 방화벽이 포트 8000을 차단하지 않는가?

---

## 🚀 빠른 시작

1. **백엔드 서버 실행**:
   ```powershell
   cd backend-teacher
   .\venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **프론트엔드 서버 실행** (새 터미널):
   ```powershell
   cd frontend-teacher
   npm run dev
   ```

3. **브라우저에서 확인**:
   - 프론트엔드: `http://localhost:3000`
   - 백엔드 API 문서: `http://localhost:8000/docs`

