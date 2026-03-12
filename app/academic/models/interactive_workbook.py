"""
Interactive Workbook Models - Full Solutions Book Hierarchy
Supports Levels, Book Types, Units, Lessons, Exercises, Student Submissions, and Progress
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import Base


class ExerciseTypeEnum(str, Enum):
    GAP_FILL = "gap_fill"
    MULTIPLE_CHOICE = "mcq"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    SHORT_ANSWER = "short_answer"


class WorkbookStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class InteractiveWorkbook(Base):
    __tablename__ = "interactive_workbooks"

    id = Column(Integer, primary_key=True, index=True)
    
    # Institution association
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Hierarchy info
    level = Column(String(50), nullable=True)
    book_type = Column(String(50), default="student_book")  # student_book, workbook
    total_exercises = Column(Integer, default=0)

    # Status and timestamps
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    extracted_text = Column(Text, nullable=True)

    # Relationships
    exercises = relationship("WorkbookExercise", back_populates="workbook", cascade="all, delete-orphan")
    submissions = relationship("StudentExerciseSubmission", back_populates="workbook", cascade="all, delete-orphan")
    progress = relationship("WorkbookProgress", back_populates="workbook", cascade="all, delete-orphan")


class WorkbookExercise(Base):
    __tablename__ = "workbook_exercises"

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("interactive_workbooks.id"), nullable=False)

    # Hierarchy info
    unit_name = Column(String(255), nullable=False)
    lesson_name = Column(String(255), nullable=False)

    # Exercise content
    exercise_number = Column(Integer, nullable=False)
    exercise_type = Column(String(50), nullable=False)
    exercise_text = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    options = Column(JSON, nullable=True)
    correct_answer = Column(String(500), nullable=False)
    correct_answers_list = Column(JSON, nullable=True)
    case_sensitive = Column(Boolean, default=False)
    accept_partial = Column(Boolean, default=False)
    points = Column(Integer, default=1)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workbook = relationship("InteractiveWorkbook", back_populates="exercises")
    submissions = relationship("StudentExerciseSubmission", back_populates="exercise", cascade="all, delete-orphan")


class StudentExerciseSubmission(Base):
    __tablename__ = "student_exercise_submissions"

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("interactive_workbooks.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("workbook_exercises.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    student_answer = Column(String(1000), nullable=False)
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    teacher_feedback = Column(Text, nullable=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, nullable=True)

    workbook = relationship("InteractiveWorkbook", back_populates="submissions")
    exercise = relationship("WorkbookExercise", back_populates="submissions")


class WorkbookProgress(Base):
    __tablename__ = "workbook_progress"

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("interactive_workbooks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    total_exercises = Column(Integer, default=0)
    exercises_completed = Column(Integer, default=0)
    exercises_correct = Column(Integer, default=0)
    total_points = Column(Float, default=0.0)
    points_earned = Column(Float, default=0.0)
    completion_percentage = Column(Float, default=0.0)
    time_spent_minutes = Column(Float, default=0.0)

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workbook = relationship("InteractiveWorkbook", back_populates="progress")
