# 간단한 서버 시작 스크립트 (가상환경 없이)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "백엔드 서버 시작 (전역 Python 환경)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 Python 경로 확인
$pythonPath = (Get-Command python).Source
Write-Host "📍 사용 중인 Python: $pythonPath" -ForegroundColor Yellow

# openai 패키지 확인
Write-Host "📦 openai 패키지 확인 중..." -ForegroundColor Yellow
$hasOpenAI = python -m pip list | Select-String -Pattern "openai"
if ($hasOpenAI) {
    Write-Host "✅ openai 패키지 설치 확인됨" -ForegroundColor Green
} else {
    Write-Host "⚠️  openai 패키지가 없습니다. 설치 중..." -ForegroundColor Yellow
    python -m pip install openai==1.12.0
}

Write-Host ""
Write-Host "🚀 서버 시작 중..." -ForegroundColor Yellow
Write-Host "📍 서버 주소: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 API 문서: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  참고: 서버를 중지하려면 Ctrl+C를 누르세요" -ForegroundColor Yellow
Write-Host ""

# 서버 시작
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

