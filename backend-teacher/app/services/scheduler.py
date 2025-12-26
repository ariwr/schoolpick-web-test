from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.existing_db import (
    LectureBlock, LectureGroup, TeacherTimeOff, 
    SchoolConfiguration, ScheduleMetadata,
    Teacher, Subject
)
import random

class AutoScheduler:
    def __init__(self, db: Session, schedule_id: int, user_id: int):
        self.db = db
        self.schedule_id = schedule_id
        self.user_id = user_id
        self.errors = []
        
        # Load constraints variables
        self.teacher_busy: Set[Tuple[int, str, int]] = set() # (teacher_id, day, period)
        self.class_busy: Set[Tuple[int, int, str, int]] = set() # (grade, class_num, day, period)
        self.room_busy: Set[Tuple[int, str, int]] = set() # (room_id, day, period)
        
        self.valid_days = ["MON", "TUE", "WED", "THU", "FRI"]
        self.valid_periods = list(range(1, 8)) # Default 1-7
        
        self.created_blocks: List[LectureBlock] = []

    def schedule(self) -> List[LectureBlock]:
        # 1. Initialize State
        self._load_configuration()
        self._load_existing_state()
        
        # 2. Identify Tasks (Blocks needed)
        # Find groups that need scheduling (unassigned or partially assigned)
        groups = self._load_groups_to_schedule()
        
        tasks = [] # List of (group, block_index)
        for g in groups:
            # Check how many periods already assigned
            current_count = self.db.query(LectureBlock).filter(LectureBlock.group_id == g.id).count()
            needed = g.total_credits - current_count
            
            if needed > 0:
                for _ in range(needed):
                    tasks.append(g)
        
        # Sort tasks? (Heuristic: Most constrained first could be better, but simple sort by teacher constraint might suffice)
        # Random shuffle sometimes helps avoid bad patterns in simple greedy
        # tasks.sort(key=lambda g: g.teacher_id) 
        
        # 3. Solve
        success = self._backtrack(tasks, 0)
        
        if not success:
            raise Exception("Could not find a valid schedule for all blocks.")
            
        return self.created_blocks

    def _load_configuration(self):
        config = self.db.query(SchoolConfiguration).filter(SchoolConfiguration.user_id == self.user_id).first()
        if config:
            self.valid_periods = list(range(1, config.periods_per_day + 1))
            self.valid_days = ["MON", "TUE", "WED", "THU", "FRI"][:config.days_per_week]

    def _load_existing_state(self):
        # Time Offs
        time_offs = self.db.query(TeacherTimeOff).filter(TeacherTimeOff.user_id == self.user_id).all()
        for to in time_offs:
            self.teacher_busy.add((to.teacher_id, to.day, to.period))
            
        # Existing Blocks (in this schedule)
        # Note: We assume we are filling GAPS. 
        # If we wanted to "Reschedule All", we should delete existing blocks clearly before calling this.
        blocks = self.db.query(LectureBlock).join(LectureGroup).filter(LectureGroup.schedule_id == self.schedule_id).all()
        
        for b in blocks:
            self._mark_busy(b.group, b.day, b.period, b.room_id)

    def _mark_busy(self, group: LectureGroup, day: str, period: int, room_id: Optional[int]):
        self.teacher_busy.add((group.teacher_id, day, period))
        if group.class_num:
            self.class_busy.add((group.grade, group.class_num, day, period))
        
        if room_id:
            self.room_busy.add((room_id, day, period))

    def _unmark_busy(self, group: LectureGroup, day: str, period: int, room_id: Optional[int]):
        self.teacher_busy.discard((group.teacher_id, day, period))
        if group.class_num:
            self.class_busy.discard((group.grade, group.class_num, day, period))
        
        if room_id:
            self.room_busy.discard((room_id, day, period))

    def _is_valid(self, group: LectureGroup, day: str, period: int, room_id: Optional[int]) -> bool:
        # Teacher check (TimeOff + Collision)
        if (group.teacher_id, day, period) in self.teacher_busy:
            return False
            
        # Student Class check (Collision)
        if group.class_num:
            if (group.grade, group.class_num, day, period) in self.class_busy:
                return False
                
        # Room check (Collision)
        if room_id:
            if (room_id, day, period) in self.room_busy:
                return False
        
        return True

    def _backtrack(self, tasks: List[LectureGroup], index: int) -> bool:
        if index >= len(tasks):
            return True
            
        group = tasks[index]
        
        # Try all slots
        # Optimization: Shuffle slots or pick intelligently
        slots = [(d, p) for d in self.valid_days for p in self.valid_periods]
        # random.shuffle(slots) # Randomness helps if stuck
        
        # Filter for "required room"
        # Since LectureGroup itself doesn't typically carry room_id directly in our simplified schema unless mapped?
        # Ah, Subject has required_facility_id!
        # And LectureBlock has room_id.
        # We need to assign room_id if subject requires it.
        
        required_room_id = group.subject.required_facility_id if group.subject else None
                
        for day, period in slots:
            if self._is_valid(group, day, period, required_room_id):
                # Assign
                self._mark_busy(group, day, period, required_room_id)
                new_block = LectureBlock(
                    group_id=group.id,
                    day=day,
                    period=period,
                    room_id=required_room_id,
                    is_fixed=False
                )
                self.created_blocks.append(new_block)
                
                # Recurse
                if self._backtrack(tasks, index + 1):
                    return True
                
                # Backtrack
                self.created_blocks.pop()
                self._unmark_busy(group, day, period, required_room_id)
                
        return False

    def _load_groups_to_schedule(self) -> List[LectureGroup]:
        return self.db.query(LectureGroup).filter(
            LectureGroup.schedule_id == self.schedule_id,
        ).all()
