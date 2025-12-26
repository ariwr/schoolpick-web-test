from sqlalchemy.orm import Session
from typing import Type, TypeVar, List, Optional
from app.models.existing_db import User

T = TypeVar("T")

def get_user_records(db: Session, model: Type[T], user_id: int) -> List[T]:
    """
    Retrieve all records of a specific model for a given user.
    Assumes the model has a 'user_id' column.
    """
    return db.query(model).filter(model.user_id == user_id).all()

def validate_wizard_data(data: dict) -> List[str]:
    """
    Validate wizard data for mathematical feasibility.
    Returns a list of error messages. If empty, data is valid.
    
    Checks:
    1. Teacher Time-Offs do not exceed total working hours (sanity check).
    2. Basic integrity checks.
    
    Future:
    - Check Total Required Hours vs Total Teacher Capacity (needs class counts).
    """
    errors = []
    
    # Example Check: Teacher Time-Offs
    # If a teacher has blocked ALL slots, they cannot teach.
    # We need to know total slots = days_per_week * periods_per_day
    
    school_config = data.get("school_config")
    time_offs = data.get("teacher_time_offs", [])
    
    if school_config:
        # Convert Pydantic model to dict if needed, or access attrs
        # Assuming data['school_config'] is a Pydantic object or dict
        if hasattr(school_config, "days_per_week"):
            total_slots = school_config.days_per_week * school_config.periods_per_day
            
            # Group time-offs by teacher
            teacher_blocked_counts = {}
            for to in time_offs:
                tid = to.teacher_id
                teacher_blocked_counts[tid] = teacher_blocked_counts.get(tid, 0) + 1
            
            for tid, count in teacher_blocked_counts.items():
                if count >= total_slots:
                    errors.append(f"Teacher {tid} has blocked ALL {total_slots} slots.")
    
    return errors
