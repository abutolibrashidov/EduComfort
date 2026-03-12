from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.models.base import Base


class ExamStatus(str, enum.Enum):
    """Status of an exam"""
    draft = "draft"
    published = "published"
    in_progress = "in_progress"
    completed = "completed"
    archived = "archived"


class QuestionType(str, enum.Enum):
    """Types of exam questions"""
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"
    essay = "essay"
    gap_filling = "gap_filling"
    matching = "matching"
    ordering = "ordering"
    diagram_labeling = "diagram_labeling"


class SubmissionStatus(str, enum.Enum):
    """Status of exam submission"""
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"
    reviewed = "reviewed"


class Exam(Base):
    """Exam model"""
    __tablename__ = "exams"

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
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Targeted group
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Teacher/Admin who created
    
    # Exam settings
    total_points = Column(Float, default=100.0)
    duration_minutes = Column(Integer, nullable=True)  # How long to complete
    passing_score = Column(Float, default=50.0)
    status = Column(Enum(ExamStatus), default=ExamStatus.draft)
    
    # Auto-grading
    auto_grade = Column(Boolean, default=True)  # Auto-grade on submission
    show_answers = Column(Boolean, default=False)  # Show correct answers after submission
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # File-based exam (PDF/Word paper)
    is_file_based = Column(Boolean, default=False)
    file_path = Column(String(500), nullable=True)  # Path to the exam paper
    file_name = Column(String(255), nullable=True)
    
    # JSON test import fields
    custom_data = Column(Text, nullable=True)  # JSON: {level, unit, set, variant, source}
    is_imported = Column(Boolean, default=False)  # Flag for imported tests
    
    # Relationships
    subject = relationship("Subject", backref="exams")
    group = relationship("Group", backref="exams_list")
    created_by = relationship("User", backref="exams_created", foreign_keys=[created_by_id])
    questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    submissions = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestion(Base):
    """Individual exam questions"""
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    
    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), default=QuestionType.multiple_choice)
    points = Column(Float, default=1.0)
    sequence_order = Column(Integer, nullable=False)  # Question order
    
    # For MCQ/True-False
    option_a = Column(String(500), nullable=True)
    option_b = Column(String(500), nullable=True)
    option_c = Column(String(500), nullable=True)
    option_d = Column(String(500), nullable=True)
    
    correct_answer = Column(String(500), nullable=True)  # Correct answer
    
    # Explanation (shown after submission if auto_grade=True)
    explanation = Column(Text, nullable=True)  # Explanation for answer
    
    # Advanced question type fields (stored as JSON)
    input_mode = Column(String(50), nullable=True)  # dropdown, text_input, radio, drag_drop, etc.
    reference_passage_id = Column(Integer, nullable=True)  # Link to passage if applicable
    
    # Gap-filling fields
    gaps = Column(Text, nullable=True)  # JSON: [{"position": 0, "answer": "...", "distractors": [...]}]
    
    # Matching fields
    left_items = Column(Text, nullable=True)  # JSON: [{"id": 1, "text": "..."}]
    right_items = Column(Text, nullable=True)  # JSON: [{"id": 1, "text": "..."}]
    correct_matches = Column(Text, nullable=True)  # JSON: {"1": "3", "2": "1", ...}
    
    # Ordering fields
    items_to_order = Column(Text, nullable=True)  # JSON: [{"id": 1, "text": "..."}]
    correct_sequence = Column(Text, nullable=True)  # JSON: [2, 1, 3, 4]
    
    # Diagram labeling fields
    diagram_image_url = Column(String(500), nullable=True)
    label_points = Column(Text, nullable=True)  # JSON: [{"x": 100, "y": 200, "answer": "..."}]
    
    # Grading flags
    requires_teacher_grading = Column(Boolean, default=False)
    allow_multiple_answers = Column(Boolean, default=False)  # For MCQ with multiple correct
    
    # JSON import fields
    additional_data = Column(Text, nullable=True)  # JSON: {acceptableVariants, provided_words, beforeBlank, afterBlank}
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    answers = relationship("ExamAnswer", back_populates="question", cascade="all, delete-orphan")


class ExamSubmission(Base):
    """Student exam submissions"""
    __tablename__ = "exam_submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Scoring
    score_obtained = Column(Float, nullable=True)  # Will be auto-calculated
    total_score = Column(Float, nullable=True)  # Total possible score
    percentage = Column(Float, nullable=True)  # Percentage score
    is_passed = Column(Boolean, nullable=True)  # Pass/Fail
    
    # Status
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.in_progress)
    
    # Security tracking
    tab_switch_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)
    
    # Times
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    
    # Auto-submitted to admin
    submitted_to_admin = Column(Boolean, default=False)
    admin_notified_at = Column(DateTime, nullable=True)
    
    # Feedback
    admin_feedback = Column(Text, nullable=True)
    
    # File-based response
    response_text = Column(Text, nullable=True)  # Consolidated student answer
    response_file_path = Column(String(500), nullable=True)  # Optional student upload
    
    # Relationships
    exam = relationship("Exam", back_populates="submissions")
    student = relationship("User", backref="exam_submissions", foreign_keys=[student_id])
    answers = relationship("ExamAnswer", back_populates="submission", cascade="all, delete-orphan")


class ExamAnswer(Base):
    """Student's answers to exam questions"""
    __tablename__ = "exam_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("exam_submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("exam_questions.id"), nullable=False)
    
    # Student's answer
    answer_text = Column(Text, nullable=True)
    
    # Auto-grading result
    is_correct = Column(Boolean, nullable=True)  # True/False/None (for essay)
    points_earned = Column(Float, default=0.0)
    
    # Timestamp
    answered_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    submission = relationship("ExamSubmission", back_populates="answers")
    question = relationship("ExamQuestion", back_populates="answers")
