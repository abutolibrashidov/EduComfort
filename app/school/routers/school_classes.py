from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models.user import User
from app.center.models.enrollment import Enrollment

from app.school.models.school_class import SchoolClass
from app.school.schemas.school_class import SchoolClassCreate, SchoolClassUpdate, SchoolClassResponse

router = APIRouter(
    prefix="/school_classes",
    tags=["Private School: Classes (Sinflar)"]
)

@router.post("/", response_model=SchoolClassResponse)
def create_school_class(
    school_class: SchoolClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")

    db_class = SchoolClass(
        **school_class.model_dump(),
        institution_id=current_user.institution_id
    )
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

@router.get("/", response_model=List[SchoolClassResponse])
def get_school_classes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str = None,
    academic_year_id: int = None,
    grade_level_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SchoolClass).filter(SchoolClass.institution_id == current_user.institution_id)
    
    if search:
        query = query.filter(SchoolClass.name.ilike(f"%{search}%"))
    if academic_year_id:
        query = query.filter(SchoolClass.academic_year_id == academic_year_id)
    if grade_level_id:
        query = query.filter(SchoolClass.grade_level_id == grade_level_id)

    # We might want to sort by grade level then name later
    classes = query.offset(skip).limit(limit).all()
    
    # Fast way to populate current_students and teacher
    # In production, use joinedload and subqueries for better performance.
    for cls in classes:
        cls.current_students = db.query(Enrollment).filter(Enrollment.school_class_id == cls.id).count()
        cls.teacher = cls.homeroom_teacher
        
    return classes

@router.get("/{class_id}", response_model=SchoolClassResponse)
def get_school_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.institution_id == current_user.institution_id
    ).first()
    
    if not db_class:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
        
    db_class.current_students = db.query(Enrollment).filter(Enrollment.school_class_id == db_class.id).count()
    db_class.teacher = db_class.homeroom_teacher
    
    return db_class

@router.put("/{class_id}", response_model=SchoolClassResponse)
def update_school_class(
    class_id: int,
    class_update: SchoolClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    db_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.institution_id == current_user.institution_id
    ).first()
    
    if not db_class:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
        
    for var, value in vars(class_update).items():
        if value is not None:
            setattr(db_class, var, value)
            
    db.commit()
    db.refresh(db_class)
    return db_class

@router.delete("/{class_id}")
def delete_school_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    db_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.institution_id == current_user.institution_id
    ).first()
    
    if not db_class:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
        
    db.delete(db_class)
    db.commit()
    return {"message": "Sinf o'chirildi"}

# --- Student Management ---

@router.get("/{class_id}/students")
def get_school_class_students(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify class exists
    db_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.institution_id == current_user.institution_id
    ).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    # Find students through enrollments
    enrollments = db.query(Enrollment).filter(
        Enrollment.school_class_id == class_id,
        Enrollment.institution_id == current_user.institution_id
    ).all()
    
    return [e.student for e in enrollments]

from pydantic import BaseModel
class AddStudentRequest(BaseModel):
    student_id: int

@router.post("/{class_id}/students")
def add_student_to_school_class(
    class_id: int,
    payload: AddStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    db_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id,
        SchoolClass.institution_id == current_user.institution_id
    ).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    # Search for an active enrollment for this student in this academic year
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == payload.student_id,
        Enrollment.academic_year_id == db_class.academic_year_id,
        Enrollment.institution_id == current_user.institution_id
    ).first()

    if not enrollment:
        # Create a new enrollment record (auto-assign grade level based on class)
        enrollment = Enrollment(
            student_id=payload.student_id,
            academic_year_id=db_class.academic_year_id,
            grade_level_id=db_class.grade_level_id,
            institution_id=current_user.institution_id,
            school_class_id=db_class.id,
            status="active"
        )
        db.add(enrollment)
    else:
        # Update existing enrollment's class
        enrollment.school_class_id = db_class.id
        
    db.commit()
    return {"message": "O'quvchi sinfga qo'shildi"}

@router.delete("/{class_id}/students/{student_id}")
def remove_student_from_school_class(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    enrollment = db.query(Enrollment).filter(
        Enrollment.school_class_id == class_id,
        Enrollment.student_id == student_id,
        Enrollment.institution_id == current_user.institution_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="O'quvchi bu sinfda topilmadi")
        
    enrollment.school_class_id = None
    db.commit()
    return {"message": "O'quvchi sinfdan chiqarildi"}
