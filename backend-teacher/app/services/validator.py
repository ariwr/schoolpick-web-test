from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.existing_db import LectureBlock, TeacherTimeOff, ScheduleConstraint, LectureGroup
from dataclasses import dataclass

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[Dict[str, Any]] # {"type": "DOUBLE_BOOKING", "desc": "...", "block_id": ...}

class ScheduleValidator:
    def __init__(self, db: Session, schedule_id: int):
        self.db = db
        self.schedule_id = schedule_id
        self.errors = []

    def validate(self) -> ValidationResult:
        # 1. Load Data
        blocks = self._load_blocks()
        time_offs = self._load_time_offs()
        
        # 2. Check Double Bookings (Teacher & Room)
        self._check_double_bookings(blocks)
        
        # 3. Check Constraints (Time Off)
        self._check_time_offs(blocks, time_offs)
        
        return ValidationResult(
            is_valid=len(self.errors) == 0,
            errors=self.errors
        )

    def _load_blocks(self):
        return self.db.query(LectureBlock).join(LectureGroup).filter(
            LectureGroup.schedule_id == self.schedule_id
        ).all()

    def _load_time_offs(self):
        # Need to filter by user/owner of the schedule?
        # Assuming schedule -> user -> time_offs mapping is consistent
        # For now, load all relevant time offs for teachers involved in the schedule
        return self.db.query(TeacherTimeOff).all() # Should optimize to filter by teacher_ids in schedule

    def _check_double_bookings(self, blocks: List[LectureBlock]):
        teacher_schedule = {} # (day, period, teacher_id) -> block
        room_schedule = {}    # (day, period, room_id) -> block

        for block in blocks:
            # Teacher Collision
            t_key = (block.day, block.period, block.group.teacher_id)
            if t_key in teacher_schedule:
                self.errors.append({
                    "type": "DOUBLE_BOOKING_TEACHER",
                    "description": f"Teacher {block.group.teacher_id} is double booked at {block.day} period {block.period}",
                    "teacher_id": block.group.teacher_id,
                    "day": block.day,
                    "period": block.period,
                    "block_ids": [teacher_schedule[t_key].id, block.id]
                })
            else:
                teacher_schedule[t_key] = block

            # Room Collision
            if block.room_id:
                r_key = (block.day, block.period, block.room_id)
                if r_key in room_schedule:
                    self.errors.append({
                        "type": "DOUBLE_BOOKING_ROOM",
                        "description": f"Room {block.room_id} is double booked at {block.day} period {block.period}",
                        "room_id": block.room_id,
                        "day": block.day,
                        "period": block.period,
                        "block_ids": [room_schedule[r_key].id, block.id]
                    })
                else:
                    room_schedule[r_key] = block

    def _check_time_offs(self, blocks: List[LectureBlock], time_offs: List[TeacherTimeOff]):
        # Index time offs
        off_map = {} # (teacher_id, day, period) -> reason
        for to in time_offs:
            off_map[(to.teacher_id, to.day, to.period)] = to.reason

        for block in blocks:
            key = (block.group.teacher_id, block.day, block.period)
            if key in off_map:
                self.errors.append({
                    "type": "CONSTRAINT_VIOLATION_TIME_OFF",
                    "description": f"Teacher {block.group.teacher_id} has time off at {block.day} period {block.period} ({off_map[key]})",
                    "teacher_id": block.group.teacher_id,
                    "day": block.day,
                    "period": block.period,
                    "reason": off_map[key]
                })
