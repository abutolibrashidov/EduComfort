from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class ExerciseType(str, Enum):
    GAP_FILL = "gap_fill"
    MCQ = "mcq"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    SHORT_ANSWER = "short_answer"


class WorkbookExerciseCreate(BaseModel):
    exercise_number: int
    exercise_type: ExerciseType
    exercise_text: str
    instructions: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    correct_answer: str
    correct_answers_list: Optional[List[str]] = None
    case_sensitive: bool = False
    accept_partial: bool = False
    points: int = 1
    unit_name: str
    lesson_name: str


class WorkbookExerciseResponse(BaseModel):
    id: int
    exercise_number: int
    exercise_type: str
    exercise_text: str
    instructions: Optional[str]
    options: Optional[Dict[str, str]]
    points: int
    unit_name: str
    lesson_name: str

    class Config:
        from_attributes = True


class InteractiveWorkbookCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    level: Optional[str] = None
    book_type: Optional[str] = "student_book"


class InteractiveWorkbookResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    subject_id: int
    level: Optional[str]
    book_type: str
    total_exercises: int
    status: str
    created_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


class StudentExerciseSubmissionCreate(BaseModel):
    student_answer: str = Field(...)


class StudentExerciseSubmissionResponse(BaseModel):
    id: int
    exercise_id: int
    student_answer: str
    is_correct: bool
    points_earned: float
    feedback: Optional[str]
    submitted_at: datetime

    class Config:
        from_attributes = True


class WorkbookProgressResponse(BaseModel):
    workbook_id: int
    student_id: int
    total_exercises: int
    exercises_completed: int
    exercises_correct: int
    total_points: float
    points_earned: float
    completion_percentage: float
    time_spent_minutes: float
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class InteractiveWorkbookDetailResponse(InteractiveWorkbookResponse):
    exercises: Optional[List[WorkbookExerciseResponse]] = None


class WorkbookDashboardResponse(BaseModel):
    workbook: InteractiveWorkbookResponse
    exercises: Optional[List[WorkbookExerciseResponse]] = None
    progress: Optional[WorkbookProgressResponse] = None

    class Config:
        from_attributes = True
