from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.school.models.grade_level import GradeLevel

router = APIRouter(prefix="/grade-levels", tags=["Grade Levels"])


class GradeLevelCreate(BaseModel):
    name: str
    sequence: int
    monthly_fee: Optional[float] = None


class GradeLevelUpdate(BaseModel):
    name: Optional[str] = None
    sequence: Optional[int] = None
    monthly_fee: Optional[float] = None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    role = current_user.role
    if hasattr(role, "value"):
        role = role.value
    if role not in ("super_admin", "admin", "platform_owner"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/", response_model=List[dict])
def list_grade_levels(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    institution_id = current_user.institution_id
    if not institution_id:
        return []
    grades = db.query(GradeLevel).filter(
        GradeLevel.institution_id == institution_id
    ).order_by(GradeLevel.sequence).all()
    return [
        {
            "id": g.id,
            "name": g.name,
            "sequence": g.sequence,
            "monthly_fee": g.monthly_fee,
        }
        for g in grades
    ]


@router.post("/", status_code=201)
def create_grade_level(
    data: GradeLevelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    institution_id = current_user.institution_id
    if not institution_id:
        raise HTTPException(status_code=400, detail="No institution")
    
    grade = GradeLevel(
        institution_id=institution_id,
        name=data.name,
        sequence=data.sequence,
        monthly_fee=data.monthly_fee,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return {"id": grade.id, "name": grade.name}


@router.put("/{grade_id}")
def update_grade_level(
    grade_id: int,
    data: GradeLevelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    grade = db.query(GradeLevel).filter(
        GradeLevel.id == grade_id,
        GradeLevel.institution_id == current_user.institution_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade level not found")
    if data.name is not None:
        grade.name = data.name
    if data.sequence is not None:
        grade.sequence = data.sequence
    if data.monthly_fee is not None:
        grade.monthly_fee = data.monthly_fee
    db.commit()
    return {"message": "Updated"}


@router.delete("/{grade_id}")
def delete_grade_level(
    grade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    grade = db.query(GradeLevel).filter(
        GradeLevel.id == grade_id,
        GradeLevel.institution_id == current_user.institution_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade level not found")
    db.delete(grade)
    db.commit()
    return {"message": "Deleted"}
