"""
Pydantic schemas for Interactive Book Subsystem
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# Enums
class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class UnitStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MASTERED = "mastered"


class ExerciseType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    GAP_FILLING = "gap_filling"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    ORDERING = "ordering"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    DIAGRAM_LABELING = "diagram_labeling"
    CUSTOM = "custom"


class ReviewAction(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"


# Book Schemas
class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    language: str = "en"


class BookCreate(BookBase):
    file_path: str
    file_type: str
    institution_id: Optional[int] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    is_published: Optional[bool] = None
    review_notes: Optional[str] = None


class BookResponse(BookBase):
    id: int
    file_path: str
    file_type: str
    file_size_bytes: Optional[int]
    total_pages: Optional[int]
    processing_status: str
    ai_model_used: Optional[str]
    ai_processing_cost: Optional[float]
    overall_confidence: Optional[float]
    needs_manual_review: bool
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class BookWithUnits(BookResponse):
    units: List['UnitResponse'] = []


# Unit Schemas
class UnitBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_page: int
    end_page: int
    learning_objectives: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    estimated_duration_min: Optional[int] = None
    difficulty_level: Optional[str] = None


class UnitCreate(UnitBase):
    book_id: int
    unit_number: int
    content_text: Optional[str] = None


class UnitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    learning_objectives: Optional[List[str]] = None
    content_text: Optional[str] = None
    teacher_notes: Optional[str] = None


class UnitResponse(UnitBase):
    id: int
    book_id: int
    unit_number: int
    page_count: Optional[int]
    ai_confidence: Optional[float]
    needs_review: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UnitWithExercises(UnitResponse):
    exercises: List['ExerciseResponse'] = []


# Exercise Schemas
class ExerciseBase(BaseModel):
    exercise_number: str
    exercise_type: ExerciseType
    question_text: str
    instructions: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    correct_answer: Any
    points: float = 1.0
    hints: Optional[List[str]] = None
    explanation: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    unit_id: int
    book_id: int
    sequence_order: int
    auto_gradable: bool = True


class ExerciseUpdate(BaseModel):
    question_text: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    correct_answer: Optional[Any] = None
    explanation: Optional[str] = None
    teacher_corrections: Optional[Dict[str, Any]] = None


class ExerciseResponse(ExerciseBase):
    id: int
    unit_id: int
    book_id: int
    sequence_order: int
    auto_gradable: bool
    requires_teacher_grading: bool
    ai_confidence: Optional[float]
    needs_review: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Student Answer Schemas
class StudentAnswerCreate(BaseModel):
    exercise_id: int
    submitted_answer: Any
    time_spent_seconds: Optional[int] = None
    confidence_level: Optional[str] = None


class StudentAnswerResponse(BaseModel):
    id: int
    student_id: int
    exercise_id: int
    submitted_answer: Any
    is_correct: Optional[bool]
    points_earned: float
    points_possible: Optional[float]
    auto_feedback: Optional[str]
    teacher_feedback: Optional[str]
    attempt_number: int
    submitted_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Progress Schemas
class UnitProgressResponse(BaseModel):
    id: int
    student_id: int
    unit_id: int
    book_id: int
    status: str
    completion_percentage: float
    total_exercises: int
    exercises_attempted: int
    exercises_correct: int
    score_percentage: Optional[float]
    time_spent_seconds: int
    last_accessed_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class UnitProgressUpdate(BaseModel):
    current_page: Optional[int] = None
    time_spent_seconds: Optional[int] = None


class BookProgressResponse(BaseModel):
    id: int
    student_id: int
    book_id: int
    status: str
    completion_percentage: float
    total_units: int
    units_completed: int
    total_exercises: int
    exercises_attempted: int
    exercises_correct: int
    overall_score_percentage: Optional[float]
    total_time_spent_seconds: int
    current_unit_id: Optional[int]
    last_accessed_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


# Teacher Review Schemas
class TeacherReviewCreate(BaseModel):
    review_type: str  # 'book', 'unit', 'exercise'
    action: ReviewAction
    book_id: Optional[int] = None
    unit_id: Optional[int] = None
    exercise_id: Optional[int] = None
    original_data: Optional[Dict[str, Any]] = None
    corrected_data: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None
    quality_rating: Optional[int] = Field(None, ge=1, le=5)


class TeacherReviewResponse(BaseModel):
    id: int
    teacher_id: int
    review_type: str
    action: str
    book_id: Optional[int]
    unit_id: Optional[int]
    exercise_id: Optional[int]
    review_notes: Optional[str]
    quality_rating: Optional[int]
    reviewed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# AI Processing Log Schemas
class AIProcessingLogResponse(BaseModel):
    id: int
    book_id: Optional[int]
    job_id: str
    operation_type: str
    ai_model: str
    tokens_used: Optional[int]
    processing_time_ms: Optional[int]
    cost_usd: Optional[float]
    confidence_score: Optional[float]
    status: str
    error_message: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Trigger AI Processing
class AIProcessingTrigger(BaseModel):
    book_id: int
    operation_type: str  # 'full_extraction', 'unit_segmentation', 'exercise_generation'
    ai_model: Optional[str] = "gpt-4"
