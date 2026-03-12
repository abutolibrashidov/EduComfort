from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class CourseType(str, enum.Enum):
    """Type of online course"""
    self_paced = "self_paced"
    live = "live"
    hybrid = "hybrid"


class CourseStatus(str, enum.Enum):
    """Status of course"""
    draft = "draft"
    active = "active"
    completed = "completed"
    archived = "archived"


class CourseDifficultyLevel(str, enum.Enum):
    """Difficulty level"""
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class EnrollmentStatus(str, enum.Enum):
    """Student enrollment status"""
    active = "active"
    completed = "completed"
    dropped = "dropped"
    suspended = "suspended"


class AssignmentStatus(str, enum.Enum):
    """Assignment submission status"""
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"
    missing = "missing"


class OnlineCourse(Base):
    """Online course"""
    __tablename__ = "online_courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Teacher
    
    # Course details
    course_type = Column(Enum(CourseType), default=CourseType.self_paced)
    difficulty_level = Column(Enum(CourseDifficultyLevel), default=CourseDifficultyLevel.intermediate)
    status = Column(Enum(CourseStatus), default=CourseStatus.draft)
    
    # Duration and dates
    duration_weeks = Column(Integer, default=4)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # Enrollment
    max_students = Column(Integer, default=50)
    enrolled_count = Column(Integer, default=0)
    
    # Pricing (optional)
    is_paid = Column(Boolean, default=False)
    price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    
    # Course info
    image_url = Column(String(500), nullable=True)
    language = Column(String(50), default="English")
    prerequisites = Column(Text, nullable=True)
    learning_outcomes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    subject = relationship("Subject", backref="online_courses")
    instructor = relationship("User", backref="courses_instructed", foreign_keys=[instructor_id])
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("StudentEnrollment", back_populates="course", cascade="all, delete-orphan")
    assignments = relationship("CourseAssignment", back_populates="course", cascade="all, delete-orphan")
    live_classes = relationship("LiveClass", back_populates="course", cascade="all, delete-orphan")


class CourseModule(Base):
    """Module within a course"""
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("online_courses.id"), nullable=False)
    module_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_sequence = Column(Integer, default=1)
    is_locked = Column(Boolean, default=False)
    unlock_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("OnlineCourse", back_populates="modules")
    lessons = relationship("CourseLesson", back_populates="module", cascade="all, delete-orphan")


class CourseLesson(Base):
    """Lesson within a module"""
    __tablename__ = "course_lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=False)
    lesson_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Content
    lesson_content = Column(Text, nullable=True)  # HTML content, text, etc.
    video_url = Column(String(500), nullable=True)  # YouTube, Vimeo, etc.
    video_file_path = Column(String(500), nullable=True)  # Uploaded video
    duration_minutes = Column(Integer, nullable=True)
    
    # Status
    order_sequence = Column(Integer, default=1)
    is_published = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("CourseModule", back_populates="lessons")
    resources = relationship("LessonResource", back_populates="lesson", cascade="all, delete-orphan")
    progress_records = relationship("StudentLessonProgress", back_populates="lesson", cascade="all, delete-orphan")


class LessonResource(Base):
    """Resources (PDF, docs, etc.) for a lesson"""
    __tablename__ = "lesson_resources"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(String(50), default="document")  # document, image, video, etc.
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lesson = relationship("CourseLesson", back_populates="resources")


class LiveClass(Base):
    """Live class session"""
    __tablename__ = "live_classes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("online_courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Scheduling
    class_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    class_time = Column(String(10), nullable=True)  # HH:MM format
    
    # Meeting info
    meeting_platform = Column(String(50), nullable=True)  # Zoom, Google Meet, etc.
    meeting_url = Column(String(500), nullable=True)
    meeting_id = Column(String(100), nullable=True)
    password = Column(String(100), nullable=True)
    
    # Recording
    is_recorded = Column(Boolean, default=False)
    recording_url = Column(String(500), nullable=True)
    recording_file_path = Column(String(500), nullable=True)
    
    # Status
    status = Column(String(50), default="scheduled")  # scheduled, ongoing, completed
    
    # Attendance
    max_participants = Column(Integer, nullable=True)
    actual_participants = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("OnlineCourse", back_populates="live_classes")
    attendances = relationship("LiveClassAttendance", back_populates="live_class", cascade="all, delete-orphan")


