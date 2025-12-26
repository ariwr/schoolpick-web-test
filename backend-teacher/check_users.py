from app.database import SessionLocal
from app.models.existing_db import User
import logging

# Disable SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}")
finally:
    db.close()
