from typing import List, Optional
from pydantic import BaseModel, Field

# --- Validation Response ---
# --- Validation Response ---
class ValidationError(BaseModel):
    type: str
    description: str
    block_ids: Optional[List[int]] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    day: Optional[str] = None
    period: Optional[int] = None
    reason: Optional[str] = None

class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[ValidationError] = []   # Detailed Errors
    warnings: List[str] = [] # Soft constraints (advisory)

# --- Lecture Block Schemas ---
class LectureBlockBase(BaseModel):
    day: str # MON, TUE, WED, THU, FRI
    period: int
    room_id: Optional[int] = None
    is_fixed: bool = False

class LectureBlockCreate(LectureBlockBase):
    group_id: int

class LectureBlockUpdate(LectureBlockBase):
    pass

class LectureBlockResponse(LectureBlockBase):
    id: int
    group_id: int

    class Config:
        from_attributes = True

# --- Lecture Group Schemas ---
class LectureGroupBase(BaseModel):
    subject_id: int
    teacher_id: int
    grade: int
    class_num: Optional[int] = None
    total_credits: int
    slicing_option: Optional[str] = None
    neis_class_code: Optional[str] = None
    student_count: Optional[int] = None

class LectureGroupCreate(LectureGroupBase):
    schedule_id: int

class LectureGroupResponse(LectureGroupBase):
    id: int
    schedule_id: int


    class Config:
        from_attributes = True

class LectureGroupCreateBatch(BaseModel):
    schedule_id: int
    groups: List[LectureGroupBase]

# --- Schedule Metadata Schemas ---
class ScheduleMetadataBase(BaseModel):
    version_name: str
    description: Optional[str] = None
    is_active: bool = False
    is_published: bool = False

class ScheduleMetadataCreate(ScheduleMetadataBase):
    pass

class ScheduleMetadataResponse(ScheduleMetadataBase):
    id: int
    
    class Config:
        from_attributes = True
