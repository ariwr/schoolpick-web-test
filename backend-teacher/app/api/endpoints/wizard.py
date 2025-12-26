from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.existing_db import (
    User, SchoolConfiguration, Department, Subject, 
    TeacherTimeOff, BlockGroupDefinition, Teacher, Facility
)
from app.schemas.wizard import WizardSaveAllRequest, WizardDataResponse, SchoolConfigurationResponse, TeacherTimeOffResponse, BlockGroupDefinitionResponse
from app.api.utils import validate_wizard_data, get_user_records
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/save-all", response_model=WizardDataResponse)
def save_wizard_data(
    data: WizardSaveAllRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save ALL wizard data in a single transaction.
    Replaces existing configuration for the user.
    """
    # 1. Validation
    errors = validate_wizard_data(data.model_dump())
    if errors:
        raise HTTPException(
            status_code=400, 
            detail={"message": "Validation Failed", "errors": errors}
        )
    
    try:
        # Start Transaction (implicit in Session)
        user_id = current_user.id
        
        # 2. Clear existing USER-specific data
        # Note: We delete children first if needed, but CASCADE handles it usually.
        # However, for 'departments', 'subjects', we want to REPLACE them.
        
        # Delete existing config
        db.query(SchoolConfiguration).filter(SchoolConfiguration.user_id == user_id).delete()
        
        # Delete existing TimeOffs
        db.query(TeacherTimeOff).filter(TeacherTimeOff.user_id == user_id).delete()
        
        # Delete existing BlockGroups
        db.query(BlockGroupDefinition).filter(BlockGroupDefinition.user_id == user_id).delete()
        
        # Departments & Subjects: 
        # CAUTION: If we delete departments, we cascade delete subjects?
        # Yes, usually. But we should check if they are used in Schedule/LectureBlocks?
        # If we are in "Setup" phase, it's assumed safe to reset.
        # But if user has generated a schedule, this is dangerous.
        # For now, we assume "Save All" is a Reset/Overwrite operation.
        
        # Delete Departments (this should cascade to Subjects if configured)
        # If not cascaded, we delete subjects first.
        db.query(Subject).filter(Subject.user_id == user_id).delete()
        db.query(Department).filter(Department.user_id == user_id).delete()
        db.query(Facility).filter(Facility.user_id == user_id).delete() # Delete existing facilities
        
        # We generally do NOT delete Teachers, but we might update their Department/Assignment.
        # The payload 'teachers' contains department assignments.
        # If we delete departments, teachers' dep_id becomes null.
        
        # 3. Create New Data
        
        # School Config
        if data.school_config:
            config_dict = data.school_config.model_dump()
            facilities_list = config_dict.pop('facilities', []) # Remove incompatible field
            
            new_config = SchoolConfiguration(**config_dict, user_id=user_id)
            db.add(new_config)
            
        # Facilities from SchoolConfig
        facility_map = {}
        # Use the extracted list instead of accessing data.school_config again, though both work
        if facilities_list: 
            for fac_name in facilities_list:
                new_fac = Facility(
                    name=fac_name,
                    type="SPECIAL", # Assume all wizard facilities are SPECIAL
                    user_id=user_id
                )
                db.add(new_fac)
                db.flush()
                db.refresh(new_fac)
                facility_map[fac_name] = new_fac.id

        # Departments
        dept_map = {} # name -> id
        for dept_data in data.departments:
            # dept_data is dict
            new_dept = Department(
                name=dept_data.get("name"),
                description=dept_data.get("description"),
                user_id=user_id
            )
            db.add(new_dept)
            db.flush() # to get ID
            db.refresh(new_dept)
            dept_map[new_dept.name] = new_dept.id
            
        # Teachers
        for t_data in data.teachers:
            dept_name = t_data.get("department_name") or t_data.get("subjectId") # Frontend might send subjectId as dept name or id
            # Note: Frontend Wizard Store stores 'subjectId' as department ID/Name relation?
            # Actually, Frontend uses 'departmentId' as 'subjectId' for teacher? 
            # In DepartmentTeachersStep, we add teachers TO departments.
            # So we know their department.
            
            # If t_data has 'department_name' (preferred) or we infer from somewhere.
            # Let's assume payload sends 'department_name' or we need to handle 'subjectId' if it matches dept name.
            
            dept_id = dept_map.get(dept_name)
            if not dept_id and t_data.get("subjectId"):
                 dept_id = dept_map.get(t_data.get("subjectId"))

            new_teacher = Teacher(
                name=t_data.get("name"),
                teacher_number=t_data.get("id") or "TEMP", # Wizard uses generic IDs, we might want to store them?
                # or just generate new DB IDs.
                owner_id=user_id,
                department_id=dept_id,
                max_hours_per_week=t_data.get("maxHoursPerWeek", 15),
                is_homeroom_teacher=bool(t_data.get("homeroomClass")),
                is_department_head=t_data.get("isDepartmentHead", False)
                # Add other fields: position, etc.
            )
            db.add(new_teacher)
        
        # Subjects
        for subj_data in data.subjects:
            dept_name = subj_data.get("department_name")
            dept_id = dept_map.get(dept_name)
            
            # Resolve required facility
            req_room_name = subj_data.get("requiredRoom")
            fac_id = facility_map.get(req_room_name)

            new_subj = Subject(
                name=subj_data.get("name"),
                credit_hours=subj_data.get("credit_hours"),
                subject_type=subj_data.get("subject_type", "general"),
                department_id=dept_id,
                required_facility_id=fac_id, # Added constraint
                user_id=user_id
                # Add other fields as needed
            )
            db.add(new_subj)
            
        # Time Offs
        for to in data.teacher_time_offs:
            new_to = TeacherTimeOff(**to.model_dump(), user_id=user_id)
            db.add(new_to)
            
        # Block Groups
        for bg in data.block_groups:
            new_bg = BlockGroupDefinition(**bg.model_dump(), user_id=user_id)
            db.add(new_bg)
            
        db.commit()
        
        # 4. Return Data (Reload from DB to ensure correctness)
        return get_all_wizard_data(db, current_user)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save wizard data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all", response_model=WizardDataResponse)
def get_all_wizard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Load all wizard data for the current user.
    """
    user_id = current_user.id
    
    config = db.query(SchoolConfiguration).filter(SchoolConfiguration.user_id == user_id).first()
    
    departments = get_user_records(db, Department, user_id)
    subjects = get_user_records(db, Subject, user_id)
    time_offs = get_user_records(db, TeacherTimeOff, user_id)
    block_groups = get_user_records(db, BlockGroupDefinition, user_id)
    
    # We need to fetch teachers too if we want to return them?
    # WizardDataResponse has 'teachers' field now.
    # Fetch teachers owned by current user
    teachers = db.query(Teacher).filter(Teacher.owner_id == user_id).all()
    
    teacher_list = []
    for t in teachers:
        # Convert to dict compatible with frontend if needed
        # Frontend expects: { id, name, subjectId (dept), ... }
        t_dict = {
            "id": str(t.id), # Use DB ID? Or preserve original ID if stored? 
            # Ideally key by DB ID.
            "name": t.name,
            "subjectId": t.department.name if t.department else None, # Frontend maps subjectId to Dept Name/ID?
            "maxHoursPerWeek": t.max_hours_per_week,
            # ...
        }
        teacher_list.append(t_dict)
    
    return WizardDataResponse(
        school_config=config,
        departments=[d.__dict__ for d in departments], 
        teachers=teacher_list,
        subjects=[s.__dict__ for s in subjects],
        teacher_time_offs=time_offs,
        block_groups=block_groups
    )
