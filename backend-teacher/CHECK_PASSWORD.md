# 데이터베이스 비밀번호 확인 방법

## 현재 상황
`.env` 파일에 `DATABASE_PASSWORD=password`로 되어 있습니다.

## 확인하는 방법 (3가지 중 하나 선택)

### 방법 1: 팀원에게 물어보기 (가장 빠름) ✅
1. 팀 채팅방이나 메시지로 물어보기
2. 질문: "hw_project001 DB 비밀번호가 password 맞나요?"
3. 답변 받으면 바로 `.env` 파일 수정

### 방법 2: 다른 프로젝트 확인
1. 같은 회사/팀의 다른 프로젝트 폴더 열기
2. 그 프로젝트의 `.env` 파일 찾기
3. 같은 서버 주소(3.35.3.225)를 사용하는지 확인
4. 같은 서버면 같은 비밀번호 사용 가능

### 방법 3: 직접 테스트 (비밀번호 모르면 어려움)
서버를 재시작하고 회원가입을 시도하면:
- **성공** → 비밀번호가 맞음 ✅
- **"password authentication failed"** → 비밀번호가 틀림 ❌

## 비밀번호 수정 방법

비밀번호를 알았다면:

1. `backend-teacher/.env` 파일을 메모장으로 엽니다
2. 다음 줄을 찾습니다:
   ```
   DATABASE_PASSWORD=password
   DATABASE_URL=postgresql://postgres:password@3.35.3.225:5432/hw_project001
   ```
3. 두 곳 모두 `password`를 실제 비밀번호로 변경합니다:
   ```
   DATABASE_PASSWORD=실제비밀번호
   DATABASE_URL=postgresql://postgres:실제비밀번호@3.35.3.225:5432/hw_project001
   ```
4. 저장 후 서버 재시작




