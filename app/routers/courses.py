from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel 

from app.core.database import get_db
from app.models.group import Group
from app.models.institution import Institution
from app.models.subject import Subject
from app.models.user import User

router = APIRouter(prefix="/courses", tags=["Courses (Marketplace)"])

class CourseSchema(BaseModel):
    id: int
    name: str
    subject_name: str
    level: str
    institution_name: str
    institution_logo: Optional[str] = None
    teacher_name: str
    teacher_id: int
    days: Optional[str] = None
    time: Optional[str] = None
    price: float = 0.0 # Placeholder
    seats_available: int

    class Config:
        from_attributes = True

@router.get("/public", response_model=List[CourseSchema])
def get_public_courses(
    subject_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get list of available courses from all institutions.
    """
    query = db.query(Group).join(Institution).join(Subject).join(User, Group.teacher_id == User.id)
    
    # Filter for active/upcoming
    query = query.filter(Group.is_active)
    # query = query.filter(Group.status == GroupStatus.UPCOMING) # Optional strictness
    
    if subject_id:
        query = query.filter(Group.subject_id == subject_id)
        
    groups = query.limit(limit).all()
    
    results = []
    for g in groups:
        # Calculate seats
        seats = g.max_students - g.current_students
        
        # Format time
        time_str = f"{g.start_time.strftime('%H:%M')}" if g.start_time else "TBA"
        
        results.append({
            "id": g.id,
            "name": g.name,
            "subject_name": g.subject.name,
            "level": g.level.value,
            "institution_name": g.institution.brand_name or g.institution.name,
            "institution_logo": g.institution.logo_url,
            "teacher_name": f"{g.teacher.first_name} {g.teacher.last_name}",
            "teacher_id": g.teacher_id,
            "days": g.days_of_week,
            "time": time_str,
            "price": 99.00, # Mock price since DB column missing
            "seats_available": max(0, seats)
        })
        
    return results
