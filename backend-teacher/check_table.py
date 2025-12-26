"""
Check existing schedule_metadata table structure
"""
from app.database import engine
from sqlalchemy import text, inspect

# Get table info
inspector = inspect(engine)

if 'schedule_metadata' in inspector.get_table_names():
    print("✅ Table 'schedule_metadata' exists")
    print("\nColumns:")
    for column in inspector.get_columns('schedule_metadata'):
        print(f"  - {column['name']}: {column['type']} (nullable={column['nullable']})")
else:
    print("❌ Table 'schedule_metadata' does not exist")
