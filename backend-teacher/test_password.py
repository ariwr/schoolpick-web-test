#!/usr/bin/env python3
"""
데이터베이스 비밀번호 자동 테스트 스크립트
일반적인 비밀번호들을 순서대로 시도합니다.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

# 테스트할 비밀번호 목록 (일반적인 것들 순서대로)
TEST_PASSWORDS = [
    "password",      # 현재 기본값
    "postgres",      # PostgreSQL 기본 사용자명
    "123456",
    "admin",
    "",              # 빈 문자열
    "root",
    "hw_project001", # 데이터베이스 이름
    "schoolpick",
    "Heart_Ware",
]

DATABASE_HOST = "3.35.3.225"
DATABASE_PORT = "5432"
DATABASE_NAME = "hw_project001"
DATABASE_USER = "postgres"

def test_password(password):
    """특정 비밀번호로 연결 테스트"""
    try:
        url = f"postgresql://{DATABASE_USER}:{password}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
        engine = create_engine(url, connect_args={"connect_timeout": 3})
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        return True, None
    except Exception as e:
        error_msg = str(e).lower()
        if "password authentication failed" in error_msg:
            return False, "비밀번호 오류"
        elif "timeout" in error_msg:
            return False, "연결 타임아웃"
        else:
            return False, str(e)[:100]

def main():
    print("=" * 60)
    print("🔍 데이터베이스 비밀번호 자동 테스트")
    print("=" * 60)
    print(f"\n테스트할 비밀번호: {len(TEST_PASSWORDS)}개")
    print(f"서버: {DATABASE_HOST}:{DATABASE_PORT}")
    print(f"데이터베이스: {DATABASE_NAME}")
    print(f"사용자: {DATABASE_USER}\n")
    print("-" * 60)
    
    found = False
    for i, password in enumerate(TEST_PASSWORDS, 1):
        display_password = password if password else "(빈 문자열)"
        print(f"[{i}/{len(TEST_PASSWORDS)}] '{display_password}' 테스트 중...", end=" ")
        
        success, error = test_password(password)
        if success:
            print("✅ 성공!")
            print("\n" + "=" * 60)
            print("🎉 비밀번호를 찾았습니다!")
            print("=" * 60)
            print(f"\n✅ 비밀번호: {password if password else '(빈 문자열)'}")
            print("\n다음 단계:")
            print("1. PowerShell에서 다음 명령어 실행:")
            if password:
                print(f'   $env:DATABASE_PASSWORD="{password}"')
                print(f'   $env:DATABASE_URL="postgresql://postgres:{password}@3.35.3.225:5432/hw_project001"')
            else:
                print('   $env:DATABASE_PASSWORD=""')
                print('   $env:DATABASE_URL="postgresql://postgres:@3.35.3.225:5432/hw_project001"')
            print("\n2. 같은 PowerShell 창에서 서버 실행:")
            print("   npm run dev")
            print("\n3. 또는 .env 파일에 추가:")
            print(f"   DATABASE_PASSWORD={password if password else ''}")
            print(f"   DATABASE_URL=postgresql://postgres:{password if password else ''}@3.35.3.225:5432/hw_project001")
            found = True
            break
        else:
            print(f"❌ 실패 ({error})")
    
    if not found:
        print("\n" + "=" * 60)
        print("❌ 일반적인 비밀번호로는 연결할 수 없습니다.")
        print("=" * 60)
        print("\n다음 방법을 시도해보세요:")
        print("1. 팀원이나 데이터베이스 관리자에게 비밀번호 문의")
        print("2. 다른 프로젝트의 .env 파일 확인")
        print("3. 서버 관리자에게 문의")
        print("\n비밀번호를 알았다면:")
        print('   $env:DATABASE_PASSWORD="실제비밀번호"')
        print('   $env:DATABASE_URL="postgresql://postgres:실제비밀번호@3.35.3.225:5432/hw_project001"')
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n\n❌ 예상치 못한 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)







