#!/usr/bin/env python3
"""
데이터베이스 연결 테스트 스크립트
EC2 환경에서 데이터베이스 연결 및 스키마 확인
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.database import engine, SessionLocal
from app.config import settings
from app.models.existing_db import User, Teacher

def test_connection():
    """데이터베이스 연결 테스트"""
    print("=" * 60)
    print("🔍 데이터베이스 연결 테스트 시작")
    print("=" * 60)
    
    # 1. 설정 정보 확인
    print("\n📋 데이터베이스 설정 정보:")
    print(f"  - Host: {settings.DATABASE_HOST}")
    print(f"  - Port: {settings.DATABASE_PORT}")
    print(f"  - Database: {settings.DATABASE_NAME}")
    print(f"  - User: {settings.DATABASE_USER}")
    print(f"  - URL: {settings.DATABASE_URL.replace(settings.DATABASE_PASSWORD, '****')}")
    
    # 2. 연결 테스트
    try:
        print("\n🔌 데이터베이스 연결 시도...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ 연결 성공!")
            print(f"  PostgreSQL 버전: {version}")
    except Exception as e:
        print(f"❌ 연결 실패: {str(e)}")
        return False
    
    # 3. 테이블 존재 확인
    print("\n📊 테이블 존재 확인...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required_tables = ['users', 'teachers', 'students']
    print(f"  발견된 테이블: {len(tables)}개")
    for table in required_tables:
        if table in tables:
            print(f"  ✅ {table} 테이블 존재")
        else:
            print(f"  ⚠️  {table} 테이블 없음")
    
    # 4. users 테이블 스키마 확인
    print("\n📋 users 테이블 스키마 확인...")
    try:
        if 'users' in tables:
            columns = inspector.get_columns('users')
            print(f"  컬럼 수: {len(columns)}개")
            for col in columns:
                nullable = "NULL 가능" if col['nullable'] else "NOT NULL"
                print(f"    - {col['name']}: {col['type']} ({nullable})")
    except Exception as e:
        print(f"  ⚠️  스키마 확인 실패: {str(e)}")
    
    # 5. teachers 테이블 스키마 확인
    print("\n📋 teachers 테이블 스키마 확인...")
    try:
        if 'teachers' in tables:
            columns = inspector.get_columns('teachers')
            print(f"  컬럼 수: {len(columns)}개")
            for col in columns:
                nullable = "NULL 가능" if col['nullable'] else "NOT NULL"
                print(f"    - {col['name']}: {col['type']} ({nullable})")
            
            # school_name 컬럼 확인
            has_school_name = any(col['name'] == 'school_name' for col in columns)
            if has_school_name:
                print("  ✅ school_name 컬럼 존재")
            else:
                print("  ⚠️  school_name 컬럼 없음 (마이그레이션 필요할 수 있음)")
    except Exception as e:
        print(f"  ⚠️  스키마 확인 실패: {str(e)}")
    
    # 6. 데이터 조회 테스트
    print("\n📈 데이터 조회 테스트...")
    try:
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            teacher_count = db.query(Teacher).count()
            print(f"  ✅ users 테이블: {user_count}개 레코드")
            print(f"  ✅ teachers 테이블: {teacher_count}개 레코드")
        except Exception as e:
            print(f"  ⚠️  데이터 조회 실패: {str(e)}")
        finally:
            db.close()
    except Exception as e:
        print(f"  ⚠️  세션 생성 실패: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ 테스트 완료")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        test_connection()
    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n\n❌ 예상치 못한 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

