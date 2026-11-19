from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.core.models.institution import Institution
from app.center.models.enrollment import Enrollment
from app.center.schemas.enrollment import EnrollmentCreate, EnrollmentUpdate, EnrollmentResponse
from app.security.permissions import is_admin_or_higher
from app.utils.invoicing import create_student_invoice

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])

@router.post("/", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new student enrollment (School Admins only)"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    # Verify institution context
    institution_id = current_user.institution_id
    if not institution_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must belong to an institution")
        
    # Verify student belongs to this institution
    student = db.query(User).filter(
        User.id == data.student_id,
        User.institution_id == institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this institution")
        
    # Check if active enrollment already exists for this year
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == data.student_id,
        Enrollment.academic_year_id == data.academic_year_id,
        Enrollment.institution_id == institution_id,
        Enrollment.status == "active"
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student already has an active enrollment for this academic year")
        
    new_enrollment = Enrollment(
        student_id=data.student_id,
        academic_year_id=data.academic_year_id,
        grade_level_id=data.grade_level_id,
        institution_id=institution_id,
        status=data.status
    )
    
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    
    # Trigger Automated Invoicing
    create_student_invoice(db, new_enrollment.student_id, institution_id, grade_level_id=new_enrollment.grade_level_id)
    
    return new_enrollment


@router.get("/", response_model=List[EnrollmentResponse])
def get_enrollments(
    student_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    grade_level_id: Optional[int] = None,
    en_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List enrollments with optional filtering"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    institution_id = current_user.institution_id
    
    query = db.query(Enrollment).filter(Enrollment.institution_id == institution_id)
    
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
    if academic_year_id:
        query = query.filter(Enrollment.academic_year_id == academic_year_id)
    if grade_level_id:
        query = query.filter(Enrollment.grade_level_id == grade_level_id)
    if en_status:
        query = query.filter(Enrollment.status == en_status)
        
    return query.all()


@router.put("/{enrollment_id}", response_model=EnrollmentResponse)
def update_enrollment(
    enrollment_id: int,
    data: EnrollmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing enrollment limit"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    institution_id = current_user.institution_id
    
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.institution_id == institution_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
        
    if data.academic_year_id is not None:
        enrollment.academic_year_id = data.academic_year_id
    if data.grade_level_id is not None:
        enrollment.grade_level_id = data.grade_level_id
    if data.status is not None:
        enrollment.status = data.status
        
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an enrollment record"""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin only")
        
    institution_id = current_user.institution_id
    
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.institution_id == institution_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
        
    db.delete(enrollment)
    db.commit()
    return None
