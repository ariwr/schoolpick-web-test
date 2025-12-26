from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Department ---
class DepartmentBase(BaseModel):
    name: str # 국어과
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Facility ---
class FacilityBase(BaseModel):
    name: str # 음악실
    type: str = "NORMAL" # SPECIAL, NORMAL
    capacity: int = 30
    description: Optional[str] = None

class FacilityCreate(FacilityBase):
    pass

class Facility(FacilityBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Teacher Update Schema ---
class TeacherDescUpdate(BaseModel):
    department_id: Optional[int] = None
    max_hours_per_week: Optional[int] = None
    position: Optional[str] = None

class TeacherResponse(BaseModel):
    id: int
    teacher_number: str
    name: Optional[str] = None # From User relation? Complex.
    department_id: Optional[int]
    max_hours_per_week: int
    
    class Config:
        from_attributes = True

# --- Subject Update Schema ---
class SubjectDescUpdate(BaseModel):
    department_id: Optional[int] = None
    required_hours: Optional[int] = None
    target_grade: Optional[int] = None
    category: Optional[str] = None

class SubjectResponse(BaseModel):
    id: int
    name: Optional[str] = None
    department_id: Optional[int]
    required_hours: int
    target_grade: Optional[int]
    category: Optional[str]
    
    class Config:
        from_attributes = True
