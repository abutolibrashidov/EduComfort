"""
Learner Registration and Public Browsing Endpoints
Allows individual learners to register and browse available courses
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.models.user import User
from app.core.models.institution import Institution
from app.academic.models.course import Course
from app.center.models.group import Group
from app.constants.roles import Role
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/learners", tags=["Learners"])


# ==================== Schemas ====================

class LearnerRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    email: Optional[EmailStr] = None
    password: str


class InstitutionPublicInfo(BaseModel):
    id: int
    name: str
    subdomain: str
    description: Optional[str]
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    
    class Config:
        from_attributes = True


class CoursePublicInfo(BaseModel):
    id: int
    name: str
    description: Optional[str]
    course_code: str
    level: Optional[str]
    category: Optional[str]
    institution_id: int
    institution_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class GroupPublicInfo(BaseModel):
    id: int
    name: str
    level: str
    max_students: int
    current_students: int
    institution_id: int
    
    class Config:
        from_attributes = True


# ==================== Endpoints ====================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_learner(
    request: LearnerRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for individual learners to register
    Learners are not tied to any specific institution at registration
    They can enroll in courses from any institution later
    """
    
    # Check if phone number already exists
    existing_user = db.query(User).filter(
        User.phone_number == request.phone_number
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Check if email already exists (if provided)
    if request.email:
        existing_email = db.query(User).filter(
            User.email == request.email
        ).first()
        
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create learner user (no institution_id - can access multiple institutions)
    learner = User(
        first_name=request.first_name,
        last_name=request.last_name,
        phone_number=request.phone_number,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=Role.STUDENT,
        institution_id=None,  # Learners are not tied to one institution
        is_active=True
    )
    
    db.add(learner)
    db.commit()
    db.refresh(learner)
    
    return {
        "message": "Learner registered successfully",
        "user_id": learner.id,
        "phone_number": learner.phone_number,
        "email": learner.email
    }


@router.get("/institutions", response_model=List[InstitutionPublicInfo])
def list_public_institutions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
):
    """
    Public endpoint to browse all active institutions
    Learners can see what institutions are available on the platform
    """
    query = db.query(Institution).filter(Institution.is_active)
    
    # Search by name
    if search:
        query = query.filter(Institution.name.ilike(f"%{search}%"))
    
    institutions = query.offset(skip).limit(limit).all()
    return institutions


@router.get("/institutions/{institution_id}/courses", response_model=List[CoursePublicInfo])
def list_institution_courses(
    institution_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    level: Optional[str] = None
):
    """
    Public endpoint to browse courses offered by a specific institution
    """
    # Verify institution exists and is active
    institution = db.query(Institution).filter(
        Institution.id == institution_id,
        Institution.is_active
    ).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found or inactive"
        )
    
    # Get courses for this institution
    query = db.query(Course).filter(
        Course.institution_id == institution_id,
        Course.is_active
    )
    
    # Apply filters
    if category:
        query = query.filter(Course.category == category)
    if level:
        query = query.filter(Course.level == level)
    
    courses = query.offset(skip).limit(limit).all()
    
    # Add institution name to each course
    result = []
    for course in courses:
        course_dict = CoursePublicInfo.from_orm(course).dict()
        course_dict["institution_name"] = institution.name
        result.append(CoursePublicInfo(**course_dict))
    
    return result


@router.get("/courses", response_model=List[CoursePublicInfo])
def browse_all_courses(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    level: Optional[str] = None,
    institution_id: Optional[int] = None
):
    """
    Public endpoint to browse all available courses across all institutions
    Learners can discover courses from any institution
    """
    # Get all active courses from active institutions
    query = db.query(Course).join(Institution).filter(
        Course.is_active,
        Institution.is_active
    )
    
    # Apply filters
    if category:
        query = query.filter(Course.category == category)
    if level:
        query = query.filter(Course.level == level)
    if institution_id:
        query = query.filter(Course.institution_id == institution_id)
    
    courses = query.offset(skip).limit(limit).all()
    
    # Add institution names
    result = []
    for course in courses:
        institution = db.query(Institution).filter(
            Institution.id == course.institution_id
        ).first()
        
        course_dict = CoursePublicInfo.from_orm(course).dict()
        course_dict["institution_name"] = institution.name if institution else None
        result.append(CoursePublicInfo(**course_dict))
    
    return result


@router.get("/institutions/{institution_id}/groups", response_model=List[GroupPublicInfo])
def list_institution_groups(
    institution_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Public endpoint to browse available groups/classes at an institution
    """
    # Verify institution exists and is active
    institution = db.query(Institution).filter(
        Institution.id == institution_id,
        Institution.is_active
    ).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found or inactive"
        )
    
    # Get active groups with available spots
    groups = db.query(Group).filter(
        Group.institution_id == institution_id,
        Group.is_active,
        Group.current_students < Group.max_students  # Only show groups with space
    ).offset(skip).limit(limit).all()
    
    return groups


@router.get("/institutions/{institution_id}", response_model=InstitutionPublicInfo)
def get_institution_details(
    institution_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific institution
    """
    institution = db.query(Institution).filter(
        Institution.id == institution_id,
        Institution.is_active
    ).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found or inactive"
        )
    
    return institution
