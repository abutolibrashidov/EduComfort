"""
Course Model - Represents subjects/courses offered by the learning center
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    
    # Institution association
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    course_code = Column(String(50), nullable=False, index=True)
    
    # Course categorization
    level = Column(String(50), nullable=True)  # e.g., "Beginner", "Intermediate", "Advanced"
    category = Column(String(100), nullable=True)  # e.g., "Math", "Science", "Language"
    
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    institution = relationship("Institution")
    branch = relationship("Branch", backref="courses")
    
    # Course metadata
    duration_weeks = Column(Integer, nullable=True)
    max_students = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # classes = relationship("Class", backref="course", cascade="all, delete-orphan")  # Commented out - Class model doesn't exist
    # content = relationship("LearningContent", backref="course", cascade="all, delete-orphan")
    
    # Unique constraint: course code must be unique within an institution
    __table_args__ = (
        UniqueConstraint('institution_id', 'course_code', name='uq_institution_course_code'),
    )
