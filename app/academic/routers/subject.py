from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
# from sqlalchemy import or_  <-- Removed unused import

from typing import List, Optional
from app.academic.models.subject import Subject
from app.academic.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.security.permissions import (
    is_admin_or_higher,
    is_super_admin
)

router = APIRouter()

# ---------------- CREATE SUBJECT ----------------
@router.post("/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create subjects",
        )

    # Ensure user has an institution OR is super admin
    if not current_user.institution_id and not current_user.is_platform_admin and not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must belong to an institution to create subjects",
        )

    # Check for duplicate subject name within the same institution
    query = db.query(Subject).filter(Subject.name == subject.name)
    
    # FIX: Scoped check. If not platform admin, only check my institution.
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            query = query.filter(Subject.institution_id == current_user.institution_id)
        # If I am a super admin without institution (rare/legacy), I might see global duplicates?
        # Ideally super admins should have institution_id. if not, they effectively act globally or semi-globally.
        # But strictly speaking, we want to allow "Math" in Inst A even if "Math" exists in Inst B.
    
    existing = query.first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already exists in this institution")

    # Create new subject with institution_id (or None for super admins without institution)
    new_subject = Subject(
        name=subject.name, 
        name_uz=subject.name_uz,
        name_ru=subject.name_ru,
        code=subject.code,
        color=subject.color,
        description=subject.description,
        institution_id=current_user.institution_id  # Can be None for super admins
    )

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

# ---------------- GET ALL SUBJECTS ----------------
@router.get("", response_model=List[SubjectRead])
@router.get("/", response_model=List[SubjectRead], include_in_schema=False)
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    subject_id: Optional[int] = None,
    name: Optional[str] = None
):
    query = db.query(Subject)
    
    # Apply filters
    if subject_id:
        query = query.filter(Subject.id == subject_id)
    if name:
        query = query.filter(Subject.name.ilike(f"%{name}%"))
    
    # Multi-tenancy: Only Platform Admin sees all. Institution admins see ONLY their own subjects.
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            # Institution users see ONLY their institution's subjects
            query = query.filter(Subject.institution_id == current_user.institution_id)
        else:
            # If no institution, return empty (or just own subjects if any logic existed, but generally empty)
            query = query.filter(Subject.institution_id == -1)
    
    subjects = query.all()
    return subjects

# ---------------- GET SUBJECT BY ID ----------------
@router.get("/{subject_id}", response_model=SubjectRead)
def get_subject(
    subject_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Subject).filter(Subject.id == subject_id)
    
    if not is_super_admin(current_user) and current_user.institution_id:
        query = query.filter(Subject.institution_id == current_user.institution_id)
        
    subject = query.first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

# ---------------- UPDATE SUBJECT ----------------
@router.put("/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update subjects",
        )

    query = db.query(Subject).filter(Subject.id == subject_id)
    
    # Only Platform Admin can update all subjects. Institution admins can only update their own.
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            query = query.filter(Subject.institution_id == current_user.institution_id)
        else:
            # If no institution, they can't update any subjects
            raise HTTPException(status_code=403, detail="Access denied")
        
    subject = query.first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or access denied")

    for key, value in subject_data.dict(exclude_unset=True).items():
        setattr(subject, key, value)

    db.commit()
    db.refresh(subject)
    return subject

# ---------------- DELETE SUBJECT ----------------
@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete subjects",
        )

    query = db.query(Subject).filter(Subject.id == subject_id)
    
    # Only Platform Admin can delete all subjects. Institution admins can only delete their own.
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            query = query.filter(Subject.institution_id == current_user.institution_id)
        else:
            # If no institution, they can't delete any subjects
            raise HTTPException(status_code=403, detail="Access denied")
        
    subject = query.first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or access denied")

    db.delete(subject)
    db.commit()
    return None