from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============ ENUMS ============

class CourseTypeEnum(str, Enum):
    self_paced = "self_paced"
    live = "live"
    hybrid = "hybrid"


class CourseDifficultyEnum(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class CourseStatusEnum(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    archived = "archived"


class EnrollmentStatusEnum(str, Enum):
    active = "active"
    completed = "completed"
    dropped = "dropped"
    suspended = "suspended"


class AssignmentStatusEnum(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"
    missing = "missing"


# ============ LESSON & MODULE SCHEMAS ============

class LessonResourceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    resource_type: str = "document"


class LessonResourceResponse(LessonResourceCreate):
    id: int
    file_name: str
    file_size: Optional[int] = None
    download_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class CourseLessonCreate(BaseModel):
    lesson_number: int
    title: str
    description: Optional[str] = None
    lesson_content: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None


class CourseLessonResponse(CourseLessonCreate):
    id: int
    module_id: int
    order_sequence: int
    is_published: bool
    created_at: datetime
    resources: List[LessonResourceResponse] = []

    class Config:
        from_attributes = True


class CourseModuleCreate(BaseModel):
    module_number: int
    title: str
    description: Optional[str] = None


class CourseModuleResponse(CourseModuleCreate):
    id: int
    order_sequence: int
    is_locked: bool
    unlock_date: Optional[datetime] = None
    created_at: datetime
    lessons: List[CourseLessonResponse] = []

    class Config:
        from_attributes = True


# ============ LIVE CLASS SCHEMAS ============

class LiveClassCreate(BaseModel):
    title: str
    description: Optional[str] = None
    class_date: datetime
    duration_minutes: int = 60
    meeting_platform: Optional[str] = None
    meeting_url: Optional[str] = None


class LiveClassResponse(LiveClassCreate):
    id: int
    course_id: int
    status: str
    recording_url: Optional[str] = None
    is_recorded: bool
    actual_participants: int
    created_at: datetime

    class Config:
        from_attributes = True


class LiveClassDetailResponse(LiveClassResponse):
    attendances: List = []


# ============ ASSIGNMENT SCHEMAS ============

class CourseAssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    assignment_type: str = "general"
    points_possible: float = 100.0
    due_date: datetime
    allow_late_submission: bool = True
    late_penalty_percentage: float = 10.0


class CourseAssignmentResponse(CourseAssignmentCreate):
    id: int
    course_id: int
    created_date: datetime

    class Config:
        from_attributes = True


class AssignmentSubmissionCreate(BaseModel):
    submission_text: Optional[str] = None


class AssignmentSubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    submission_text: Optional[str] = None
    submission_file_name: Optional[str] = None
    submitted_date: Optional[datetime] = None
    submission_status: str
    score_earned: Optional[float] = None
    percentage: Optional[float] = None
    teacher_feedback: Optional[str] = None
    graded_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentGrade(BaseModel):
    score_earned: float = Field(ge=0)
    teacher_feedback: str


# ============ ENROLLMENT SCHEMAS ============

class StudentEnrollmentResponse(BaseModel):
    id: int
    course_id: int
    student_id: int
    status: str
    enrollment_date: datetime
    completion_percentage: float
    lessons_completed: int
    total_lessons: int
    overall_grade: Optional[str] = None
    overall_score: Optional[float] = None
    certificate_earned: bool

    class Config:
        from_attributes = True


class StudentCourseProgressResponse(BaseModel):
    enrollment_id: int
    modules_completed: int
    total_modules: int
    lessons_completed: int
    total_lessons: int
    assignments_submitted: int
    total_assignments: int
    average_assignment_score: Optional[float] = None
    last_updated: datetime

    class Config:
        from_attributes = True


# ============ COURSE SCHEMAS ============

class OnlineCourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: Optional[int] = None
    course_type: CourseTypeEnum = CourseTypeEnum.self_paced
    difficulty_level: CourseDifficultyEnum = CourseDifficultyEnum.intermediate
    duration_weeks: int = 4
    max_students: int = 50
    is_paid: bool = False
    price: Optional[float] = None
    language: str = "English"
    prerequisites: Optional[str] = None
    learning_outcomes: Optional[str] = None


class OnlineCourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty_level: Optional[CourseDifficultyEnum] = None
    status: Optional[CourseStatusEnum] = None
    max_students: Optional[int] = None
    learning_outcomes: Optional[str] = None


class OnlineCourseResponse(OnlineCourseCreate):
    id: int
    instructor_id: int
    status: str
    enrolled_count: int
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OnlineCourseDetailResponse(OnlineCourseResponse):
    modules: List[CourseModuleResponse] = []
    live_classes: List[LiveClassResponse] = []
    assignments: List[CourseAssignmentResponse] = []


class OnlineCourseListResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    course_type: str
    difficulty_level: str
    instructor_id: int
    enrolled_count: int
    max_students: int
    status: str
    price: Optional[float] = None
    duration_weeks: int


# ============ STUDENT DASHBOARD ============

class StudentDashboardResponse(BaseModel):
    total_enrolled: int
    active_courses: int
    completed_courses: int
    in_progress_count: int
    average_score: Optional[float] = None
    enrolled_courses: List[OnlineCourseListResponse] = []


class CourseLearnerResponse(BaseModel):
    student_id: int
    student_name: str
    student_email: str
    enrollment_date: datetime
    completion_percentage: float
    overall_score: Optional[float] = None
    status: str
    lessons_completed: int
    assignments_submitted: int
