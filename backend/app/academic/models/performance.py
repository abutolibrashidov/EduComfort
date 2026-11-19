from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.models.base import Base


class StudentPerformance(Base):
    """Student's performance metrics across subjects"""
    __tablename__ = "student_performance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    
    # Exam performance
    total_exams_taken = Column(Integer, default=0)
    exams_passed = Column(Integer, default=0)
    exams_failed = Column(Integer, default=0)
    average_exam_score = Column(Float, default=0.0)
    best_exam_score = Column(Float, default=0.0)
    worst_exam_score = Column(Float, default=100.0)
    
    # Workbook performance
    total_workbooks_completed = Column(Integer, default=0)
    average_workbook_score = Column(Float, default=0.0)
    best_workbook_score = Column(Float, default=0.0)
    worst_workbook_score = Column(Float, default=100.0)
    
    # Overall
    overall_percentage = Column(Float, default=0.0)  # Combined score
    grade = Column(String(5), default="F")  # A+, A, B+, B, C, D, F
    
    # Trending
    score_trend = Column(String(50), default="stable")  # improving, declining, stable
    last_score = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_assessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    student = relationship("User", backref="performance_records", foreign_keys=[student_id])
    subject = relationship("Subject", backref="performance_records")

    @classmethod
    def calculate_grade(cls, percentage):
        """Convert percentage to letter grade"""
        if percentage >= 90:
            return "A+"
        elif percentage >= 85:
            return "A"
        elif percentage >= 80:
            return "B+"
        elif percentage >= 75:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"


class ExamPerformanceDetail(Base):
    """Detailed breakdown of exam performance"""
    __tablename__ = "exam_performance_detail"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("exam_submissions.id"), nullable=False)
    
    # Question-wise performance
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    skipped_questions = Column(Integer, default=0)
    
    # Time metrics
    time_taken_minutes = Column(Integer, nullable=True)
    
    # Weak areas
    weak_topics = Column(String(500), nullable=True)  # JSON or comma-separated
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("User", backref="exam_performance_details")
    exam = relationship("Exam")
    submission = relationship("ExamSubmission")


class WorkbookPerformanceDetail(Base):
    """Detailed breakdown of workbook performance"""
    __tablename__ = "workbook_performance_detail"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workbook_id = Column(Integer, ForeignKey("workbooks.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("workbook_submissions.id"), nullable=False)
    
    # Performance metrics
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    partially_correct = Column(Integer, default=0)
    
    # Time spent
    time_spent_minutes = Column(Integer, nullable=True)
    
    # Areas of strength/weakness
    strong_topics = Column(String(500), nullable=True)
    weak_topics = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("User", backref="workbook_performance_details")
    workbook = relationship("Workbook")
    submission = relationship("WorkbookSubmission")
