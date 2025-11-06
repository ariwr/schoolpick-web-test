# 데이터베이스 연결 설정 가이드

## 중요: DATABASE_PASSWORD 설명

`DATABASE_PASSWORD`는 **데이터베이스 서버 접속 비밀번호**입니다. 
- 데이터베이스 서버(PostgreSQL)에 접속하기 위한 인증 정보
- 애플리케이션이 데이터베이스에 연결할 때 사용
- **하나만 있으면 됩니다** (서버당 하나의 비밀번호)

회원가입하는 교사들의 비밀번호는 별도로 데이터베이스에 저장됩니다.

## 설정 방법

### 방법 1: .env 파일 사용 (권장 - 로컬 개발)

1. `backend-teacher/.env` 파일 생성
2. 다음 내용 입력:

```env
DATABASE_PASSWORD=실제비밀번호
DATABASE_URL=postgresql://postgres:실제비밀번호@3.35.3.225:5432/hw_project001
```

### 방법 2: PowerShell 환경변수 설정 (현재 세션만)

PowerShell에서 실행:

```powershell
$env:DATABASE_PASSWORD="실제비밀번호"
$env:DATABASE_URL="postgresql://postgres:실제비밀번호@3.35.3.225:5432/hw_project001"
```

주의: 이 방법은 PowerShell 창을 닫으면 사라집니다.

### 방법 3: 시스템 환경변수 설정 (영구적)

Windows 환경변수에 직접 설정:
1. Windows 검색에서 "환경 변수" 검색
2. "시스템 환경 변수 편집" 선택
3. "환경 변수" 버튼 클릭
4. "새로 만들기"로 다음 변수 추가:
   - 변수 이름: `DATABASE_PASSWORD`
   - 변수 값: 실제 비밀번호

### 방법 4: 비밀번호 입력 프롬프트 사용 (보안상 권장)

애플리케이션 시작 시 비밀번호를 입력하도록 할 수 있습니다.

## 비밀번호 확인 방법

1. 데이터베이스 관리자에게 문의
2. 서버 관리자에게 문의
3. 다른 프로젝트의 설정 파일 확인
4. 데이터베이스 서버에 직접 접속해서 확인

## 연결 테스트

비밀번호 설정 후 테스트:

```bash
python test_db_connection.py
```




