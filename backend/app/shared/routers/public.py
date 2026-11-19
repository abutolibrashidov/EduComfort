from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.auth.dependencies import get_current_user_optional
from app.core.models.user import User
from app.core.models.institution import Institution


router = APIRouter(prefix="/public", tags=["Public"])


# ============================================
# SCHEMAS
# ============================================

class ProfileSetupRequest(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: str
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None


class PublicProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    institution_name: Optional[str] = None
    institution_logo: Optional[str] = None
    institution_description: Optional[str] = None
    contact_email: Optional[str] = None
    is_following: bool = False
    stats: Optional[dict] = None

    class Config:
        from_attributes = True

class PublicInstitutionPreview(BaseModel):
    id: int
    name: str
    logo_url: Optional[str]
    description: Optional[str]
    course_count: int = 0
    rating: float = 0.0

    class Config:
        from_attributes = True

class PublicTeacherPreview(BaseModel):
    id: int
    first_name: str
    last_name: str
    avatar_url: Optional[str]
    institution_name: Optional[str]
    subjects: List[str] = []

    class Config:
        from_attributes = True


class CertificatePreview(BaseModel):
    id: int
    student_name: str
    certificate_type: str
    score: str
    subject: str
    verified: bool
    issue_date: Optional[date]

    class Config:
        from_attributes = True


class EventPreview(BaseModel):
    id: int
    title: str
    description: str
    event_date: date
    event_type: str
    location: Optional[str]
    registration_required: bool

    class Config:
        from_attributes = True


class LessonPreview(BaseModel):
    id: int
    title: str
    description: str
    instructor_name: str
    subject: str
    difficulty_level: str

    class Config:
        from_attributes = True


# ============================================
# PUBLIC ENDPOINTS
# ============================================

@router.post("/profile-setup")
def complete_profile_setup(
    profile_data: ProfileSetupRequest,
    db: Session = Depends(get_db)
):
    """
    Complete profile setup for new users
    This creates a pending user account that needs admin approval
    """
    
    # Check if phone number already exists
    existing_user = db.query(User).filter(
        User.phone_number == profile_data.phone_number
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this phone number already exists"
        )
    
    # Create new user with pending status
    new_user = User(
        first_name=profile_data.first_name,
        last_name=profile_data.last_name,
        phone_number=profile_data.phone_number,
        email=profile_data.email,
        role="student",  # Default role
        is_active=False,  # Requires admin approval
        password_hash="",  # Will be set after approval
    )
    
    # Add optional fields if they exist in your User model
    if hasattr(new_user, 'date_of_birth'):
        new_user.date_of_birth = profile_data.date_of_birth
    if hasattr(new_user, 'gender'):
        new_user.gender = profile_data.gender
    if hasattr(new_user, 'address'):
        new_user.address = profile_data.address
    if hasattr(new_user, 'parent_name'):
        new_user.parent_name = profile_data.parent_name
    if hasattr(new_user, 'parent_phone'):
        new_user.parent_phone = profile_data.parent_phone
    if hasattr(new_user, 'emergency_contact'):
        new_user.emergency_contact = profile_data.emergency_contact
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "message": "Profile setup completed successfully. Please wait for admin approval.",
            "user_id": new_user.id,
            "status": "pending_approval"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create profile"
        )


