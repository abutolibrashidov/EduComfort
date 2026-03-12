"""
app/schemas/attendance.py
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from app.models.attendance import AttendanceStatus


# ── Single record input ───────────────────────────────────────────────────────
class AttendanceCreate(BaseModel):
    student_id: int
    group_id: int
    date: date
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remarks: Optional[str] = None


# ── One entry inside a bulk request ──────────────────────────────────────────
class AttendanceBulkEntry(BaseModel):
    student_id: int
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remarks: Optional[str] = None


# ── Bulk request: one group, one date, many students ─────────────────────────
class AttendanceBulkCreate(BaseModel):
    group_id: int
    date: date
    records: List[AttendanceBulkEntry]


# ── Update (all fields optional) ─────────────────────────────────────────────
class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    remarks: Optional[str] = None


# ── Read / Response ───────────────────────────────────────────────────────────
class AttendanceRead(BaseModel):
    id: int
    student_id: int
    group_id: int
    date: date
    status: AttendanceStatus
    remarks: Optional[str]
    created_at: Optional[datetime]

    # Convenience fields populated by the service
    student_name: Optional[str] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Summary stats for a student ──────────────────────────────────────────────
class AttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    total: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_rate: float  # percentage e.g. 87.5