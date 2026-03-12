from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SchoolClassBase(BaseModel):
    name: str = Field(..., max_length=50)
    max_students: Optional[int] = 30
    status: Optional[str] = "active"
    
    academic_year_id: int
    grade_level_id: int
    homeroom_teacher_id: Optional[int] = None

class SchoolClassCreate(SchoolClassBase):
    pass

class SchoolClassUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    max_students: Optional[int] = None
    status: Optional[str] = None
    academic_year_id: Optional[int] = None
    grade_level_id: Optional[int] = None
    homeroom_teacher_id: Optional[int] = None

from typing import Optional, List, Any

class SchoolClassResponse(SchoolClassBase):
    id: int
    institution_id: int
    current_students: Optional[int] = 0
    teacher: Optional[Any] = None # Will hold homeroom_teacher basic info
    
    class Config:
        from_attributes = True
