from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class WorkbookSubmissionStatus(str, enum.Enum):
    """Status of workbook submission"""
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"


class WorkbookStatus(str, enum.Enum):
    """Status of workbook"""
    draft = "draft"
    published = "published"
    archived = "archived"


class Workbook(Base):
    """Teacher-uploaded workbook with tasks"""
    __tablename__ = "workbooks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Teacher who uploaded
    
    # File information
    file_path = Column(String(500), nullable=False)  # Path to uploaded file (PDF, DOCX, etc.)
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)  # PDF, DOCX, etc.
    file_size = Column(Integer, nullable=True)  # Size in bytes
    
    # Workbook details
    level = Column(String(50), nullable=True)  # e.g., "Beginner", "Intermediate", "Advanced"
    total_tasks = Column(Integer, default=0)  # Number of tasks/questions in the workbook
    max_points = Column(Float, default=100.0)  # Total possible points
    status = Column(Enum(WorkbookStatus), default=WorkbookStatus.draft)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    subject = relationship("Subject", backref="workbooks")
    created_by = relationship("User", backref="workbooks_created", foreign_keys=[created_by_id])
    submissions = relationship("WorkbookSubmission", back_populates="workbook", cascade="all, delete-orphan")


class WorkbookSubmission(Base):
    """Student's workbook submission (answers to the tasks)"""
    __tablename__ = "workbook_submissions"

    id = Column(Integer, primary_key=True, index=True)
    workbook_id = Column(Integer, ForeignKey("workbooks.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Student's work
    submission_file_path = Column(String(500), nullable=True)  # Path to student's completed workbook/answers
    submission_notes = Column(Text, nullable=True)  # Text answers or notes
    
    # Grading (teacher grades manually)
    score_obtained = Column(Float, nullable=True)  # Teacher assigns score
    max_score = Column(Float, nullable=True)  # Total possible score
    percentage = Column(Float, nullable=True)  # Calculated percentage
    teacher_feedback = Column(Text, nullable=True)  # Teacher's feedback on work
    
    # Status
    status = Column(Enum(WorkbookSubmissionStatus), default=WorkbookSubmissionStatus.not_started)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)  # When student started
    submitted_at = Column(DateTime, nullable=True)  # When student submitted
    graded_at = Column(DateTime, nullable=True)  # When teacher graded
    
    # Teacher-only (not sent to admin)
    submitted_to_teacher = Column(Boolean, default=False)
    teacher_notified_at = Column(DateTime, nullable=True)
    
    # Relationships
    workbook = relationship("Workbook", back_populates="submissions")
    student = relationship("User", backref="workbook_submissions", foreign_keys=[student_id])

