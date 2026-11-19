"""
Book Content Models
Stores extracted book content and student progress
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base


class BookContent(Base):
    """Extracted content from books (chapters, pages, exercises)"""
    __tablename__ = "book_contents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Link to StudentBook
    book_id = Column(Integer, ForeignKey("student_books.id", ondelete="CASCADE"), nullable=False)
    
    # Chapter information
    chapter_number = Column(Integer, nullable=False)
    chapter_title = Column(String(500), nullable=True)
    
    # Page information
    page_number = Column(Integer, nullable=False)
    page_content = Column(Text, nullable=False)
    
    # Exercises on this page (JSON array)
    exercises = Column(JSON, nullable=True)  # [{exercise_number, type, text, options, correct_answer}]
    
    # Metadata
    processing_method = Column(String(50), nullable=True)
    ocr_confidence = Column(Float, default=0.0)
    needs_review = Column(Boolean, default=False)  # Flag for low-confidence OCR
    
    # Review fields (Phase 3)
    reviewed_text = Column(Text, nullable=True)  # Teacher-corrected text
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Teacher who reviewed
    reviewed_at = Column(DateTime, nullable=True)  # When reviewed
    is_reviewed = Column(Boolean, default=False)  # Review status
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    answers = relationship("StudentBookAnswer", back_populates="book_content", cascade="all, delete-orphan")
    book = relationship("StudentBook", back_populates="content")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class StudentBookProgress(Base):
    """Track student reading progress through books"""
    __tablename__ = "student_book_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Student and book
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("student_books.id", ondelete="CASCADE"), nullable=False)
    
    # Progress tracking
    current_page = Column(Integer, default=1)
    current_chapter = Column(Integer, default=1)
    total_pages_read = Column(Integer, default=0)
    completion_percentage = Column(Float, default=0.0)
    
    # Time tracking
    time_spent_minutes = Column(Float, default=0.0)
    last_read_at = Column(DateTime, default=datetime.utcnow)
    
    # Bookmarks (JSON array of page numbers)
    bookmarks = Column(JSON, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])


class StudentBookAnswer(Base):
    """Student answers to book exercises"""
    __tablename__ = "student_book_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Student, book, and exercise
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(Integer, ForeignKey("student_books.id", ondelete="CASCADE"), nullable=False)
    content_id = Column(Integer, ForeignKey("book_contents.id", ondelete="CASCADE"), nullable=False)
    exercise_number = Column(String(50), nullable=False)
    
    # Answer data
    student_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    
    # Feedback
    auto_feedback = Column(Text, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, nullable=True)
    
    # Relationships
    book_content = relationship("BookContent", back_populates="answers")
    student = relationship("User", foreign_keys=[student_id])
