# SchoolPick 웹 아키텍처 가이드

> 이 문서는 프로젝트 구조와 배포 과정을 이해하기 쉽게 설명합니다.

---

## 1. 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EC2 서버 (3.35.3.225)                        │
│                                                                      │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│   │   nginx     │      │  uvicorn    │      │ PostgreSQL  │         │
│   │  (웹서버)    │ ───→ │  (API서버)   │ ───→ │   (DB)      │         │
│   │  :80        │      │  :8000      │      │  :5432      │         │
│   └─────────────┘      └─────────────┘      └─────────────┘         │
│         │                                                            │
│         ├── /* (일반 요청) → 정적 파일 서빙 (프론트엔드)                │
│         └── /api/* (API 요청) → 백엔드로 프록시                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 인터넷
                              ▼
                    ┌───────────────────┐
                    │ web.godingpick.com │
                    │      (사용자)       │
                    └───────────────────┘
```

### 구성요소 설명

| 구성요소 | 역할 | 비유 |
|---------|------|------|
| nginx | 웹서버, 요청 분배 | 건물 안내데스크 |
| uvicorn | Python API 서버 | 실제 업무 담당자 |
| PostgreSQL | 데이터베이스 | 서류 보관 창고 |

---

## 2. API란?

### 식당 비유로 이해하기

```
[손님(프론트엔드)] ←→ [웨이터(API)] ←→ [주방(DB)]

1. 손님이 메뉴판 보고 주문 (요청)
2. 웨이터가 주방에 전달
3. 주방에서 요리
4. 웨이터가 음식 가져다줌 (응답)
```

| 역할 | 비유 | 실제 |
|------|------|------|
| 프론트엔드 | 손님 | 화면, 버튼 클릭 |
| API | 웨이터 | 요청 전달, 결과 반환 |
| DB | 주방 | 실제 데이터 보관/처리 |

### 실제 예시: 로그인

```
버튼 클릭: "로그인"
    ↓
POST /api/auth/login
{ "email": "teacher@school.com", "password": "1234" }
    ↓
서버가 DB에서 확인 후 응답
{ "token": "abc123", "user": { "name": "김선생" } }
    ↓
프론트엔드가 토큰 저장 → 로그인 완료
```

### API 문서 직접 확인하기

브라우저에서 http://3.35.3.225:8000/docs 접속하면 모든 API 목록 확인 및 테스트 가능!

---

## 3. 가상환경과 Uvicorn

### 가상환경(venv)이란?

```
EC2 서버 (집 전체)
├── venv A (방 1) - SchoolPick용 패키지들
├── venv B (방 2) - 다른 프로젝트용 패키지들
└── 시스템 Python (거실) - 기본 설치

→ 프로젝트마다 필요한 패키지 버전이 다르니까 격리하는 것!
```

**왜 필요해?**
- 프로젝트 A는 Django 3.0 필요
- 프로젝트 B는 Django 4.0 필요
- 같이 설치하면 충돌! → 가상환경으로 분리

### Uvicorn이란?

```bash
source venv/bin/activate        ← "이 방(가상환경)에 들어간다"
python -m uvicorn app.main:app --port 8000
                 ↑                    ↑
         "FastAPI 코드 실행"    "8000번 포트로 요청 받아라"
```

- **uvicorn** = 웹 서버 (요청을 받는 프로그램)
- **app.main:app** = FastAPI 코드 (실제 로직)
- **--port 8000** = 8000번 포트에서 대기

---

## 4. 개발 환경 vs 배포 환경

### 로컬(내 컴퓨터)에서 개발

```
┌─────────────────────────────────────┐
│         내 컴퓨터 (localhost)        │
│                                      │
│  npm run dev     →  localhost:3000  │  (프론트엔드)
│  uvicorn ...     →  localhost:8000  │  (백엔드)
│                                      │
│  → 코드 수정하면 바로 반영됨 (개발 모드) │
└─────────────────────────────────────┘
```

### EC2(서버)에 배포

```
┌─────────────────────────────────────┐
│            EC2 서버                  │
│                                      │
│  nginx + 정적파일  →  :80            │  (프론트엔드)
│  uvicorn          →  :8000          │  (백엔드)
│                                      │
│  → 코드 수정하면 재배포 필요!          │
└─────────────────────────────────────┘
```

### 핵심 차이

| 구분 | 로컬 (개발) | EC2 (배포) |
|------|------------|-----------|
| 프론트엔드 | npm run dev (실시간 반영) | 빌드된 정적 파일 |
| 백엔드 | --reload 옵션 (실시간 반영) | 수동 재시작 필요 |
| 주소 | localhost | web.godingpick.com |
| 용도 | 개발/테스트 | 실제 서비스 |

---

## 5. 프론트엔드 vs 백엔드 배포 차이

### 프론트엔드 (Next.js) - 정적 파일

```
정적 파일 = HTML, CSS, JS 파일들
           (한번 만들어두면 그냥 파일 전송만 하면 됨)

[로컬]                      [EC2]
코드 수정                      │
    ↓                         │
npm run build                 │
    ↓                         │
out/ 폴더 생성                 │
    ↓                         │
scp로 복사  ─────────────────→ frontend-dist/
                              │
                         nginx가 서빙
                              ↓
                         사용자에게 전달
```

### 백엔드 (FastAPI) - 메모리에서 실행

```
메모리에 코드가 올라가서 실행됨
(파일만 바꾸면 반영 안 됨!)

[로컬]                      [EC2]
코드 수정                      │
    ↓                         │
scp로 복사  ─────────────────→ backend-teacher/
                              │
                         기존 서버 중지 (pkill)
                              ↓
                         새 서버 시작 (uvicorn)
                              ↓
                         새 코드가 메모리에 로드됨
```

### 왜 백엔드는 재시작이 필요할까?

```
서버 시작할 때:
┌──────────────┐                ┌──────────────┐
│ Python 코드   │  → 메모리 로드 →  │ 실행 중인 코드 │
│ (파일)        │                │ (메모리)      │
└──────────────┘                └──────────────┘

파일만 수정하면:
┌──────────────┐                ┌──────────────┐
│ 새 코드       │                │ 옛날 코드     │ ← 여전히 이걸로 동작!
│ (파일)        │                │ (메모리)      │
└──────────────┘                └──────────────┘

재시작해야:
┌──────────────┐                ┌──────────────┐
│ 새 코드       │  → 다시 로드 →   │ 새 코드       │ ← 이제 새 코드로 동작!
│ (파일)        │                │ (메모리)      │
└──────────────┘                └──────────────┘
```

---

## 6. 배포 흐름 요약

### 프론트엔드 수정 시

```
1. 로컬에서 코드 수정
2. npm run build (out/ 폴더 생성)
3. scp로 EC2에 복사
4. 끝! (nginx가 알아서 새 파일 서빙)
```

### 백엔드 API 수정 시

```
1. 로컬에서 코드 수정
2. scp로 EC2에 복사
3. EC2 접속
4. pkill -f uvicorn (기존 서버 중지)
5. source venv/bin/activate (가상환경 진입)
6. nohup python -m uvicorn ... & (새 서버 시작)
7. 끝!
```

---

## 7. 실제 배포 명령어

### 프론트엔드 배포

```bash
# 1. 로컬에서 빌드
cd frontend-teacher
npm run build

# 2. EC2로 파일 전송
scp -i godingpick_ec2_key.pem -r out/* ubuntu@3.35.3.225:/home/ubuntu/frontend-dist/
```

### 백엔드 배포

```bash
# 1. EC2 접속
ssh -i godingpick_ec2_key.pem ubuntu@3.35.3.225

# 2. 백엔드 폴더로 이동
cd /home/ubuntu/backend-teacher

# 3. 기존 서버 중지
pkill -f uvicorn

# 4. 가상환경 활성화 & 서버 재시작
source venv/bin/activate
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &

# 5. 확인
curl http://localhost:8000/docs
```

---

## 8. 핵심 요약표

| 구분 | 프론트엔드 | 백엔드 |
|------|-----------|--------|
| 기술 | Next.js | FastAPI + Uvicorn |
| 배포 방식 | 정적 파일 복사 | 서버 재시작 필요 |
| EC2 위치 | `/home/ubuntu/frontend-dist/` | `/home/ubuntu/backend-teacher/` |
| 포트 | 80 (nginx) | 8000 |
| 수정 후 | 빌드 → 복사 | 복사 → 재시작 |

---

## 9. 자주 하는 실수

| 실수 | 증상 | 해결 |
|------|------|------|
| 백엔드 수정 후 재시작 안 함 | API가 옛날 동작 그대로 | `pkill -f uvicorn` 후 재시작 |
| 프론트 빌드 안 하고 복사 | 개발 코드 그대로 올라감 | `npm run build` 먼저 |
| 가상환경 활성화 안 함 | 패키지 못 찾음 에러 | `source venv/bin/activate` |
| nohup 안 씀 | SSH 끊으면 서버 꺼짐 | `nohup ... &` 로 실행 |

---

## 10. 로컬 개발 테스트

### 프론트엔드 실행

```bash
cd frontend-teacher
npm install          # 최초 1회 또는 패키지 변경 시
npm run dev          # 개발 서버 시작
```
→ http://localhost:3000 접속

### 백엔드 실행

```bash
cd backend-teacher
source venv/bin/activate    # 가상환경 활성화
pip install -r requirements.txt  # 패키지 설치 (최초 1회)
python -m uvicorn app.main:app --reload --port 8000
```
→ http://localhost:8000/docs 접속 (API 문서)

### 로컬에서 프론트 + 백엔드 연동 테스트

```
프론트엔드 (localhost:3000)
    ↓ API 요청
백엔드 (localhost:8000)
    ↓ 쿼리
PostgreSQL (EC2 3.35.3.225:5432)
```

**주의:** 로컬 백엔드도 EC2의 PostgreSQL을 사용함 (`.env` 파일 설정 확인)

---

## 11. 배포 후 테스트

### 1단계: 서버 상태 확인

```bash
# Health Check (서버 + DB 연결 확인)
curl http://web.godingpick.com/health

# 정상 응답 예시
{"status":"healthy","database":"connected","version":"1.0.0"}
```

### 2단계: 프론트엔드 확인

브라우저에서 http://web.godingpick.com 접속
- 페이지가 정상적으로 로드되는지 확인
- 콘솔(F12)에 에러가 없는지 확인

### 3단계: API 연동 확인

| 테스트 항목 | 방법 | 예상 결과 |
|------------|------|----------|
| 회원가입 | /register에서 가입 시도 | 성공 메시지 |
| 로그인 | /login에서 로그인 | 대시보드 이동 |
| API 문서 | /docs 접속 | Swagger UI |

### 4단계: 로그 확인 (문제 발생 시)

```bash
# EC2 접속
ssh -i godingpick_ec2_key.pem ubuntu@3.35.3.225

# 백엔드 로그
tail -50 /home/ubuntu/backend-teacher/server.log

# nginx 에러 로그
sudo tail -50 /var/log/nginx/error.log
```

---

## 12. 주요 URL 정리

| 용도 | URL |
|------|-----|
| 프로덕션 사이트 | http://web.godingpick.com |
| API 문서 (Swagger) | http://web.godingpick.com/docs |
| Health Check | http://web.godingpick.com/health |
| EC2 직접 접속 | http://3.35.3.225:8000/docs |

---

## 13. 한 줄 요약

> **프론트는 파일만 덮어쓰면 끝, 백엔드는 메모리에 올라가니까 반드시 재시작!**
