# 서버 시작 스크립트 (가상환경 자동 활성화 및 서버 시작)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "백엔드 서버 시작" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 IP 주소 확인
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*Virtual*"} | Select-Object -First 1).IPAddress
Write-Host "📍 현재 로컬 IP: $localIP" -ForegroundColor Yellow
Write-Host ""

# 가상환경 경로 확인
$venvPath = ".\venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "✅ 가상환경 발견: $venvPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔧 가상환경 활성화 중..." -ForegroundColor Yellow
    
    # 가상환경 활성화
    & $venvPath
    
    # openai 패키지 확인
    Write-Host "📦 openai 패키지 확인 중..." -ForegroundColor Yellow
    $hasOpenAI = & .\venv\Scripts\python.exe -m pip list | Select-String -Pattern "openai"
    if ($hasOpenAI) {
        Write-Host "✅ openai 패키지 설치 확인됨" -ForegroundColor Green
    } else {
        Write-Host "⚠️  openai 패키지가 없습니다. 설치 중..." -ForegroundColor Yellow
        & .\venv\Scripts\python.exe -m pip install openai==1.12.0
    }
    
    Write-Host ""
    Write-Host "🚀 서버 시작 중..." -ForegroundColor Yellow
    Write-Host "📍 서버 주소: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "📍 API 문서: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  참고: 서버를 중지하려면 Ctrl+C를 누르세요" -ForegroundColor Yellow
    Write-Host ""
    
    # 서버 시작 (가상환경의 python 사용)
    & .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Host "❌ 가상환경을 찾을 수 없습니다!" -ForegroundColor Red
    Write-Host "다음 명령어로 가상환경을 생성하세요:" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor White
    Write-Host ""
    exit 1
}
