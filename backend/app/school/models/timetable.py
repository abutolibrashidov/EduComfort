from sqlalchemy import Column, Integer, String, Time, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.models.base import Base
import enum

class DayOfWeek(str, enum.Enum):
    MONDAY = "Dushanba"
    TUESDAY = "Seshanba"
    WEDNESDAY = "Chorshanba"
    THURSDAY = "Payshanba"
    FRIDAY = "Juma"
    SATURDAY = "Shanba"
    SUNDAY = "Yakshanba"

class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(SQLEnum(DayOfWeek), nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room_number = Column(String(50), nullable=True)
    
    # Relationships
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    school_class_id = Column(Integer, ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=True, index=True) # Optional link to specific year, though school_class is year-specific

    institution = relationship("Institution")
    school_class = relationship("SchoolClass")
    subject = relationship("Subject")
    teacher = relationship("User", foreign_keys=[teacher_id])
