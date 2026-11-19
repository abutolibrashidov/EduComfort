from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class WorkbookStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class WorkbookSubmissionStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"


# ============ WORKBOOK SCHEMAS ============

class WorkbookCreate(BaseModel):
    """Create a new workbook - teacher uploads file"""
    title: str
    description: Optional[str] = None
    subject_id: int
    level: Optional[str] = None
    total_tasks: int = 0
    max_points: float = Field(default=100.0, ge=0)


class WorkbookUpdate(BaseModel):
    """Update workbook metadata"""
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    total_tasks: Optional[int] = None
    max_points: Optional[float] = None
    status: Optional[WorkbookStatus] = None


class WorkbookResponse(BaseModel):
    """Workbook details response"""
    id: int
    title: str
    description: Optional[str] = None
    subject_id: int
    created_by_id: int
    level: Optional[str] = None
    total_tasks: int
    max_points: float
    status: WorkbookStatus
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkbookListResponse(BaseModel):
    """Simplified workbook response for lists"""
    id: int
    title: str
    subject_id: int
    level: Optional[str] = None
    total_tasks: int
    max_points: float
    status: WorkbookStatus
    created_at: datetime


# ============ WORKBOOK SUBMISSION SCHEMAS ============

class WorkbookSubmissionCreate(BaseModel):
    """Student starts a workbook"""
    workbook_id: int


class WorkbookSubmissionUpdate(BaseModel):
    """Student updates their submission (notes/answers)"""
    submission_notes: Optional[str] = None


class WorkbookSubmissionSubmit(BaseModel):
    """Student submits completed workbook"""
    submission_notes: Optional[str] = None


class WorkbookSubmissionResponse(BaseModel):
    """Workbook submission details"""
    id: int
    workbook_id: int
    student_id: int
    status: WorkbookSubmissionStatus
    submission_notes: Optional[str] = None
    score_obtained: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    teacher_feedback: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    submitted_to_teacher: bool = False
    teacher_notified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkbookSubmissionListResponse(BaseModel):
    """Simplified submission response for lists"""
    id: int
    workbook_id: int
    student_id: int
    status: WorkbookSubmissionStatus
    percentage: Optional[float] = None
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None


# ============ TEACHER GRADING SCHEMAS ============

class WorkbookGradeSubmission(BaseModel):
    """Teacher grades a student's workbook submission"""
    score_obtained: float = Field(ge=0)
    teacher_feedback: str


class WorkbookGradingResponse(BaseModel):
    """Response when teacher grades a submission"""
    submission_id: int
    student_id: int
    score_obtained: float
    max_score: float
    percentage: float
    teacher_feedback: str
    graded_at: datetime


# ============ PERFORMANCE SCHEMAS ============

class StudentWorkbookPerformance(BaseModel):
    """Student's workbook performance"""
    workbook_id: int
    workbook_title: str
    subject_id: int
    score: Optional[float] = None
    percentage: Optional[float] = None
    status: WorkbookSubmissionStatus
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None


class WorkbookDashboardResponse(BaseModel):
    """Dashboard for student's workbook progress"""
    total_workbooks: int
    completed_workbooks: int
    pending_workbooks: int
    graded_workbooks: int
    average_score: Optional[float] = None
    recent_workbooks: list = []

