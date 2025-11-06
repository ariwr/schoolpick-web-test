# students 테이블 구조 확인 스크립트
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import inspect, text

def check_students_table_structure():
    """students 테이블의 실제 구조 확인"""
    db = SessionLocal()
    try:
        # 테이블이 존재하는지 확인
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'students' not in tables:
            print("❌ 'students' 테이블이 존재하지 않습니다.")
            print("\n테이블을 생성해야 합니다.")
            return
        
        print("✅ 'students' 테이블이 존재합니다.")
        print("\n현재 테이블 구조:")
        print("=" * 60)
        
        # 컬럼 정보 가져오기
        columns = inspector.get_columns('students')
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f" DEFAULT {col['default']}" if col['default'] is not None else ""
            print(f"  {col['name']:30} {str(col['type']):20} {nullable}{default}")
        
        print("\n" + "=" * 60)
        
        # 필요한 컬럼이 있는지 확인
        column_names = [col['name'] for col in columns]
        required_columns = ['id', 'student_id', 'name', 'grade', 'class_number', 'student_number', 'homeroom_teacher_id']
        
        print("\n필요한 컬럼 확인:")
        missing_columns = []
        for req_col in required_columns:
            if req_col in column_names:
                print(f"  ✅ {req_col}")
            else:
                print(f"  ❌ {req_col} (없음)")
                missing_columns.append(req_col)
        
        if missing_columns:
            print(f"\n⚠️  누락된 컬럼: {', '.join(missing_columns)}")
            print("\n해결 방법:")
            print("1. 마이그레이션 스크립트 실행")
            print("2. 또는 직접 SQL로 컬럼 추가")
        else:
            print("\n✅ 모든 필요한 컬럼이 존재합니다.")
        
        # 샘플 데이터 확인
        result = db.execute(text("SELECT COUNT(*) FROM students"))
        count = result.scalar()
        print(f"\n현재 students 테이블의 레코드 수: {count}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("students 테이블 구조 확인")
    print("=" * 60)
    print()
    check_students_table_structure()