class LiveClassAttendance(Base):
    """Track attendance in live classes"""
    __tablename__ = "live_class_attendances"

    id = Column(Integer, primary_key=True, index=True)
    live_class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Attendance tracking
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    is_present = Column(Boolean, default=False)
    
    # Relationships
    live_class = relationship("LiveClass", back_populates="attendances")
    student = relationship("User", backref="live_class_attendances", foreign_keys=[student_id])


class StudentEnrollment(Base):
    """Student enrollment in a course"""
    __tablename__ = "student_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("online_courses.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Enrollment details
    status = Column(Enum(EnrollmentStatus), default=EnrollmentStatus.active)
    enrollment_date = Column(DateTime, default=datetime.utcnow)
    completion_date = Column(DateTime, nullable=True)
    
    # Progress
    completion_percentage = Column(Float, default=0.0)
    lessons_completed = Column(Integer, default=0)
    total_lessons = Column(Integer, default=0)
    
    # Grading
    overall_grade = Column(String(10), nullable=True)  # A, B, C, etc.
    overall_score = Column(Float, nullable=True)  # Percentage
    
    # Last activity
    last_activity_date = Column(DateTime, nullable=True)
    total_time_spent_minutes = Column(Integer, default=0)
    
    # Certificate
    certificate_earned = Column(Boolean, default=False)
    certificate_issued_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("OnlineCourse", back_populates="enrollments")
    student = relationship("User", backref="course_enrollments", foreign_keys=[student_id])
    progress = relationship("StudentCourseProgress", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")


class StudentCourseProgress(Base):
    """Track student progress in course"""
    __tablename__ = "student_course_progress"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("student_enrollments.id"), nullable=False)
    
    # Progress metrics
    modules_completed = Column(Integer, default=0)
    total_modules = Column(Integer, default=0)
    lessons_completed = Column(Integer, default=0)
    total_lessons = Column(Integer, default=0)
    assignments_submitted = Column(Integer, default=0)
    total_assignments = Column(Integer, default=0)
    
    # Performance
    average_assignment_score = Column(Float, nullable=True)
    quiz_score = Column(Float, nullable=True)
    
    # Last updated
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    enrollment = relationship("StudentEnrollment", back_populates="progress")


class StudentLessonProgress(Base):
    """Track individual lesson progress"""
    __tablename__ = "student_lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Progress
    is_completed = Column(Boolean, default=False)
    completion_percentage = Column(Float, default=0.0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    time_spent_minutes = Column(Integer, default=0)
    
    # Relationships
    lesson = relationship("CourseLesson", back_populates="progress_records")
    student = relationship("User", backref="lesson_progress", foreign_keys=[student_id])


class CourseAssignment(Base):
    """Assignment for a course"""
    __tablename__ = "course_assignments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("online_courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=None)
    instructions = Column(Text, nullable=True)
    
    # Assignment details
    assignment_type = Column(String(50), default="general")  # essay, mcq, project, etc.
    points_possible = Column(Float, default=100.0)
    
    # Dates
    created_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    submission_close_date = Column(DateTime, nullable=True)  # Late submission allowed?
    
    # Settings
    allow_late_submission = Column(Boolean, default=True)
    late_penalty_percentage = Column(Float, default=10.0)  # 10% penalty per day
    
    # Relationships
    course = relationship("OnlineCourse", back_populates="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    """Student's assignment submission"""
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("course_assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Submission content
    submission_text = Column(Text, nullable=True)  # For text submissions
    submission_file_path = Column(String(500), nullable=True)  # For file uploads
    submission_file_name = Column(String(255), nullable=True)
    
    # Tracking
    submitted_date = Column(DateTime, nullable=True)
    submission_status = Column(Enum(AssignmentStatus), default=AssignmentStatus.not_started)
    is_late = Column(Boolean, default=False)
    
    # Grading
    score_earned = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    graded_date = Column(DateTime, nullable=True)
    graded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignment = relationship("CourseAssignment", back_populates="submissions")
    student = relationship("User", backref="assignment_submissions", foreign_keys=[student_id])
    graded_by = relationship("User", backref="graded_assignments", foreign_keys=[graded_by_id])
