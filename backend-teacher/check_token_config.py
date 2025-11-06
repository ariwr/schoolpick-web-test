# 토큰 설정 확인 스크립트
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

print("=" * 60)
print("토큰 설정 확인")
print("=" * 60)
print()
print(f"SECRET_KEY: {settings.SECRET_KEY[:20]}..." if len(settings.SECRET_KEY) > 20 else f"SECRET_KEY: {settings.SECRET_KEY}")
print(f"ALGORITHM: {settings.ALGORITHM}")
print(f"ACCESS_TOKEN_EXPIRE_MINUTES: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}분")
print()
print("=" * 60)
print("토큰 검증 방법")
print("=" * 60)
print()
print("1. 토큰은 JWT 형식입니다 (header.payload.signature)")
print("2. SECRET_KEY로 서명이 검증됩니다")
print("3. 토큰 만료 시간은", settings.ACCESS_TOKEN_EXPIRE_MINUTES, "분입니다")
print("4. 토큰의 'sub' 필드에 이메일이 저장됩니다")
print()
print("문제 해결:")
print("- 토큰이 만료되었으면 재로그인이 필요합니다")
print("- SECRET_KEY가 변경되었으면 모든 토큰이 무효화됩니다")
print("- 토큰 형식이 올바른지 확인하세요 (Bearer {token})")

