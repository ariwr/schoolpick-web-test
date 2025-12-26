import sys
import os
 
# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.validator import ScheduleValidator
from app.models.existing_db import LectureBlock, LectureGroup, ScheduleMetadata, User, Teacher, Subject
from sqlalchemy.orm import Session
from datetime import date

def verify_validator():
    db = SessionLocal()
    try:
        print("1. Setup Test Data...")
        # Create Dummy User
        user = db.query(User).filter(User.email == "validator_test@test.com").first()
        if not user:
            user = User(email="validator_test@test.com", password_hash="hash", name="Validator Test", user_type="teacher")
            db.add(user)
            db.commit()

        # Create Schedule
        schedule = ScheduleMetadata(version_name="ValidatorTest", is_active=False)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        print(f"   Created Schedule ID: {schedule.id}")

        # Create Teacher & Subject
        teacher = Teacher(name="ValTeacher", teacher_number="VT1", user_id=user.id)
        db.add(teacher)
        subject = Subject(name="ValSubject", user_id=user.id)
        db.add(subject)
        db.commit()
        
        # Create Group
        group = LectureGroup(
            schedule_id=schedule.id,
            subject_id=subject.id,
            teacher_id=teacher.id,
            grade=1,
            total_credits=2,
            user_id=user.id
        )
        db.add(group)
        db.commit()

        # Create Double Booking Blocks
        print("2. Create Double Booking Blocks...")
        b1 = LectureBlock(group_id=group.id, day="MON", period=1)
        b2 = LectureBlock(group_id=group.id, day="MON", period=1) # CONFLICT!
        db.add(b1)
        db.add(b2)
        db.commit()

        # Run Validator
        print("3. Run Validator...")
        validator = ScheduleValidator(db, schedule.id)
        result = validator.validate()

        print(f"   Is Valid: {result.is_valid}")
        print(f"   Errors: {len(result.errors)}")
        for err in result.errors:
            print(f"   - {err['type']}: {err['description']}")

        # Cleanup
        print("4. Cleanup...")
        db.query(LectureBlock).filter(LectureBlock.group_id == group.id).delete()
        db.query(LectureGroup).filter(LectureGroup.id == group.id).delete()
        db.query(ScheduleMetadata).filter(ScheduleMetadata.id == schedule.id).delete()
        # db.query(Teacher).filter(Teacher.id == teacher.id).delete() # Keep teacher/subject/user for simplicity or delete if needed
        db.commit()

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_validator()
