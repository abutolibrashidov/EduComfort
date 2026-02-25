from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class QuestionType(str, Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"
    essay = "essay"
    gap_filling = "gap_filling"
    matching = "matching"
    ordering = "ordering"
    diagram_labeling = "diagram_labeling"


class ExamStatus(str, Enum):
    draft = "draft"
    published = "published"
    in_progress = "in_progress"
    completed = "completed"
    archived = "archived"


class SubmissionStatus(str, Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"
    reviewed = "reviewed"


# ============ EXAM QUESTION SCHEMAS ============

class ExamQuestionCreate(BaseModel):
    question_text: str
    question_type: QuestionType = QuestionType.multiple_choice
    points: float = Field(default=1.0, ge=0)
    sequence_order: int
    
    # MCQ/True-False fields
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    
    # Advanced question type fields
    input_mode: Optional[str] = None
    reference_passage_id: Optional[int] = None
    
    # Gap-filling fields (JSON string)
    gaps: Optional[str] = None
    
    # Matching fields (JSON strings)
    left_items: Optional[str] = None
    right_items: Optional[str] = None
    correct_matches: Optional[str] = None
    
    # Ordering fields (JSON strings)
    items_to_order: Optional[str] = None
    correct_sequence: Optional[str] = None
    
    # Diagram labeling fields
    diagram_image_url: Optional[str] = None
    label_points: Optional[str] = None
    
    # Grading flags
    requires_teacher_grading: bool = False
    allow_multiple_answers: bool = False


class ExamQuestionResponse(ExamQuestionCreate):
    id: int
    exam_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ EXAM SCHEMAS ============

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    group_id: Optional[int] = None
    total_points: float = Field(default=100.0, ge=0)
    duration_minutes: Optional[int] = None
    passing_score: float = Field(default=50.0, ge=0, le=100)
    auto_grade: bool = True
    show_answers: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_file_based: bool = False
    file_path: Optional[str] = None
    file_name: Optional[str] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    total_points: Optional[float] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    auto_grade: Optional[bool] = None
    show_answers: Optional[bool] = None
    status: Optional[ExamStatus] = None


class ExamResponse(ExamCreate):
    id: int
    status: Optional[ExamStatus] = ExamStatus.draft
    created_by_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    # Override fields from ExamCreate to be Optional for database responses
    total_points: Optional[float] = 100.0
    passing_score: Optional[float] = 50.0
    auto_grade: Optional[bool] = True
    show_answers: Optional[bool] = False
    is_file_based: Optional[bool] = False

    class Config:
        from_attributes = True


class ExamDetailResponse(ExamResponse):
    questions: List[ExamQuestionResponse] = []


class ExamListResponse(ExamResponse):
    question_count: int = 0


# ============ EXAM HIERARCHY SCHEMAS ============

class ExamHierarchyVariant(BaseModel):
    variant: str
    exam_id: int
    title: str
    status: str
    question_count: int
    test_type: Optional[str] = None
    total_marks: Optional[float] = None
    estimated_time: Optional[int] = None
    source: Optional[str] = None

class ExamHierarchySet(BaseModel):
    set_num: int
    variants: List[ExamHierarchyVariant] = []

class ExamHierarchyUnit(BaseModel):
    unit: int
    sets: List[ExamHierarchySet] = []


# ============ EXAM SUBMISSION SCHEMAS ============

class ExamSubmissionCreate(BaseModel):
    pass


class ExamAnswerSubmit(BaseModel):
    question_id: int
    answer_text: Optional[str] = None


class ExamSubmissionUpdate(BaseModel):
    response_text: Optional[str] = None


class ExamSecurityEvent(BaseModel):
    event_type: str  # "tab_switch" or "warning"


class ExamAnswerResponse(BaseModel):
    id: int
    question_id: int
    answer_text: Optional[str] = None
    is_correct: Optional[bool] = None
    points_earned: Optional[float] = None

    class Config:
        from_attributes = True


class ExamSubmissionResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    total_score: Optional[float] = None
    score_obtained: Optional[float] = None
    percentage: Optional[float] = None
    is_passed: Optional[bool] = None
    status: Optional[SubmissionStatus] = SubmissionStatus.in_progress
    answers: List[ExamAnswerResponse] = []
    response_text: Optional[str] = None
    warning_count: Optional[int] = 0
    tab_switch_count: Optional[int] = 0
    admin_feedback: Optional[str] = None

    class Config:
        from_attributes = True
        use_enum_values = True


class ExamGradingResponse(BaseModel):
    submission_id: int
    score_obtained: float
    total_score: float
    percentage: float
    is_passed: bool
    correct_count: int
    wrong_count: int
    admin_feedback: Optional[str] = None


# ============ EXAM PERFORMANCE SCHEMAS ============

class ExamPerformanceDetailResponse(BaseModel):
    exam_id: int
    student_id: int
    score: float
    percentage: float
    total_questions: int
    correct_answers: int
    wrong_answers: int
    time_taken_minutes: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentExamPerformance(BaseModel):
    subject_id: int
    subject_name: str
    total_exams_taken: int
    exams_passed: int
    exams_failed: int
    average_exam_score: float
    best_exam_score: float
    worst_exam_score: float


class ExamDashboardResponse(BaseModel):
    """Dashboard summary for student's exam performance"""
    total_exams: int
    completed_exams: int
    pending_exams: int
    average_score: float
    recent_exams: List[ExamListResponse] = []
    performance_by_subject: List[StudentExamPerformance] = []
