# 서버 실행 가이드

## ⚠️ 중요: 두 서버를 모두 실행해야 합니다!

프론트엔드(Next.js)와 백엔드(FastAPI)는 **별도의 서버**입니다. 두 서버를 모두 실행해야 정상적으로 작동합니다.

---

## 1️⃣ 백엔드 서버 실행 (FastAPI - 포트 8000)

### 터미널 1번: 백엔드 서버

```bash
# backend-teacher 디렉토리로 이동
cd backend-teacher

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 또는 (Mac/Linux)
# source venv/bin/activate

# 백엔드 서버 실행
npm run dev
# 또는
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**정상 실행 확인:**
- 브라우저에서 `http://localhost:8000/health` 접속
- JSON 응답이 보이면 성공
- 또는 `http://localhost:8000/docs` (Swagger UI) 접속 가능

---

## 2️⃣ 프론트엔드 서버 실행 (Next.js - 포트 3000)

### 터미널 2번: 프론트엔드 서버 (새 터미널 창/탭에서 실행)

```bash
# frontend-teacher 디렉토리로 이동
cd frontend-teacher

# 프론트엔드 서버 실행
npm run dev
```

**정상 실행 확인:**
- 터미널에 "Ready" 메시지가 표시됨
- 브라우저에서 `http://localhost:3000` 접속 가능

---

## 3️⃣ 두 서버 연결 확인

### API 호출 방식
- 프론트엔드는 `http://localhost:8000`으로 직접 API를 호출합니다
- 코드: `fetch('http://localhost:8000/api/auth/register', ...)`

### 문제 해결 체크리스트

1. **백엔드 서버가 실행 중인가?**
   - `http://localhost:8000/health` 접속 테스트
   - 터미널에서 에러 메시지 확인

2. **프론트엔드 서버가 실행 중인가?**
   - `http://localhost:3000` 접속 테스트
   - 브라우저 콘솔에서 에러 확인

3. **포트 충돌 확인**
   - 포트 8000이 다른 프로그램에서 사용 중인지 확인
   - 포트 3000이 다른 프로그램에서 사용 중인지 확인

4. **CORS 오류 확인**
   - 브라우저 개발자 도구 → Console 탭 확인
   - CORS 오류가 있으면 백엔드 `app/config.py`의 `ALLOWED_ORIGINS` 확인

---

## 📋 실행 순서 요약

1. **터미널 1**: 백엔드 서버 실행 (`cd backend-teacher` → `npm run dev`)
2. **터미널 2**: 프론트엔드 서버 실행 (`cd frontend-teacher` → `npm run dev`)
3. 브라우저에서 `http://localhost:3000` 접속
4. 회원가입 테스트

---

## 🔍 현재 설정 확인

- **백엔드 포트**: 8000
- **프론트엔드 포트**: 3000 (Next.js 기본값)
- **API 기본 URL**: `http://localhost:8000` (코드에서 직접 지정)

---

## ⚙️ 환경 변수 설정 (선택사항)

프론트엔드에서 다른 백엔드 주소를 사용하려면:

**`frontend-teacher/.env.local` 파일 생성:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

이 파일은 자동으로 인식되며, 코드의 `API_BASE` 변수에 적용됩니다.

