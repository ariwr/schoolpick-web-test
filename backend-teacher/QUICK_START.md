# ⚡ 빠른 서버 시작 가이드

## 현재 문제
서버가 환경변수 없이 실행되어 데이터베이스 비밀번호를 찾을 수 없습니다.

## 해결 방법

### 방법 1: 환경변수 설정 후 서버 재시작 (가장 빠름) ⭐

1. **현재 서버 중지**: `Ctrl + C`를 눌러 서버를 중지합니다.

2. **환경변수 설정 후 서버 시작**:
   ```powershell
   $env:DATABASE_PASSWORD="!@heart_ware2@!"
   npm run dev
   ```

3. 완료! 이제 회원가입이 정상 작동합니다.

---

### 방법 2: 자동 스크립트 사용

```powershell
npm run dev:setup
```

이 명령어는 자동으로 환경변수를 설정하고 서버를 시작합니다.

---

### 방법 3: start_server.ps1 직접 실행

```powershell
powershell -ExecutionPolicy Bypass -File ./start_server.ps1
```




