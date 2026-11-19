from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Boolean,
    DateTime,
    Date,
    Time,
    Float,
    Enum as SQLEnum
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from enum import Enum

from app.core.models.base import Base


class GroupLevel(str, Enum):
    BEGINNER = "beginner"
    ELEMENTARY = "elementary"
    PRE_INTERMEDIATE = "pre_intermediate"
    INTERMEDIATE = "intermediate"
    UPPER_INTERMEDIATE = "upper_intermediate"
    ADVANCED = "advanced"


class GroupStatus(str, Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    
    # Institution association
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Basic Info
    name = Column(String(150), nullable=False)  # e.g., "John's IELTS Morning"
    
    # Relations — all optional so SCHOOL institutions can create classes (sinf)
    # without learning-center-specific fields like subject or IELTS level
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)

    # Level & Status — level is optional for schools
    level = Column(SQLEnum(GroupLevel), nullable=True, default=None)
    status = Column(SQLEnum(GroupStatus), nullable=False, default=GroupStatus.ACTIVE)

    # Capacity
    current_students = Column(Integer, default=0)
    max_students = Column(Integer, default=30)
    monthly_fee = Column(Float, nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=True)

    # Schedule
    days_of_week = Column(String(50), nullable=True)  # e.g., "Mon,Wed,Fri"
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    # Duration
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Auditing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    institution = relationship("Institution")
    subject = relationship("Subject", backref="groups")
    teacher = relationship("User", foreign_keys=[teacher_id], backref="teaching_groups")
    branch = relationship("Branch", backref="groups")
    
    # Students M2M
    students = relationship("User", secondary="group_students", backref=backref("student_groups", overlaps="group_enrollments,student_enrollments"), overlaps="group_enrollments,student_enrollments")

    def __repr__(self):
        return f"<Group {self.name}>"