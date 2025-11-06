# location_settings 테이블 구조 확인 스크립트
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import inspect, text

def check_location_settings_table_structure():
    """location_settings 테이블의 실제 구조 확인"""
    db = SessionLocal()
    try:
        # 테이블이 존재하는지 확인
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'location_settings' not in tables:
            print("❌ 'location_settings' 테이블이 존재하지 않습니다.")
            print("\n테이블을 생성해야 합니다.")
            return False
        
        print("✅ 'location_settings' 테이블이 존재합니다.")
        print("\n현재 테이블 구조:")
        print("=" * 60)
        
        # 컬럼 정보 가져오기
        columns = inspector.get_columns('location_settings')
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f" DEFAULT {col['default']}" if col['default'] is not None else ""
            print(f"  {col['name']:30} {str(col['type']):20} {nullable}{default}")
        
        print("\n" + "=" * 60)
        
        # 샘플 데이터 확인
        result = db.execute(text("SELECT COUNT(*) FROM location_settings"))
        count = result.scalar()
        print(f"\n현재 location_settings 테이블의 레코드 수: {count}")
        
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("location_settings 테이블 구조 확인")
    print("=" * 60)
    print()
    check_location_settings_table_structure()
