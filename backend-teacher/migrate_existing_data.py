from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.existing_db import Department, Subject, Facility, Teacher, User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_data():
    db = SessionLocal()
    try:
        # Get First User or Create Default
        default_user = db.query(User).first()
        if not default_user:
            logger.info("No users found. Creating default 'System Admin' user.")
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            default_user = User(
                email="admin@schoolpick.com",
                password_hash=pwd_context.hash("system_admin_password"),
                name="System Admin",
                user_type="admin"
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            
        user_id = default_user.id
        logger.info(f"Assigning legacy data to User ID {user_id} ({default_user.name})")

        # Update Departments
        count = db.query(Department).filter(Department.user_id == None).update({"user_id": user_id})
        logger.info(f"Updated {count} Departments")

        # Update Subjects
        count = db.query(Subject).filter(Subject.user_id == None).update({"user_id": user_id})
        logger.info(f"Updated {count} Subjects")
        
        # Update Facilities
        count = db.query(Facility).filter(Facility.user_id == None).update({"user_id": user_id})
        logger.info(f"Updated {count} Facilities")
        
        # Update Teachers (Ghost Owners)
        count = db.query(Teacher).filter(Teacher.owner_id == None).update({"owner_id": user_id})
        logger.info(f"Updated {count} Teachers (Owner)")

        db.commit()
        logger.info("Migration completed successfully.")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()
