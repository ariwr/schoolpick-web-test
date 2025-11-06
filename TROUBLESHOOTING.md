# 문제 해결 가이드 - "Failed to fetch" 오류

## 🔴 문제: Failed to fetch 오류

이 오류는 프론트엔드가 백엔드 서버에 연결하지 못할 때 발생합니다.

---

## ✅ 해결 방법 체크리스트

### 1단계: 백엔드 서버 실행 확인

**터미널 1번 (백엔드):**
```powershell
cd backend-teacher
venv\Scripts\activate
npm run dev
```

또는:
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**정상 실행 시 나타나는 메시지:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**확인 방법:**
- 브라우저에서 `http://localhost:8000/health` 접속
- 또는 `http://localhost:8000/docs` 접속
- JSON 응답이 보이면 정상

---

### 2단계: 프론트엔드 서버 실행 확인

**터미널 2번 (프론트엔드 - 새 터미널 창):**
```powershell
cd frontend-teacher
npm run dev
```

**정상 실행 시:**
- 터미널에 `Ready` 메시지 표시
- `http://localhost:3000` 접속 가능

---

### 3단계: 브라우저 개발자 도구 확인

1. 브라우저에서 F12 또는 우클릭 → 검사
2. **Console 탭**: 에러 메시지 확인
3. **Network 탭**: 
   - `POST http://localhost:8000/api/auth/register` 요청 확인
   - 상태 코드 확인:
     - **404**: 백엔드 서버가 실행되지 않음
     - **CORS 에러**: CORS 설정 문제
     - **Failed to fetch**: 백엔드 서버 연결 불가

---

### 4단계: 포트 확인

**PowerShell에서:**
```powershell
# 포트 8000 확인
netstat -ano | findstr :8000

# 포트 3000 확인  
netstat -ano | findstr :3000
```

포트가 사용 중이면 서버가 실행 중입니다.

---

## 🛠️ 추가 문제 해결

### 문제 1: "Connection refused" 또는 "Failed to fetch"
**원인**: 백엔드 서버가 실행되지 않음

**해결**: 위의 1단계를 따라 백엔드 서버를 실행하세요.

---

### 문제 2: CORS 에러
**원인**: 백엔드의 CORS 설정이 프론트엔드 포트를 허용하지 않음

**해결**: `backend-teacher/app/config.py`의 `ALLOWED_ORIGINS` 확인
- 현재 설정: `http://localhost:3000` 포함
- 다른 포트 사용 시 해당 포트 추가 필요

---

### 문제 3: "Network Error" 또는 타임아웃
**원인**: 방화벽 또는 네트워크 문제

**해결**: 
1. Windows 방화벽 확인
2. 백엔드 서버 로그 확인 (터미널에서 에러 메시지 확인)

---

## 📋 빠른 진단 명령어

### 백엔드 서버 상태 확인
```powershell
# 백엔드 디렉토리에서
curl http://localhost:8000/health
```

또는 브라우저에서:
- `http://localhost:8000/health` 접속
- `http://localhost:8000/docs` 접속 (Swagger 문서)

---

## ⚠️ 중요: 두 서버 모두 실행 필요

1. **백엔드 서버** (포트 8000) - 필수
2. **프론트엔드 서버** (포트 3000) - 필수

두 서버가 모두 실행 중이어야 정상 작동합니다!

---

## 📝 현재 설정 요약

- **백엔드 URL**: `http://localhost:8000`
- **프론트엔드 URL**: `http://localhost:3000`
- **API 엔드포인트**: `http://localhost:8000/api/auth/register`

---

## 🔍 여전히 문제가 있다면?

1. 백엔드 터미널의 에러 메시지를 확인하세요
2. 브라우저 개발자 도구의 Network 탭에서 실패한 요청을 클릭하여 상세 정보 확인
3. 두 서버 모두 재시작해보세요

