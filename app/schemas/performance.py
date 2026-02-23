from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class StudentPerformanceResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    
    # Exam metrics
    total_exams_taken: int
    exams_passed: int
    exams_failed: int
    average_exam_score: float
    best_exam_score: float
    worst_exam_score: float
    
    # Workbook metrics
    total_workbooks_completed: int
    average_workbook_score: float
    best_workbook_score: float
    worst_workbook_score: float
    
    # Overall
    overall_percentage: float
    grade: str
    score_trend: str
    last_score: float
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_assessed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PerformanceSummary(BaseModel):
    """Overall performance summary for a student"""
    student_id: int
    total_subjects: int
    average_overall_score: float
    highest_subject: Optional[str] = None
    lowest_subject: Optional[str] = None
    grade_distribution: dict = {}
    
    # Activity metrics
    total_exams_submitted: int
    total_workbooks_completed: int
    total_questions_answered: int
    
    # Performance trends
    improving_subjects: list = []
    declining_subjects: list = []
    stable_subjects: list = []


class SubjectPerformanceReport(BaseModel):
    """Detailed performance report for a single subject"""
    subject_id: int
    subject_name: str
    student_id: int
    
    # Exam details
    total_exams: int
    exams_passed: int
    pass_rate: float
    average_exam_score: float
    
    # Workbook details
    total_workbooks: int
    average_workbook_score: float
    
    # Combined metrics
    overall_score: float
    grade: str
    trend: str
    
    # Recent activity
    last_exam_score: Optional[float] = None
    last_workbook_score: Optional[float] = None
    last_assessed: Optional[datetime] = None


class AdminPerformanceDashboard(BaseModel):
    """Admin view of all students' performance"""
    total_students: int
    subjects_covered: int
    average_class_score: float
    
    # Performance distribution
    excellent_count: int  # A grade
    good_count: int       # B grade
    average_count: int    # C grade
    poor_count: int       # D-F grade
    
    # Activity metrics
    exams_submitted: int
    workbooks_completed: int
    pending_evaluations: int
    
    # Top performers
    top_students: list = []
    needs_improvement: list = []


class StudentScoreCard(BaseModel):
    """Quick score card for a student"""
    student_id: int
    student_name: str
    
    # Subject scores
    english_score: Optional[float] = None
    math_score: Optional[float] = None
    mother_tongue_score: Optional[float] = None
    
    # Overall
    overall_score: float
    overall_grade: str
    
    # Status
    passing: bool
    performance_trend: str
    
    # Recent activity
    last_activity: Optional[datetime] = None
    exams_pending: int
    workbooks_pending: int


class ClassPerformanceAnalytics(BaseModel):
    """Class-wide performance analytics"""
    total_students: int
    average_score: float
    median_score: float
    highest_score: float
    lowest_score: float
    
    # By subject
    english_average: float
    math_average: float
    mother_tongue_average: float
    
    # Performance distribution
    score_distribution: dict  # Score ranges and counts
    
    # Weak areas (topics where many students struggle)
    weak_topics: list = []
    
    # Strong areas (topics where many students excel)
    strong_topics: list = []
