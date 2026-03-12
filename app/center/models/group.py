from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Boolean,
    DateTime,
    Date,
    Time,
    Enum as SQLEnum
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from enum import Enum

from .base import Base


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
    
    # Relations
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)

    # Level & Status
    level = Column(SQLEnum(GroupLevel), nullable=False, default=GroupLevel.BEGINNER)
    status = Column(SQLEnum(GroupStatus), nullable=False, default=GroupStatus.UPCOMING)

    # Capacity
    max_students = Column(Integer, default=12)
    current_students = Column(Integer, default=0)

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