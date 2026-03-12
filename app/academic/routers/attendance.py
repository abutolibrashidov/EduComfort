"""
app/routers/attendance.py
Attendance management — take attendance, view records, get summaries.
Fully institution-isolated.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.attendance import Attendance, AttendanceStatus
from app.models.group import Group  # adjust import path if different
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceBulkCreate,
    AttendanceUpdate,
    AttendanceRead,
    AttendanceSummary,
)
from app.services.attendance_service import (
    get_attendance_records,
    create_attendance_record,
    bulk_create_attendance,
    update_attendance_record,
    get_student_summary,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def get_role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


# ── GET all attendance records (filterable) ──────────────────────────────────
@router.get("", response_model=List[AttendanceRead])
def list_attendance(
    group_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List attendance records — filtered by institution automatically."""
    role = get_role(current_user)
    if role not in ["super_admin", "admin", "teacher", "staff", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return get_attendance_records(
        db=db,
        institution_id=current_user.institution_id,
        group_id=group_id,
        student_id=student_id,
        date_from=date_from,
        date_to=date_to,
        status_filter=status,
    )


# ── POST single attendance record ────────────────────────────────────────────
@router.post("", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a single attendance record."""
    role = get_role(current_user)
    if role not in ["super_admin", "admin", "teacher", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return create_attendance_record(db, data, current_user.institution_id)


# ── POST bulk attendance (take attendance for whole group at once) ────────────
@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def bulk_attendance(
    data: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Take attendance for an entire group in one request.
    Accepts a list of {student_id, status, remarks} entries for a given group + date.
    """
    role = get_role(current_user)
    if role not in ["super_admin", "admin", "teacher", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    created = bulk_create_attendance(db, data, current_user.institution_id)
    return {"message": f"{len(created)} attendance records saved.", "count": len(created)}


# ── GET student attendance summary ───────────────────────────────────────────
@router.get("/summary/{student_id}", response_model=AttendanceSummary)
def student_attendance_summary(
    student_id: int,
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance summary (present/absent/late counts) for a student."""
    role = get_role(current_user)
    # Students can only see their own summary
    if role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return get_student_summary(
        db=db,
        student_id=student_id,
        institution_id=current_user.institution_id,
        group_id=group_id,
    )


# ── GET my attendance (student self-view) ────────────────────────────────────
@router.get("/my", response_model=List[AttendanceRead])
def my_attendance(
    group_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Students view their own attendance records."""
    return get_attendance_records(
        db=db,
        institution_id=current_user.institution_id,
        student_id=current_user.id,
        group_id=group_id,
        date_from=date_from,
        date_to=date_to,
    )


# ── PATCH update single record ───────────────────────────────────────────────
@router.patch("/{attendance_id}", response_model=AttendanceRead)
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an attendance record (e.g. correct a mistake)."""
    role = get_role(current_user)
    if role not in ["super_admin", "admin", "teacher", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return update_attendance_record(db, attendance_id, data, current_user.institution_id)


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an attendance record. Admins only."""
    role = get_role(current_user)
    if role not in ["super_admin", "admin", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    record = db.query(Attendance).filter(
        Attendance.id == attendance_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Institution isolation check
    # We verify via the group's institution
    group = db.query(Group).filter(Group.id == record.group_id).first()
    if group and group.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cross-institution operation blocked")

    db.delete(record)
    db.commit()