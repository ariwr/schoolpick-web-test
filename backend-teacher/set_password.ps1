# 데이터베이스 비밀번호 환경변수 설정 스크립트
# 이 스크립트를 실행하면 현재 PowerShell 세션에서만 환경변수가 설정됩니다.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "데이터베이스 비밀번호 환경변수 설정" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 비밀번호 입력받기
$password = Read-Host "데이터베이스 비밀번호를 입력하세요"

if ($password -eq "") {
    Write-Host "❌ 비밀번호가 입력되지 않았습니다." -ForegroundColor Red
    exit 1
}

# 환경변수 설정
$env:DATABASE_PASSWORD = $password
$env:DATABASE_URL = "postgresql://postgres:$password@3.35.3.225:5432/hw_project001"

Write-Host ""
Write-Host "✅ 환경변수 설정 완료!" -ForegroundColor Green
Write-Host "   DATABASE_PASSWORD=$password" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  주의: 이 설정은 현재 PowerShell 창에서만 유효합니다." -ForegroundColor Yellow
Write-Host "   서버를 실행하려면 이 창에서 'npm run dev'를 실행하세요." -ForegroundColor Yellow
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "1. 이 PowerShell 창에서 'npm run dev' 실행" -ForegroundColor White
Write-Host "2. 또는 다른 PowerShell 창에서 다음 명령어 실행:" -ForegroundColor White
Write-Host "   `$env:DATABASE_PASSWORD='$password'" -ForegroundColor Gray
Write-Host "   `$env:DATABASE_URL='postgresql://postgres:$password@3.35.3.225:5432/hw_project001'" -ForegroundColor Gray
Write-Host ""



















