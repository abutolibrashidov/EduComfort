from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time, datetime

__all__ = ['GroupMini', 'GroupCreate', 'GroupUpdate', 'GroupRead']


class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    subject_id: int
    teacher_id: int
    branch_id: int
    level: str  # beginner, elementary, etc.
    days_of_week: Optional[str] = None  # "Mon,Wed,Fri"
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_students: int = 12


class GroupCreate(GroupBase):
    status: str = "upcoming"
    is_active: bool = True


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    branch_id: Optional[int] = None
    level: Optional[str] = None
    status: Optional[str] = None
    days_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None


# Mini schemas for relations
class SubjectMini(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TeacherMini(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]

    class Config:
        from_attributes = True


class BranchMini(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class GroupMini(BaseModel):
    id: int
    name: str
    subject_id: int
    level: str
    status: str

    class Config:
        from_attributes = True


# Response schema
class GroupRead(BaseModel):
    id: int
    name: str
    subject_id: int
    teacher_id: int
    branch_id: int
    level: str
    status: str
    max_students: int
    current_students: int
    days_of_week: Optional[str]
    start_time: Optional[time]
    end_time: Optional[time]
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool
    created_at: datetime
    
    # Relations
    subject: Optional[SubjectMini] = None
    teacher: Optional[TeacherMini] = None
    branch: Optional[BranchMini] = None

    class Config:
        from_attributes = True


# List item (lighter version)
class GroupListItem(BaseModel):
    id: int
    name: str
    subject_id: int
    teacher_id: int
    branch_id: int
    level: str
    status: str
    current_students: int
    max_students: int
    days_of_week: Optional[str]
    start_time: Optional[time]

    class Config:
        from_attributes = True