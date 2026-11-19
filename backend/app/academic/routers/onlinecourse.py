from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pathlib import Path

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.academic.models.onlinecourse import (
    OnlineCourse, CourseModule, CourseLesson, LiveClass, StudentEnrollment, StudentCourseProgress,
    CourseAssignment, AssignmentSubmission,
    CourseStatus, EnrollmentStatus, AssignmentStatus
)
from app.academic.models.subject import Subject
from app.academic.schemas.onlinecourse import (
    OnlineCourseCreate, OnlineCourseUpdate, OnlineCourseResponse, OnlineCourseDetailResponse, OnlineCourseListResponse,
    CourseModuleCreate, CourseModuleResponse, CourseLessonCreate, CourseLessonResponse,
    LiveClassCreate, LiveClassResponse, CourseAssignmentCreate, CourseAssignmentResponse,
    AssignmentSubmissionCreate, AssignmentSubmissionResponse, AssignmentGrade,
    StudentEnrollmentResponse, StudentCourseProgressResponse, StudentDashboardResponse
)
from app.security.permissions import require_role

router = APIRouter(prefix="/online-courses", tags=["Online Courses"])

# File upload configuration
UPLOAD_DIRECTORY = Path("uploads/courses")
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)


# ============ COURSE CRUD ============

@router.post("", response_model=OnlineCourseResponse, status_code=status.HTTP_201_CREATED)
async def create_online_course(
    course_data: OnlineCourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create new online course (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    if course_data.subject_id:
        subject = db.query(Subject).filter(Subject.id == course_data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
    
    course = OnlineCourse(
        title=course_data.title,
        description=course_data.description,
        subject_id=course_data.subject_id,
        instructor_id=current_user.id,
        course_type=course_data.course_type,
        difficulty_level=course_data.difficulty_level,
        duration_weeks=course_data.duration_weeks,
        max_students=course_data.max_students,
        is_paid=course_data.is_paid,
        price=course_data.price,
        language=course_data.language,
        prerequisites=course_data.prerequisites,
        learning_outcomes=course_data.learning_outcomes,
    )
    # ✅ ISOLATION: stamp the institution so we can filter later
    if hasattr(OnlineCourse, 'institution_id') and current_user.institution_id:
        course.institution_id = current_user.institution_id
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    return course


@router.get("", response_model=List[OnlineCourseListResponse])
async def list_online_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all online courses — scoped to caller's institution"""
    query = db.query(OnlineCourse)
    
    # ✅ ISOLATION: non-platform-admins only see courses from their institution
    from app.security.permissions import is_platform_owner
    if not is_platform_owner(current_user):
        if current_user.institution_id:
            # If OnlineCourse has institution_id column, use it
            if hasattr(OnlineCourse, 'institution_id'):
                query = query.filter(OnlineCourse.institution_id == current_user.institution_id)
            else:
                # Fall back to filtering by instructor's institution
                instructor_ids = [
                    u.id for u in db.query(User).filter(
                        User.institution_id == current_user.institution_id
                    ).all()
                ]
                query = query.filter(OnlineCourse.instructor_id.in_(instructor_ids))
    
    # Students only see published/active courses
    if current_user.role == "student":
        query = query.filter(OnlineCourse.status == CourseStatus.active)
    
    courses = query.order_by(OnlineCourse.created_at.desc()).all()
    return courses


@router.get("/{course_id}", response_model=OnlineCourseDetailResponse)
async def get_online_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get course details"""
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "student" and course.status != CourseStatus.active:
        raise HTTPException(status_code=403, detail="Course not available")
    
    return course


@router.put("/{course_id}", response_model=OnlineCourseResponse)
async def update_online_course(
    course_id: int,
    update_data: OnlineCourseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update course (Instructor/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own courses")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(course, key):
            setattr(course, key, value)
    
    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)
    
    return course


# ============ MODULES & LESSONS ============

@router.post("/{course_id}/modules", response_model=CourseModuleResponse, status_code=status.HTTP_201_CREATED)
async def add_course_module(
    course_id: int,
    module_data: CourseModuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add module to course"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own courses")
    
    module = CourseModule(
        course_id=course_id,
        module_number=module_data.module_number,
        title=module_data.title,
        description=module_data.description,
    )
    
    db.add(module)
    db.commit()
    db.refresh(module)
    
    return module


@router.post("/{course_id}/modules/{module_id}/lessons", response_model=CourseLessonResponse, status_code=status.HTTP_201_CREATED)
async def add_lesson(
    course_id: int,
    module_id: int,
    lesson_data: CourseLessonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add lesson to module"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own courses")
    
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    lesson = CourseLesson(
        module_id=module_id,
        lesson_number=lesson_data.lesson_number,
        title=lesson_data.title,
        description=lesson_data.description,
        lesson_content=lesson_data.lesson_content,
        video_url=lesson_data.video_url,
        duration_minutes=lesson_data.duration_minutes,
    )
    
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    
    return lesson


# ============ ENROLLMENT ============

@router.post("/{course_id}/enroll", response_model=StudentEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student enrolls in course"""
    require_role(current_user, ["student"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.status != CourseStatus.active:
        raise HTTPException(status_code=403, detail="Course is not available for enrollment")
    
    # Check if already enrolled
    existing = db.query(StudentEnrollment).filter(
        StudentEnrollment.course_id == course_id,
        StudentEnrollment.student_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    # Check capacity
    if course.enrolled_count >= course.max_students:
        raise HTTPException(status_code=400, detail="Course is full")
    
    enrollment = StudentEnrollment(
        course_id=course_id,
        student_id=current_user.id,
        status=EnrollmentStatus.active,
    )
    
    progress = StudentCourseProgress(enrollment=enrollment)
    
    course.enrolled_count += 1
    
    db.add(enrollment)
    db.add(progress)
    db.commit()
    db.refresh(enrollment)
    
    return enrollment


@router.get("/{course_id}/students", response_model=List[StudentEnrollmentResponse])
async def get_course_students(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get students enrolled in course (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own course students")
    
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.course_id == course_id
    ).all()
    
    return enrollments


# ============ LIVE CLASSES ============

@router.post("/{course_id}/live-classes", response_model=LiveClassResponse, status_code=status.HTTP_201_CREATED)
async def schedule_live_class(
    course_id: int,
    class_data: LiveClassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Schedule live class (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only schedule classes for your own courses")
    
    live_class = LiveClass(
        course_id=course_id,
        title=class_data.title,
        description=class_data.description,
        class_date=class_data.class_date,
        duration_minutes=class_data.duration_minutes,
        meeting_platform=class_data.meeting_platform,
        meeting_url=class_data.meeting_url,
    )
    
    db.add(live_class)
    db.commit()
    db.refresh(live_class)
    
    return live_class


@router.get("/{course_id}/live-classes", response_model=List[LiveClassResponse])
async def get_course_live_classes(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get live classes for course"""
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    live_classes = db.query(LiveClass).filter(
        LiveClass.course_id == course_id
    ).order_by(LiveClass.class_date).all()
    
    return live_classes


# ============ ASSIGNMENTS ============

@router.post("/{course_id}/assignments", response_model=CourseAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    course_id: int,
    assignment_data: CourseAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create assignment (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create assignments for your own courses")
    
    assignment = CourseAssignment(
        course_id=course_id,
        title=assignment_data.title,
        description=assignment_data.description,
        instructions=assignment_data.instructions,
        assignment_type=assignment_data.assignment_type,
        points_possible=assignment_data.points_possible,
        due_date=assignment_data.due_date,
        allow_late_submission=assignment_data.allow_late_submission,
        late_penalty_percentage=assignment_data.late_penalty_percentage,
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return assignment


@router.post("/{course_id}/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    course_id: int,
    assignment_id: int,
    submission_data: AssignmentSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits assignment"""
    require_role(current_user, ["student"])
    
    assignment = db.query(CourseAssignment).filter(CourseAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if already submitted
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == current_user.id,
        AssignmentSubmission.submission_status.in_([AssignmentStatus.submitted, AssignmentStatus.graded])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already submitted")
    
    is_late = datetime.utcnow() > assignment.due_date
    
    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        submission_text=submission_data.submission_text,
        submitted_date=datetime.utcnow(),
        submission_status=AssignmentStatus.submitted,
        is_late=is_late,
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.get("/{course_id}/assignments/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse])
async def get_assignment_submissions(
    course_id: int,
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all submissions for assignment (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own course submissions")
    
    submissions = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id
    ).all()
    
    return submissions


@router.put("/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/grade", status_code=status.HTTP_200_OK)
async def grade_assignment_submission(
    course_id: int,
    assignment_id: int,
    submission_id: int,
    grade_data: AssignmentGrade,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Grade assignment submission (Teacher/Admin)"""
    require_role(current_user, ["teacher", "admin"])
    
    course = db.query(OnlineCourse).filter(OnlineCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only grade submissions for your own courses")
    
    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = db.query(CourseAssignment).filter(CourseAssignment.id == assignment_id).first()
    
    submission.score_earned = grade_data.score_earned
    submission.percentage = (grade_data.score_earned / assignment.points_possible * 100) if assignment.points_possible > 0 else 0
    submission.teacher_feedback = grade_data.teacher_feedback
    submission.submission_status = AssignmentStatus.graded
    submission.graded_date = datetime.utcnow()
    submission.graded_by_id = current_user.id
    
    db.commit()
    
    return {"status": "success", "score_earned": submission.score_earned, "percentage": submission.percentage}


# ============ STUDENT DASHBOARD ============

@router.get("/student/{student_id}/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's course dashboard"""
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Cannot view other students' dashboard")
    
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == student_id
    ).all()
    
    total_enrolled = len(enrollments)
    active_courses = len([e for e in enrollments if e.status == EnrollmentStatus.active])
    completed_courses = len([e for e in enrollments if e.status == EnrollmentStatus.completed])
    
    average_score = None
    scores = [e.overall_score for e in enrollments if e.overall_score]
    if scores:
        average_score = sum(scores) / len(scores)
    
    return StudentDashboardResponse(
        total_enrolled=total_enrolled,
        active_courses=active_courses,
        completed_courses=completed_courses,
        in_progress_count=active_courses,
        average_score=average_score,
        enrolled_courses=[]
    )


@router.get("/{course_id}/my-progress", response_model=StudentCourseProgressResponse)
async def get_my_course_progress(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's progress in course"""
    require_role(current_user, ["student"])
    
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.course_id == course_id,
        StudentEnrollment.student_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    progress = enrollment.progress
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
    
    return progress
