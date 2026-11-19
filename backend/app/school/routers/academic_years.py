from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from loguru import logger

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.school.models.academic_year import AcademicYear

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])


class AcademicYearCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_active: Optional[bool] = False


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    role = current_user.role
    if hasattr(role, "value"):
        role = role.value
    if role not in ("super_admin", "admin", "platform_owner"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/", response_model=List[dict])
def list_academic_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all academic years for the current institution."""
    institution_id = current_user.institution_id
    if not institution_id:
        return []
    years = db.query(AcademicYear).filter(
        AcademicYear.institution_id == institution_id
    ).order_by(AcademicYear.start_date.desc()).all()
    return [
        {
            "id": y.id,
            "name": y.name,
            "start_date": str(y.start_date),
            "end_date": str(y.end_date),
            "is_active": y.is_active,
        }
        for y in years
    ]


@router.post("/", status_code=201)
def create_academic_year(
    data: AcademicYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    institution_id = current_user.institution_id
    if not institution_id:
        raise HTTPException(status_code=400, detail="No institution associated")
    
    if data.is_active:
        # Deactivate existing active years
        db.query(AcademicYear).filter(
            AcademicYear.institution_id == institution_id,
            AcademicYear.is_active == True
        ).update({"is_active": False})

    new_year = AcademicYear(
        institution_id=institution_id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
    )
    db.add(new_year)
    db.commit()
    db.refresh(new_year)
    return {"id": new_year.id, "name": new_year.name}


@router.put("/{year_id}")
def update_academic_year(
    year_id: int,
    data: AcademicYearUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    year = db.query(AcademicYear).filter(
        AcademicYear.id == year_id,
        AcademicYear.institution_id == current_user.institution_id
    ).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")

    if data.is_active:
        # Deactivate all others first
        db.query(AcademicYear).filter(
            AcademicYear.institution_id == current_user.institution_id,
            AcademicYear.is_active == True
        ).update({"is_active": False})

    if data.name is not None:
        year.name = data.name
    if data.start_date is not None:
        year.start_date = data.start_date
    if data.end_date is not None:
        year.end_date = data.end_date
    if data.is_active is not None:
        year.is_active = data.is_active

    db.commit()
    return {"message": "Updated"}


@router.delete("/{year_id}")
def delete_academic_year(
    year_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    year = db.query(AcademicYear).filter(
        AcademicYear.id == year_id,
        AcademicYear.institution_id == current_user.institution_id
    ).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    db.delete(year)
    db.commit()
    return {"message": "Deleted"}
