# OpenAI API 키 설정 가이드

세특 검열 기능을 사용하려면 OpenAI API 키가 필요합니다.

## 1. OpenAI API 키 발급하기

1. [OpenAI 웹사이트](https://platform.openai.com/)에 접속
2. 회원가입 또는 로그인
3. 왼쪽 메뉴에서 **"API keys"** 클릭
4. **"+ Create new secret key"** 버튼 클릭
5. 키 이름을 입력하고 생성
6. **중요**: 생성된 API 키를 복사해두세요 (다시 볼 수 없습니다!)

## 2. Windows에서 환경변수 설정하기

### 방법 1: .env 파일 사용 (권장)

1. `backend-teacher` 폴더로 이동
2. `env.example` 파일을 복사하여 `.env` 파일 생성
3. `.env` 파일을 텍스트 에디터로 열기
4. 다음 줄을 찾아서 실제 API 키로 변경:

```env
OPENAI_API_KEY=your-openai-api-key-here
```

예시:
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

5. 파일 저장

### 방법 2: PowerShell에서 직접 설정 (현재 세션만 유지)

```powershell
cd backend-teacher
$env:OPENAI_API_KEY = "your-actual-api-key-here"
```

### 방법 3: 시스템 환경변수로 설정 (영구적)

1. Windows 검색창에서 "환경 변수" 검색
2. **"시스템 환경 변수 편집"** 클릭
3. **"환경 변수"** 버튼 클릭
4. **"새로 만들기"** 클릭
5. 변수 이름: `OPENAI_API_KEY`
6. 변수 값: 실제 API 키 입력
7. 확인 클릭

## 3. 설정 확인하기

백엔드 서버를 시작한 후, 터미널에 다음과 같은 메시지가 없어야 합니다:
```
Warning: OPENAI_API_KEY가 설정되지 않았습니다. 세특 검열 기능을 사용하려면 환경변수를 설정하세요.
```

## 4. 테스트하기

1. 백엔드 서버 실행
2. 프론트엔드에서 세특 작성 페이지로 이동
3. 세특을 작성하고 "세특 검열" 버튼 클릭
4. "검열하기" 버튼을 클릭하여 검열 기능이 정상 작동하는지 확인

## 주의사항

- **API 키는 절대 공개하지 마세요!**
- `.env` 파일은 `.gitignore`에 포함되어 있는지 확인하세요
- API 키를 Git에 커밋하지 마세요
- OpenAI API는 사용량에 따라 요금이 발생합니다 (gpt-4o-mini 모델 사용)
- 월별 사용량 제한을 설정하는 것을 권장합니다

## 비용 관련 정보

- gpt-4o-mini 모델은 상대적으로 저렴합니다
- 약 1,000 토큰당 $0.15 정도 소요됩니다
- 세특 검열 1회당 약 500-2000 토큰 정도 사용됩니다

