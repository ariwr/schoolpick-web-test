# OpenAI API 키 설정 가이드

## 방법 1: .env 파일 사용 (권장)

`backend-teacher` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```
OPENAI_API_KEY=your-openai-api-key-here
```

**중요**: `.env` 파일은 Git에 커밋하지 마세요! (이미 .gitignore에 포함되어 있을 것입니다)

## 방법 2: Windows 환경변수 설정

### PowerShell에서 (현재 세션만):
```powershell
$env:OPENAI_API_KEY="your-openai-api-key-here"
```

### 시스템 환경변수로 영구 설정:
1. Windows 검색에서 "환경 변수" 검색
2. "시스템 환경 변수 편집" 선택
3. "환경 변수" 버튼 클릭
4. "새로 만들기" 클릭
5. 변수 이름: `OPENAI_API_KEY`
6. 변수 값: `your-openai-api-key-here`
7. 확인 클릭

## 키 확인 방법

백엔드 서버를 시작한 후, 브라우저에서 다음 URL을 열어 키 상태를 확인할 수 있습니다:

```
http://localhost:8000/check/api-key-status
```

또는 터미널에서:
```bash
curl http://localhost:8000/check/api-key-status
```

## 문제 해결

1. **키가 로드되지 않는 경우**:
   - `.env` 파일이 `backend-teacher` 폴더에 있는지 확인
   - 백엔드 서버를 재시작하세요 (환경변수 변경 후 반드시 재시작 필요)
   - 터미널 로그에서 "환경변수에서 OpenAI API 키를 찾았습니다" 메시지 확인

2. **키 형식 오류**:
   - 키가 `sk-` 또는 `sk-proj-`로 시작하는지 확인
   - 키에 공백이나 따옴표가 포함되지 않았는지 확인

3. **API 호출 실패**:
   - 키가 유효한지 OpenAI 대시보드에서 확인
   - 키에 충분한 크레딧이 있는지 확인
   - 네트워크 연결 확인













