from pydantic import BaseModel
from typing import Optional
from datetime import time

class TimetableBase(BaseModel):
    day_of_week: str  # Dushanba, Seshanba, Chorshanba, Payshanba, Juma, Shanba
    start_time: time
    end_time: time
    room_number: Optional[str] = None
    
    school_class_id: int
    subject_id: int
    teacher_id: int

class TimetableCreate(TimetableBase):
    pass

class TimetableUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room_number: Optional[str] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None

class TimetableResponse(TimetableBase):
    id: int
    institution_id: int
    
    # We can nest some basic info here for the frontend
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True
