from pydantic import BaseModel
from typing import Optional

class EnrollmentBase(BaseModel):
    student_id: int
    academic_year_id: int
    grade_level_id: int
    status: Optional[str] = "active"

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentUpdate(BaseModel):
    academic_year_id: Optional[int] = None
    grade_level_id: Optional[int] = None
    status: Optional[str] = None

class EnrollmentResponse(EnrollmentBase):
    id: int
    institution_id: int
    
    class Config:
        orm_mode = True
