from sqlalchemy import create_engine, inspect
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)

connection_string = settings.DATABASE_URL.replace("psycopg2", "") # ensure driver match if needed, but settings.DATABASE_URL is string
print(f"Connecting to DB...")

engine = create_engine(settings.DATABASE_URL)
insp = inspect(engine)

table_name = "teacher_timetables"
print(f"--- Check Constraints for {table_name} ---")
try:
    constraints = insp.get_check_constraints(table_name)
    for cc in constraints:
        print(cc)
except Exception as e:
    print(f"Error: {e}")
