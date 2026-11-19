"""
Student Books Model
Books assigned by teachers to students or groups
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base


class StudentBook(Base):
    """Books assigned to students by teachers"""
    __tablename__ = "student_books"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Book information
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    
    # File storage
    file_path = Column(String(500), nullable=False)
    cover_image = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    file_type = Column(String(50), nullable=True)  # pdf, epub, etc.
    
    # Assignment information
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_to_group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    assigned_to_student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # Flags
    is_required = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subject = relationship("Subject", backref="books")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id], backref="books_assigned")
    assigned_to_group = relationship("Group", foreign_keys=[assigned_to_group_id], backref="assigned_books")
    assigned_to_student = relationship("User", foreign_keys=[assigned_to_student_id], backref="my_books")
    processing_jobs = relationship("BookProcessingJob", back_populates="book", cascade="all, delete-orphan")
    content = relationship("BookContent", back_populates="book", cascade="all, delete-orphan")
