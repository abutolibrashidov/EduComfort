"""
Interactive Book Subsystem Models
AI-powered book processing with units, exercises, progress tracking, and teacher review
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, 
    ForeignKey, JSON, CheckConstraint, Index, ARRAY, Computed
)
from sqlalchemy.orm import relationship
# from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.base import Base


class Book(Base):
    """
    Books uploaded for AI processing and conversion to interactive learning content.
    
    Stores book metadata, AI processing status, quality metrics, and publication status.
    Replaces/enhances StudentBook for the interactive book subsystem.
    """
    __tablename__ = "books"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Book Information
    title = Column(String(500), nullable=False)
    author = Column(String(255), nullable=True)
    isbn = Column(String(20), nullable=True)
    publisher = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(50), nullable=True)
    language = Column(String(50), default='en')
    
    # File Information
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(20), nullable=False)  # 'pdf', 'docx', 'epub'
    file_size_bytes = Column(Integer, nullable=True)
    total_pages = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True, index=True)
    
    # Processing Status
    processing_status = Column(
        String(50), 
        default='pending',
        index=True
    )  # 'pending', 'processing', 'completed', 'failed', 'needs_review'
    
    ai_processing_job_id = Column(String(255), nullable=True)
    ai_model_used = Column(String(100), nullable=True)  # e.g., 'gpt-4', 'claude-3.5'
    ai_processing_cost = Column(Float, nullable=True)  # Track actual cost in USD
    ai_processed_at = Column(DateTime, nullable=True)
    
    # Quality Metrics
    overall_confidence = Column(Float, nullable=True)  # Average AI confidence (0-100)
    ocr_confidence = Column(Float, nullable=True)  # If OCR was used
    extraction_quality = Column(String(50), nullable=True)  # 'high', 'medium', 'low'
    
    # Review Status
    needs_manual_review = Column(Boolean, default=False, index=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, index=True)  # Ready for students
    
    # Metadata (JSON)
    book_metadata = Column(JSON, nullable=True)
    # Example: {"topics": ["biology", "cells"], "difficulty": "intermediate"}
    
    # Institution & Ownership
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    units = relationship("Unit", back_populates="book", cascade="all, delete-orphan")
    book_progress = relationship("BookProgress", back_populates="book", cascade="all, delete-orphan")
    ai_logs = relationship("AIProcessingLog", back_populates="book", cascade="all, delete-orphan")
    teacher_reviews = relationship("TeacherReview", back_populates="book", cascade="all, delete-orphan")
    
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    uploader = relationship("User", foreign_keys=[uploaded_by_user_id])
    institution = relationship("Institution", foreign_keys=[institution_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_books_institution', 'institution_id'),
        Index('idx_books_status', 'processing_status'),
        Index('idx_books_published', 'is_published'),
        Index('idx_books_subject', 'subject'),
        Index('idx_books_metadata', 'book_metadata'),
    )
    
    def __repr__(self):
        return f"<Book(id={self.id}, title='{self.title}', status='{self.processing_status}')>"


class Unit(Base):
    """
    Logical learning units (lessons/chapters) within a book.
    
    Represents structured segments of content with learning objectives,
    page ranges, and associated exercises.
    """
    __tablename__ = "units"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Book Relationship
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Unit Information
    unit_number = Column(Integer, nullable=False)  # Sequential order
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Page Range
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)
    page_count = Column(Integer, Computed("end_page - start_page + 1"))
    
    # Learning Objectives (PostgreSQL array)
    learning_objectives = Column(JSON, nullable=True)
    prerequisites = Column(JSON, nullable=True)
    
    # AI Extraction Metadata
    ai_confidence = Column(Float, nullable=True)  # Confidence in unit segmentation
    ai_generated = Column(Boolean, default=True)
    extraction_method = Column(String(50), nullable=True)  # 'ai_detected', 'manual', 'hybrid'
    
    # Review Status
    needs_review = Column(Boolean, default=False, index=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    teacher_notes = Column(Text, nullable=True)
    
    # Content
    content_text = Column(Text, nullable=True)  # Extracted lesson content
    content_html = Column(Text, nullable=True)  # Formatted version
    
    # Metadata
    estimated_duration_min = Column(Integer, nullable=True)
    difficulty_level = Column(String(50), nullable=True)  # 'beginner', 'intermediate', 'advanced'
    tags = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    book = relationship("Book", back_populates="units")
    exercises = relationship("Exercise", back_populates="unit", cascade="all, delete-orphan")
    unit_progress = relationship("UnitProgress", back_populates="unit", cascade="all, delete-orphan")
    teacher_reviews = relationship("TeacherReview", back_populates="unit", cascade="all, delete-orphan")
    
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('end_page >= start_page', name='check_page_range'),
        Index('idx_units_book', 'book_id'),
        Index('idx_units_needs_review', 'needs_review'),
        Index('idx_units_book_number', 'book_id', 'unit_number', unique=True),
    )
    
    def __repr__(self):
        return f"<Unit(id={self.id}, book_id={self.book_id}, title='{self.title}')>"


class Exercise(Base):
    """
    Individual exercises/questions within units.
    
    Supports multiple question types (MCQ, gap-fill, matching, etc.) with
    flexible JSONB storage for options and answers. Includes AI confidence
    scores and teacher review tracking.
    """
    __tablename__ = "exercises"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Exercise Information
    exercise_number = Column(String(50), nullable=False)  # e.g., "1", "2a", "Q3"
    sequence_order = Column(Integer, nullable=False)  # For sorting
    
    # Exercise Type
    exercise_type = Column(String(50), nullable=False, index=True)
    # Values: 'multiple_choice', 'gap_filling', 'true_false', 'matching', 
    #         'ordering', 'short_answer', 'essay', 'diagram_labeling', 'custom'
    
    # Content
    question_text = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    context_passage = Column(Text, nullable=True)
    
    # Options (JSONB for flexibility)
    options = Column(JSON, nullable=True)
    # Examples:
    # MCQ: {"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}
    # Gap-fill: {"gaps": [{"position": 0, "answer": "mitochondria", "distractors": ["nucleus"]}]}
    # Matching: {"left": [{"id": "L1", "text": "..."}], "right": [{"id": "R1", "text": "..."}]}
    
    # Answer
    correct_answer = Column(JSON, nullable=False)
    # Examples:
    # MCQ: "B"
    # Gap-fill: ["mitochondria", "ATP"]
    # Matching: {"L1": "R2", "L2": "R1"}
    
    alternative_answers = Column(JSON, nullable=True)
    
    # Grading
    points = Column(Float, default=1.0, nullable=False)
    auto_gradable = Column(Boolean, default=True)
    requires_teacher_grading = Column(Boolean, default=False)
    
    # AI Metadata
    ai_confidence = Column(Float, nullable=True)  # Confidence in extraction (0-100)
    ai_generated = Column(Boolean, default=True)
    extraction_source = Column(String(50), nullable=True)  # 'ai_detected', 'manual', 'imported'
    
    # Review Status
    needs_review = Column(Boolean, default=False, index=True)
    review_reason = Column(String(255), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    teacher_corrections = Column(JSON, nullable=True)  # Track what was changed
    
    # Pedagogical Metadata
    difficulty_level = Column(String(50), nullable=True)
    bloom_taxonomy_level = Column(String(50), nullable=True)
    estimated_time_seconds = Column(Integer, nullable=True)
    hints = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=True)
    
    # Media
    image_url = Column(String(1000), nullable=True)
    diagram_url = Column(String(1000), nullable=True)
    
    # Page Reference
    source_page_number = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    unit = relationship("Unit", back_populates="exercises")
    book = relationship("Book")
    student_answers = relationship("StudentAnswer", back_populates="exercise", cascade="all, delete-orphan")
    teacher_reviews = relationship("TeacherReview", back_populates="exercise", cascade="all, delete-orphan")
    
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_exercises_unit', 'unit_id'),
        Index('idx_exercises_book', 'book_id'),
        Index('idx_exercises_type', 'exercise_type'),
        Index('idx_exercises_needs_review', 'needs_review'),
        Index('idx_exercises_sequence', 'unit_id', 'sequence_order'),
        Index('idx_exercises_options', 'options'),
    )
    
    def __repr__(self):
        return f"<Exercise(id={self.id}, type='{self.exercise_type}', number='{self.exercise_number}')>"


class StudentAnswer(Base):
    """
    Student submissions for exercises.
    
    Tracks answers, grading results, feedback, and attempt history.
    """
    __tablename__ = "student_answers"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Answer Data
    submitted_answer = Column(JSON, nullable=False)
    # Format matches exercise type (string, array, object)
    
    # Grading
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    points_possible = Column(Float, nullable=True)
    
    # Feedback
    auto_feedback = Column(Text, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    graded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime, nullable=True)
    
    # Attempt Tracking
    attempt_number = Column(Integer, default=1, nullable=False)
    is_final_attempt = Column(Boolean, default=False)
    
    # Metadata
    time_spent_seconds = Column(Integer, nullable=True)
    confidence_level = Column(String(50), nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    exercise = relationship("Exercise", back_populates="student_answers")
    unit = relationship("Unit")
    book = relationship("Book")
    grader = relationship("User", foreign_keys=[graded_by_user_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('points_earned <= points_possible', name='check_points_earned'),
        Index('idx_student_answers_student', 'student_id'),
        Index('idx_student_answers_exercise', 'exercise_id'),
        Index('idx_student_answers_unit', 'unit_id'),
        Index('idx_student_answers_book', 'book_id'),
        Index('idx_student_answers_grading', 'is_correct', 'graded_at'),
        Index('idx_student_answers_composite', 'student_id', 'exercise_id', 'attempt_number'),
    )
    
    def __repr__(self):
        return f"<StudentAnswer(id={self.id}, student_id={self.student_id}, exercise_id={self.exercise_id})>"


class UnitProgress(Base):
    """
    Student progress through individual units.
    
    Tracks completion, scoring, time spent, and mastery level per unit.
    """
    __tablename__ = "unit_progress"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Progress Tracking
    status = Column(String(50), default='not_started', index=True)
    # Values: 'not_started', 'in_progress', 'completed', 'mastered'
    
    completion_percentage = Column(Float, default=0.0)
    
    # Exercise Statistics
    total_exercises = Column(Integer, default=0)
    exercises_attempted = Column(Integer, default=0)
    exercises_correct = Column(Integer, default=0)
    
    # Scoring (computed column)
    total_points_earned = Column(Float, default=0.0)
    total_points_possible = Column(Float, default=0.0)
    score_percentage = Column(
        Float,
        Computed("CASE WHEN total_points_possible > 0 THEN (total_points_earned / total_points_possible) * 100 ELSE 0 END")
    )
    
    # Time Tracking
    time_spent_seconds = Column(Integer, default=0)
    estimated_time_remaining = Column(Integer, nullable=True)
    
    # Reading Progress
    current_page = Column(Integer, nullable=True)
    pages_read = Column(Integer, default=0)
    reading_percentage = Column(Float, default=0.0)
    
    # Engagement Metrics
    last_accessed_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=0)
    
    # Mastery Indicators
    mastery_level = Column(String(50), nullable=True)  # 'novice', 'developing', 'proficient', 'mastered'
    needs_help = Column(Boolean, default=False)
    flagged_for_teacher = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    unit = relationship("Unit", back_populates="unit_progress")
    book = relationship("Book")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100', name='check_completion_percentage'),
        CheckConstraint('exercises_attempted <= total_exercises', name='check_exercises_attempted'),
        CheckConstraint('exercises_correct <= exercises_attempted', name='check_exercises_correct'),
        Index('idx_unit_progress_student', 'student_id'),
        Index('idx_unit_progress_unit', 'unit_id'),
        Index('idx_unit_progress_book', 'book_id'),
        Index('idx_unit_progress_status', 'status'),
        Index('idx_unit_progress_composite', 'student_id', 'book_id', 'status'),
        Index('idx_unit_progress_unique', 'student_id', 'unit_id', unique=True),
    )
    
    def __repr__(self):
        return f"<UnitProgress(id={self.id}, student_id={self.student_id}, unit_id={self.unit_id}, status='{self.status}')>"


class BookProgress(Base):
    """
    Aggregated student progress at the book level.
    
    Consolidates progress across all units in a book.
    """
    __tablename__ = "book_progress"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Overall Progress
    status = Column(String(50), default='not_started', index=True)
    completion_percentage = Column(Float, default=0.0)
    
    # Unit Statistics
    total_units = Column(Integer, default=0)
    units_started = Column(Integer, default=0)
    units_completed = Column(Integer, default=0)
    
    # Exercise Statistics
    total_exercises = Column(Integer, default=0)
    exercises_attempted = Column(Integer, default=0)
    exercises_correct = Column(Integer, default=0)
    
    # Scoring (computed column)
    total_points_earned = Column(Float, default=0.0)
    total_points_possible = Column(Float, default=0.0)
    overall_score_percentage = Column(
        Float,
        Computed("CASE WHEN total_points_possible > 0 THEN (total_points_earned / total_points_possible) * 100 ELSE 0 END")
    )
    
    # Time Tracking
    total_time_spent_seconds = Column(Integer, default=0)
    
    # Current Position
    current_unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    current_page = Column(Integer, nullable=True)
    
    # Bookmarks
    bookmarks = Column(JSON, nullable=True)
    # Array of {unit_id, page, note, timestamp}
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    book = relationship("Book", back_populates="book_progress")
    current_unit = relationship("Unit", foreign_keys=[current_unit_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100', name='check_book_completion_percentage'),
        Index('idx_book_progress_student', 'student_id'),
        Index('idx_book_progress_book', 'book_id'),
        Index('idx_book_progress_status', 'status'),
        Index('idx_book_progress_composite', 'student_id', 'status', 'completion_percentage'),
        Index('idx_book_progress_unique', 'student_id', 'book_id', unique=True),
    )
    
    def __repr__(self):
        return f"<BookProgress(id={self.id}, student_id={self.student_id}, book_id={self.book_id}, completion={self.completion_percentage}%)>"


class AIProcessingLog(Base):
    """
    Audit trail for AI processing operations.
    
    Tracks AI model usage, costs, performance metrics, and errors.
    """
    __tablename__ = "ai_processing_logs"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Processing Details
    job_id = Column(String(255), nullable=False, index=True)
    operation_type = Column(String(50), nullable=False)  # 'extraction', 'segmentation', 'exercise_generation'
    ai_model = Column(String(100), nullable=False)
    
    # Input/Output
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    
    # Metrics
    tokens_used = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    cost_usd = Column(Float, nullable=True)
    
    # Quality
    confidence_score = Column(Float, nullable=True)
    error_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    
    # Status
    status = Column(String(50), index=True)  # 'success', 'partial', 'failed'
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    book = relationship("Book", back_populates="ai_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_ai_logs_book', 'book_id'),
        Index('idx_ai_logs_job', 'job_id'),
        Index('idx_ai_logs_status', 'status'),
        Index('idx_ai_logs_timestamp', 'created_at'),
    )
    
    def __repr__(self):
        return f"<AIProcessingLog(id={self.id}, job_id='{self.job_id}', status='{self.status}')>"


class TeacherReview(Base):
    """
    Teacher review actions and corrections.
    
    Tracks teacher feedback, quality ratings, and content corrections.
    """
    __tablename__ = "teacher_reviews"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Review Type
    review_type = Column(String(50), nullable=False, index=True)  # 'book', 'unit', 'exercise'
    
    # Review Action
    action = Column(String(50), nullable=False, index=True)  # 'approved', 'rejected', 'corrected'
    
    # Changes Made
    original_data = Column(JSON, nullable=True)
    corrected_data = Column(JSON, nullable=True)
    changes_summary = Column(Text, nullable=True)
    
    # Feedback
    review_notes = Column(Text, nullable=True)
    quality_rating = Column(Integer, nullable=True)  # 1-5 rating
    
    # Timestamp
    reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id])
    book = relationship("Book", back_populates="teacher_reviews")
    unit = relationship("Unit", back_populates="teacher_reviews")
    exercise = relationship("Exercise", back_populates="teacher_reviews")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('quality_rating >= 1 AND quality_rating <= 5', name='check_quality_rating'),
        Index('idx_teacher_reviews_teacher', 'teacher_id'),
        Index('idx_teacher_reviews_book', 'book_id'),
        Index('idx_teacher_reviews_type', 'review_type'),
        Index('idx_teacher_reviews_action', 'action'),
    )
    
    def __repr__(self):
        return f"<TeacherReview(id={self.id}, type='{self.review_type}', action='{self.action}')>"
