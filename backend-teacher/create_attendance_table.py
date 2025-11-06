# attendance 테이블 생성 스크립트
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import text

def create_attendance_table():
    """attendance 테이블 생성"""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("attendance 테이블 생성")
        print("=" * 60)
        print()
        
        # SQL 파일 읽기
        sql_file_path = os.path.join(os.path.dirname(__file__), 'migrations', 'create_attendance_table.sql')
        
        if not os.path.exists(sql_file_path):
            print(f"❌ SQL 파일을 찾을 수 없습니다: {sql_file_path}")
            return False
        
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # SQL 실행
        print("테이블 생성 중...")
        db.execute(text(sql_content))
        db.commit()
        
        print("✅ attendance 테이블이 성공적으로 생성되었습니다.")
        print()
        
        # 테이블 구조 확인
        from sqlalchemy import inspect
        inspector = inspect(engine)
        columns = inspector.get_columns('attendance')
        
        print("생성된 테이블 구조:")
        print("=" * 60)
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            print(f"  {col['name']:30} {str(col['type']):20} {nullable}")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    create_attendance_table()

