from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models.user import User

from app.school.models.timetable import Timetable
from app.school.schemas.timetable import TimetableCreate, TimetableUpdate, TimetableResponse

router = APIRouter(
    prefix="/timetables",
    tags=["Private School: Timetables (Dars jadvali)"]
)

@router.post("/", response_model=TimetableResponse)
def create_timetable(
    timetable: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")

    db_timetable = Timetable(
        **timetable.model_dump(),
        institution_id=current_user.institution_id
    )
    db.add(db_timetable)
    db.commit()
    db.refresh(db_timetable)
    
    # Populate extra data for response
    db_timetable.subject_name = db_timetable.subject.name if db_timetable.subject else None
    db_timetable.teacher_name = f"{db_timetable.teacher.first_name} {db_timetable.teacher.last_name}" if db_timetable.teacher else None
    
    return db_timetable

@router.get("/", response_model=List[TimetableResponse])
def get_timetables(
    school_class_id: int = None,
    teacher_id: int = None,
    day_of_week: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Timetable).filter(Timetable.institution_id == current_user.institution_id)
    
    if school_class_id:
        query = query.filter(Timetable.school_class_id == school_class_id)
    if teacher_id:
        query = query.filter(Timetable.teacher_id == teacher_id)
    if day_of_week:
        query = query.filter(Timetable.day_of_week == day_of_week)

    # Note: start_time ordering
    query = query.order_by(Timetable.day_of_week, Timetable.start_time)
    results = query.all()
    
    for r in results:
        r.subject_name = r.subject.name if r.subject else None
        r.teacher_name = f"{r.teacher.first_name} {r.teacher.last_name}" if r.teacher else None
        
    return results

@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id,
        Timetable.institution_id == current_user.institution_id
    ).first()
    
    if not db_timetable:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
        
    db_timetable.subject_name = db_timetable.subject.name if db_timetable.subject else None
    db_timetable.teacher_name = f"{db_timetable.teacher.first_name} {db_timetable.teacher.last_name}" if db_timetable.teacher else None
    
    return db_timetable

@router.put("/{timetable_id}", response_model=TimetableResponse)
def update_timetable(
    timetable_id: int,
    timetable_update: TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    db_timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id,
        Timetable.institution_id == current_user.institution_id
    ).first()
    
    if not db_timetable:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
        
    for var, value in vars(timetable_update).items():
        if value is not None:
            setattr(db_timetable, var, value)
            
    db.commit()
    db.refresh(db_timetable)
    
    db_timetable.subject_name = db_timetable.subject.name if db_timetable.subject else None
    db_timetable.teacher_name = f"{db_timetable.teacher.first_name} {db_timetable.teacher.last_name}" if db_timetable.teacher else None
    
    return db_timetable

@router.delete("/{timetable_id}")
def delete_timetable(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan foydalanuvchi")
        
    db_timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id,
        Timetable.institution_id == current_user.institution_id
    ).first()
    
    if not db_timetable:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
        
    db.delete(db_timetable)
    db.commit()
    return {"message": "Dars jadvaldan o'chirildi"}
