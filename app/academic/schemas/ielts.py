from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============ ENUMS ============

class IELTSExamTypeEnum(str, Enum):
    reading = "reading"
    listening = "listening"
    writing = "writing"
    full = "full"


class IELTSQuestionTypeEnum(str, Enum):
    mcq = "mcq"
    tf = "true_false"
    matching = "matching"
    fill_gap = "fill_gap"
    short_answer = "short_answer"


# ============ READING SCHEMAS ============

class IELTSReadingQuestionCreate(BaseModel):
    question_number: int
    question_text: str
    question_type: IELTSQuestionTypeEnum = IELTSQuestionTypeEnum.mcq
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: str
    points: float = 1.0
    explanation: Optional[str] = None


class IELTSReadingQuestionResponse(IELTSReadingQuestionCreate):
    id: int
    passage_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IELTSReadingPassageCreate(BaseModel):
    passage_number: int
    title: Optional[str] = None
    passage_text: str
    difficulty_level: str = "intermediate"


class IELTSReadingPassageResponse(IELTSReadingPassageCreate):
    id: int
    word_count: Optional[int] = None
    created_at: datetime
    questions: List[IELTSReadingQuestionResponse] = []

    class Config:
        from_attributes = True


class IELTSReadingAnswerSubmit(BaseModel):
    question_id: int
    student_answer: str


# ============ LISTENING SCHEMAS ============

class IELTSListeningQuestionCreate(BaseModel):
    question_number: int
    question_text: str
    question_type: IELTSQuestionTypeEnum = IELTSQuestionTypeEnum.mcq
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: str
    points: float = 1.0
    explanation: Optional[str] = None


class IELTSListeningQuestionResponse(IELTSListeningQuestionCreate):
    id: int
    section_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IELTSListeningSectionCreate(BaseModel):
    section_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    duration_seconds: int
    transcript: Optional[str] = None
    difficulty_level: str = "intermediate"


class IELTSListeningSectionResponse(IELTSListeningSectionCreate):
    id: int
    audio_file_path: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime
    questions: List[IELTSListeningQuestionResponse] = []

    class Config:
        from_attributes = True


class IELTSListeningAnswerSubmit(BaseModel):
    question_id: int
    student_answer: str


# ============ WRITING SCHEMAS ============

class IELTSWritingTaskResponse(BaseModel):
    id: int
    task_number: int
    title: str
    description: str
    task_instructions: Optional[str] = None
    word_count_min: int
    word_count_max: int
    time_limit_minutes: int
    max_band_score: float
    created_at: datetime

    class Config:
        from_attributes = True


class IELTSWritingSubmissionCreate(BaseModel):
    task_id: int
    written_text: str


class IELTSWritingSubmissionResponse(BaseModel):
    id: int
    task_id: int
    student_id: int
    written_text: str
    word_count: Optional[int] = None
    band_score: Optional[float] = None
    submitted_at: datetime
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IELTSWritingGrade(BaseModel):
    band_score: float = Field(ge=5.0, le=9.0)
    grammatical_accuracy_score: Optional[float] = None
    vocabulary_score: Optional[float] = None
    task_response_score: Optional[float] = None
    coherence_cohesion_score: Optional[float] = None
    teacher_feedback: str
    grammar_comments: Optional[str] = None
    vocabulary_comments: Optional[str] = None
    task_response_comments: Optional[str] = None
    coherence_comments: Optional[str] = None


# ============ EXAM SCHEMAS ============

class IELTSExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    exam_type: IELTSExamTypeEnum = IELTSExamTypeEnum.full
    subject_id: Optional[int] = None
    duration_minutes: int = 180
    passing_band_score: float = 6.5


class IELTSExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class IELTSExamResponse(IELTSExamCreate):
    id: int
    created_by_id: int
    status: str
    created_at: datetime
    published_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class IELTSExamDetailResponse(IELTSExamResponse):
    reading_passages: List[IELTSReadingPassageResponse] = []
    listening_sections: List[IELTSListeningSectionResponse] = []
    writing_tasks: List[IELTSWritingTaskResponse] = []


# ============ SUBMISSION SCHEMAS ============

class IELTSSubmissionResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IELTSResultsResponse(BaseModel):
    submission_id: int
    student_id: int
    exam_title: str
    
    # Section scores
    reading_score: Optional[float] = None
    reading_band: Optional[str] = None
    
    listening_score: Optional[float] = None
    listening_band: Optional[str] = None
    
    writing_task1_band: Optional[str] = None
    writing_task2_band: Optional[str] = None
    writing_overall_band: Optional[str] = None
    
    # Overall
    overall_band_score: Optional[float] = None
    status: str
    submitted_at: datetime
    graded_at: Optional[datetime] = None


class StudentIELTSPerformance(BaseModel):
    student_id: int
    total_exams_taken: int
    average_overall_band: Optional[float] = None
    best_overall_band: Optional[float] = None
    latest_band_score: Optional[float] = None
    reading_average: Optional[float] = None
    listening_average: Optional[float] = None
    writing_average: Optional[float] = None
