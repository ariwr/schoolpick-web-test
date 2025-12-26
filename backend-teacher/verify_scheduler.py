import sys
import os
 
# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.scheduler import AutoScheduler
from app.models.existing_db import LectureBlock, LectureGroup, ScheduleMetadata, User, Teacher, Subject, SchoolConfiguration
from sqlalchemy.orm import Session

def verify_scheduler():
    db = SessionLocal()
    try:
        print("1. Setup Test Data...")
        # Create Dummy User
        user = db.query(User).filter(User.email == "scheduler_test@test.com").first()
        if not user:
            user = User(email="scheduler_test@test.com", password_hash="hash", name="Scheduler Test", user_type="teacher")
            db.add(user)
            db.commit()

        # Create School Config
        config = db.query(SchoolConfiguration).filter(SchoolConfiguration.user_id == user.id).first()
        if not config:
            config = SchoolConfiguration(user_id=user.id, school_name="Scheduler School", days_per_week=5, periods_per_day=7)
            db.add(config)
            db.commit()

        # Create Schedule
        schedule = ScheduleMetadata(version_name="SchedulerTest", is_active=False)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        # Create Teachers
        t1 = Teacher(name="T1", teacher_number="ST1", user_id=user.id)
        t2 = Teacher(name="T2", teacher_number="ST2", user_id=user.id)
        db.add(t1)
        db.add(t2)
        
        # Create Subjects
        s1 = Subject(name="Math", user_id=user.id)
        s2 = Subject(name="English", user_id=user.id)
        db.add(s1)
        db.add(s2)
        
        db.commit()

        # Create Groups (Tasks)
        # T1 needs 4 blocks of Math for Grade 1
        g1 = LectureGroup(schedule_id=schedule.id, subject_id=s1.id, teacher_id=t1.id, grade=1, total_credits=4, user_id=user.id)
        # T2 needs 3 blocks of English for Grade 1 (Same grade! Should not overlap if we had class constraints, but here grade+class)
        # Let's say same class 1-1
        g2 = LectureGroup(schedule_id=schedule.id, subject_id=s2.id, teacher_id=t2.id, grade=1, class_num=1, total_credits=3, user_id=user.id)
        
        # T1 needs 2 blocks of Math for Grade 2 (T1 constraint: can't be at same time as G1 blocks)
        g3 = LectureGroup(schedule_id=schedule.id, subject_id=s1.id, teacher_id=t1.id, grade=2, total_credits=2, user_id=user.id)
        
        db.add(g1)
        db.add(g2)
        db.add(g3)
        db.commit()
        
        print("2. Run Scheduler...")
        scheduler = AutoScheduler(db, schedule.id, user.id)
        blocks = scheduler.schedule()
        
        print(f"   Success! Created {len(blocks)} blocks.")
        
        # Verify
        print("3. Verify Blocks...")
        for b in blocks:
            print(f"   - Group {b.group_id} at {b.day} {b.period}")
            
        # Basic check
        if len(blocks) != (4 + 3 + 2):
            print("   FAIL: Count mismatch")
        else:
            print("   PASS: Block count matches")

        # Cleanup
        print("4. Cleanup...")
        db.query(LectureBlock).join(LectureGroup).filter(LectureGroup.schedule_id == schedule.id).delete()
        db.query(LectureGroup).filter(LectureGroup.schedule_id == schedule.id).delete()
        db.query(ScheduleMetadata).filter(ScheduleMetadata.id == schedule.id).delete()
        db.query(SchoolConfiguration).filter(SchoolConfiguration.id == config.id).delete()
        # db.query(Teacher).filter(Teacher.id.in_([t1.id, t2.id])).delete()
        db.commit()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_scheduler()