@router.get("/certificates", response_model=List[CertificatePreview])
def get_public_certificates(
    subject: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get public certificate previews for the homepage
    Only shows verified, approved certificates
    """
    
    # Mock data - Replace with actual Achievement/Certificate model
    # Return empty list or DB query for now to avoid fake data
    # In future: return db.query(Achievement).filter(Achievement.is_verified == True).limit(limit).all()
    return []


@router.get("/events", response_model=List[EventPreview])
def get_public_events(
    upcoming: bool = True,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get public event previews for the homepage
    Only shows public events
    """
    
    # Mock data - Replace with actual Event model
    # Returning empty for now to remove fake data
    return []


@router.get("/lessons", response_model=List[LessonPreview])
def get_public_lessons(
    subject: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get public lesson previews for the homepage
    Only shows featured/preview lessons
    """
    
    # Mock data - Replace with actual Lesson model
    return []


@router.get("/stats")
def get_public_stats(db: Session = Depends(get_db)):
    """
    Get public statistics for the homepage
    """
    
    total_students = db.query(User).filter(
        User.role == "student",
        User.is_active
    ).count()
    
    total_teachers = db.query(User).filter(
        User.role == "teacher",
        User.is_active
    ).count()
    
    # Add more stats as needed
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "success_rate": 95,  # Mock data
        "average_score": 8.2,  # Mock data
        "years_of_experience": 10,
    }


@router.get("/profile/{user_id}", response_model=PublicProfileResponse)
def get_public_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get public profile of a user (Teacher, Institution Admin, etc.)
    """
    from sqlalchemy import func
    from app.center.models.group import Group
    from app.engagement.models.rating import TeacherRating
    from app.engagement.models.feed import UserFollow

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Determine Bio and Institution info
    bio = user.bio
    inst_name = None
    inst_logo = None
    inst_desc = None

    if user.institution:
        inst_name = user.institution.name
        inst_logo = user.institution.logo_url
        inst_desc = user.institution.description
        
        # If user is admin/super_admin, their bio IS the institution description if not set
        from app.security.permissions import is_admin_or_higher
        if is_admin_or_higher(user) and not bio:
            bio = user.institution.description

    # Teacher Stats
    stats = None
    if user.role == "teacher":
        teacher_groups = db.query(Group).filter(
            Group.teacher_id == user.id,
            Group.status == "active"
        ).all()
        
        group_count = len(teacher_groups)
        student_count = sum([g.current_students for g in teacher_groups])
        avg_rating = db.query(func.avg(TeacherRating.rating)).filter(
            TeacherRating.teacher_id == user.id
        ).scalar() or 0.0

        stats = {
            "group_count": group_count,
            "student_count": student_count,
            "average_rating": round(float(avg_rating), 1),
            "subjects": list(set([g.subject.name for g in teacher_groups if g.subject]))
        }

    is_following = False
    if current_user:
        is_following = db.query(UserFollow).filter(
            UserFollow.follower_id == current_user.id,
            UserFollow.followed_id == user.id
        ).first() is not None

    return PublicProfileResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        avatar_url=getattr(user, 'avatar', None),
        bio=bio,
        institution_name=inst_name,
        institution_logo=inst_logo,
        institution_description=inst_desc,
        # Only staff publish a contact email; learners' and parents' stay private
        contact_email=None if getattr(user.role, "value", user.role) in ("student", "parent") else user.email,
        is_following=is_following,
        stats=stats
    )


@router.get("/institutions", response_model=List[PublicInstitutionPreview])
def get_public_institutions(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List all institutions publicly"""
    institutions = db.query(Institution).filter(Institution.is_active).limit(limit).all()
    
    results = []
    for inst in institutions:
        results.append({
            "id": inst.id,
            "name": inst.name,
            "logo_url": inst.logo_url,
            "description": inst.description,
            "course_count": len(inst.courses) if hasattr(inst, 'courses') else 0, # Assuming relationship exists
            "rating": 4.8 # Mock
        })
    return results


@router.get("/teachers", response_model=List[PublicTeacherPreview])
def get_public_teachers(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List all teachers publicly"""
    teachers = db.query(User).filter(User.role == "teacher", User.is_active).limit(limit).all()
    
    results = []
    for t in teachers:
        results.append({
            "id": t.id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "avatar_url": t.avatar, # Assuming User model has avatar? Or logic needed.
            "institution_name": t.institution.name if t.institution else "Independent",
            "subjects": [s.name for s in t.subjects] if hasattr(t, 'subjects') else []
        })
    return results