from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .base import Base

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    remarks = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("User", backref="attendance_records")
    group = relationship("Group", backref="attendance_records")
