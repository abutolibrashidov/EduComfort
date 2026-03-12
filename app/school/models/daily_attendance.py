from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.models.base import Base
from datetime import date
import enum

class AttendanceStatus(str, enum.Enum):
    PRESENT = "Keldi"
    ABSENT = "Kelmadi"
    EXCUSED = "Sababli"

class DailyAttendance(Base):
    __tablename__ = "daily_attendance"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today, index=True)
    status = Column(SQLEnum(AttendanceStatus, name="daily_attendance_status"), nullable=False)
    note = Column(String(255), nullable=True)
    
    # Relationships
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    school_class_id = Column(Integer, ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Teacher who recorded it

    institution = relationship("Institution")
    student = relationship("User", foreign_keys=[student_id])
    school_class = relationship("SchoolClass")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
