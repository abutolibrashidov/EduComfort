"""
app/services/attendance_service.py
Business logic for attendance — keeps routers clean.
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from fastapi import HTTPException, status

from app.academic.models.attendance import Attendance, AttendanceStatus
from app.core.models.user import User
from app.center.models.group import Group  # adjust if your import path differs
from app.academic.schemas.attendance import (
    AttendanceCreate,
    AttendanceBulkCreate,
    AttendanceUpdate,
    AttendanceRead,
    AttendanceSummary,
)
from loguru import logger


def _verify_group_belongs_to_institution(db: Session, group_id: int, institution_id: int):
    """Guard: ensure the group belongs to the caller's institution."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.institution_id != institution_id:
        raise HTTPException(status_code=403, detail="Cross-institution operation blocked")
    return group


def get_attendance_records(
    db: Session,
    institution_id: int,
    group_id: Optional[int] = None,
    student_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status_filter: Optional[AttendanceStatus] = None,
) -> List[AttendanceRead]:
    """Fetch attendance records with optional filters — always scoped to institution."""

    # Build query via group → institution isolation
    query = (
        db.query(Attendance)
        .join(Group, Attendance.group_id == Group.id)
        .filter(Group.institution_id == institution_id)
    )

    if group_id:
        query = query.filter(Attendance.group_id == group_id)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if date_from:
        query = query.filter(Attendance.date >= date_from)
    if date_to:
        query = query.filter(Attendance.date <= date_to)
    if status_filter:
        query = query.filter(Attendance.status == status_filter)

    records = query.order_by(Attendance.date.desc()).all()

    # Attach student/group names efficiently (avoid N+1)
    student_ids = list({r.student_id for r in records})
    group_ids = list({r.group_id for r in records})

    students = {u.id: f"{u.first_name} {u.last_name}" for u in db.query(User).filter(User.id.in_(student_ids)).all()}
    groups = {g.id: g.name for g in db.query(Group).filter(Group.id.in_(group_ids)).all()}

    result = []
    for r in records:
        item = AttendanceRead.from_orm(r)
        item.student_name = students.get(r.student_id, "Unknown")
        item.group_name = groups.get(r.group_id, "Unknown")
        result.append(item)

    return result


def create_attendance_record(
    db: Session,
    data: AttendanceCreate,
    institution_id: int,
) -> AttendanceRead:
    """Create a single attendance record after verifying institution ownership."""
    _verify_group_belongs_to_institution(db, data.group_id, institution_id)

    # Prevent duplicate for same student + group + date
    existing = db.query(Attendance).filter(
        Attendance.student_id == data.student_id,
        Attendance.group_id == data.group_id,
        Attendance.date == data.date,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already recorded for this student on this date in this group."
        )

    record = Attendance(**data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)

    item = AttendanceRead.from_orm(record)
    student = db.query(User).filter(User.id == record.student_id).first()
    group = db.query(Group).filter(Group.id == record.group_id).first()
    item.student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
    item.group_name = group.name if group else "Unknown"
    return item


def bulk_create_attendance(
    db: Session,
    data: AttendanceBulkCreate,
    institution_id: int,
) -> list:
    """Take attendance for an entire group at once. Skips duplicates gracefully."""
    _verify_group_belongs_to_institution(db, data.group_id, institution_id)

    # Fetch existing records for this group+date to avoid duplicates
    existing_student_ids = {
        r.student_id for r in db.query(Attendance).filter(
            Attendance.group_id == data.group_id,
            Attendance.date == data.date,
        ).all()
    }

    new_records = []
    skipped = 0

    for entry in data.records:
        if entry.student_id in existing_student_ids:
            skipped += 1
            continue

        record = Attendance(
            student_id=entry.student_id,
            group_id=data.group_id,
            date=data.date,
            status=entry.status,
            remarks=entry.remarks,
        )
        db.add(record)
        new_records.append(record)

    db.commit()
    logger.info(f"Bulk attendance: {len(new_records)} saved, {skipped} skipped (duplicates) for group {data.group_id}")
    return new_records


def update_attendance_record(
    db: Session,
    attendance_id: int,
    data: AttendanceUpdate,
    institution_id: int,
) -> AttendanceRead:
    """Update status or remarks on an existing record."""
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Institution isolation via group
    _verify_group_belongs_to_institution(db, record.group_id, institution_id)

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    item = AttendanceRead.from_orm(record)
    student = db.query(User).filter(User.id == record.student_id).first()
    group = db.query(Group).filter(Group.id == record.group_id).first()
    item.student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"
    item.group_name = group.name if group else "Unknown"
    return item


def get_student_summary(
    db: Session,
    student_id: int,
    institution_id: int,
    group_id: Optional[int] = None,
) -> AttendanceSummary:
    """Calculate attendance statistics for a student."""
    query = (
        db.query(Attendance)
        .join(Group, Attendance.group_id == Group.id)
        .filter(
            Attendance.student_id == student_id,
            Group.institution_id == institution_id,
        )
    )

    if group_id:
        query = query.filter(Attendance.group_id == group_id)

    records = query.all()
    total = len(records)

    counts = {s: 0 for s in AttendanceStatus}
    for r in records:
        counts[r.status] += 1

    present = counts[AttendanceStatus.PRESENT]
    rate = round((present / total * 100), 1) if total > 0 else 0.0

    student = db.query(User).filter(User.id == student_id).first()
    student_name = f"{student.first_name} {student.last_name}" if student else "Unknown"

    return AttendanceSummary(
        student_id=student_id,
        student_name=student_name,
        total=total,
        present=present,
        absent=counts[AttendanceStatus.ABSENT],
        late=counts[AttendanceStatus.LATE],
        excused=counts[AttendanceStatus.EXCUSED],
        attendance_rate=rate,
    )