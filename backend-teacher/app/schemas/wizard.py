from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.school_data import DepartmentCreate, SubjectCreate

class BaseWizardModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# School Configuration
class SchoolConfigurationBase(BaseWizardModel):
    school_name: str
    total_grades: int = 3
    periods_per_day: int = 7
    days_per_week: int = 5
    lunch_period: Optional[int] = None
    facilities: List[str] = [] # Added facilities list (names)

class SchoolConfigurationCreate(SchoolConfigurationBase):
    pass

class SchoolConfigurationResponse(SchoolConfigurationBase):
    id: int
    user_id: int

# Teacher Time-Off
class TeacherTimeOffBase(BaseWizardModel):
    teacher_id: int
    day: str
    period: int
    reason: Optional[str] = None

class TeacherTimeOffCreate(TeacherTimeOffBase):
    pass

class TeacherTimeOffResponse(TeacherTimeOffBase):
    id: int
    user_id: int

# Block Group
class BlockGroupDefinitionBase(BaseWizardModel):
    name: str
    days: List[str]
    periods: List[int]

class BlockGroupDefinitionCreate(BlockGroupDefinitionBase):
    pass

class BlockGroupDefinitionResponse(BlockGroupDefinitionBase):
    id: int
    user_id: int

# Save All Request
class WizardSaveAllRequest(BaseModel):
    school_config: SchoolConfigurationCreate
    departments: List[dict] 
    teachers: List[dict] # Added teachers
    subjects: List[dict]
    teacher_time_offs: List[TeacherTimeOffCreate]
    block_groups: List[BlockGroupDefinitionCreate]

# Complete Data Response
class WizardDataResponse(BaseModel):
    school_config: Optional[SchoolConfigurationResponse]
    departments: List[dict]
    teachers: List[dict] # Added teachers
    subjects: List[dict]
    teacher_time_offs: List[TeacherTimeOffResponse]
    block_groups: List[BlockGroupDefinitionResponse]
