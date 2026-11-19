from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.models.base import Base

class GradebookLevel(Base):
    """A collection of manual exams for a specific group (e.g., 'Level 1')"""
    __tablename__ = "gradebook_levels"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Grading rule
    passing_percentage = Column(Float, default=60.0)
    expected_exams = Column(Integer, default=5)  # How many exams to expect in this level
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    group = relationship("Group", backref="gradebook_levels")
    exams = relationship("GradebookExam", back_populates="level", cascade="all, delete-orphan")


class GradebookExam(Base):
    """An individual manual exam within a Level (e.g., 'Unit 1 Test')"""
    __tablename__ = "gradebook_exams"

    id = Column(Integer, primary_key=True, index=True)
    level_id = Column(Integer, ForeignKey("gradebook_levels.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    max_score = Column(Float, default=100.0)
    exam_date = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    level = relationship("GradebookLevel", back_populates="exams")
    scores = relationship("GradebookScore", back_populates="exam", cascade="all, delete-orphan")


class GradebookScore(Base):
    """A student's score in a specific manual exam"""
    __tablename__ = "gradebook_scores"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("gradebook_exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    exam = relationship("GradebookExam", back_populates="scores")
    student = relationship("User", foreign_keys=[student_id])
