from datetime import datetime, date, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_students import GroupStudent
from app.models.conversation import Conversation, ConversationType
from app.models.material import Material
from app.models.lesson import Lesson
from app.models.exam import Exam, ExamStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.rating import TeacherRating, TeacherAward
from app.services.stats_service import calculate_attendance_rate

router = APIRouter(prefix="/teacher", tags=["Teacher"])

# File upload configuration
UPLOAD_DIR = Path("uploads/materials")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".mp4", ".avi", ".png", ".jpg", ".jpeg"}



# ============================================
# SCHEMAS
# ============================================

class DashboardKPIs(BaseModel):
    total_groups: int
    total_students: int
    active_courses: int
    upcoming_lessons: int
    upcoming_exams: int
    average_rating: float


class TodayLesson(BaseModel):
    group_id: int
    group_name: str
    subject: str
    time: str
    topic: Optional[str] = None
    lesson_date: str = ""


class UpcomingExam(BaseModel):
    exam_id: int
    exam_name: str
    group_name: str
    date: str
    type: str


class StudentProgressSnapshot(BaseModel):
    average_completion: float
    attendance_percentage: float
    assignment_submission: float


class TeacherDashboardResponse(BaseModel):
    kpis: DashboardKPIs
    todays_lessons: List[TodayLesson]
    upcoming_exams: List[UpcomingExam]
    progress_snapshot: StudentProgressSnapshot
    quick_notes: List[str]


class GroupSummary(BaseModel):
    id: int
    name: str
    subject_name: str
    student_count: int
    level: str
    schedule: Optional[str]
    days_of_week: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    progress_percentage: float
    has_group_chat: bool

    class Config:
        from_attributes = True


class StudentInGroup(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone_number: str
    attendance_rate: float
    completion_rate: float
    last_activity: Optional[str]

    class Config:
        from_attributes = True


class MaterialResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_path: str
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_date: date
    group_id: int

class LessonResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    lesson_date: date
    group_id: int
    group_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceRecord(BaseModel):
    student_id: int
    student_name: str
    status: str
    remarks: Optional[str] = None

class AttendanceDayView(BaseModel):
    group_id: int
    date: date
    records: List[AttendanceRecord]

class AttendanceUpdate(BaseModel):
    student_id: int
    status: str
    remarks: Optional[str] = None

class AttendanceBatchCreate(BaseModel):
    group_id: int
    date: date
    records: List[AttendanceUpdate]

class AttendanceHistoryRecord(BaseModel):
    student_id: int
    student_name: str
    attendance: Dict[str, str]

class AttendanceHistoryResponse(BaseModel):
    group_id: int
    dates: List[str]
    students: List[AttendanceHistoryRecord]


# ============================================
# HELPER FUNCTIONS
# ============================================

def verify_teacher(current_user: User):
    """Verify user is a teacher, admin, or super_admin"""
    # Fix: User.role is a string column, not an Enum object
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and admins can access this endpoint"
        )


def get_teacher_groups(db: Session, teacher_id: int) -> List[Group]:
    """Get all groups assigned to a teacher"""
    return db.query(Group).filter(
        Group.teacher_id == teacher_id,
        Group.is_active == True
    ).all()


# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@router.get("/dashboard", response_model=TeacherDashboardResponse)
def get_teacher_dashboard(
    teacher_id: Optional[int] = Query(None, description="Admin only: View specific teacher dashboard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get teacher dashboard with KPIs, today's schedule, and quick overview
    This is the main control center for teachers
    """
    verify_teacher(current_user)
    
    # Determine which teacher's data to show
    target_teacher_id = current_user.id
    
    if teacher_id:
        # Only admins/super_admins can view other teachers
        from app.security.permissions import is_admin_or_higher
            
        if is_admin_or_higher(current_user):
            target_teacher_id = teacher_id
        else:
            if teacher_id != current_user.id:
                raise HTTPException(status_code=403, detail="Cannot view other teachers' data")

    # Get teacher's groups
    groups = get_teacher_groups(db, target_teacher_id)
    group_ids = [g.id for g in groups]
    
    # Calculate KPIs
    total_groups = len(groups)
    active_groups = len([g for g in groups if g.status == "active"])
    
    # Count total students across all groups
    total_students = db.query(func.count(GroupStudent.id)).filter(
        GroupStudent.group_id.in_(group_ids) if group_ids else False,
        GroupStudent.is_active == True
    ).scalar() or 0
    
    # Upcoming lessons
    upcoming_lessons_query = db.query(Lesson).filter(
        Lesson.teacher_id == teacher_id,
        Lesson.lesson_date >= date.today()
    ).order_by(Lesson.lesson_date.asc()).all()
    upcoming_lessons_count = len(upcoming_lessons_query)
    
    # Upcoming exams (REAL)
    upcoming_exams_db = db.query(Exam).filter(
        Exam.created_by_id == teacher_id,
        Exam.status.in_([ExamStatus.published, ExamStatus.in_progress]),
        Exam.end_date >= datetime.utcnow()
    ).all()
    upcoming_exams_count = len(upcoming_exams_db)
    
    # Average rating (REAL)
    avg_rating = db.query(func.avg(TeacherRating.rating)).filter(
        TeacherRating.teacher_id == target_teacher_id
    ).scalar() or 0.0
    average_rating = round(avg_rating, 1)
    
    kpis = DashboardKPIs(
        total_groups=total_groups,
        total_students=total_students,
        active_courses=active_groups,
        upcoming_lessons=upcoming_lessons_count,
        upcoming_exams=upcoming_exams_count,
        average_rating=average_rating
    )
    
    # Today's lessons or next upcoming
    todays_lessons = []
    
    for i in range(8): # Check today + next 7 days
        target_date = date.today() + timedelta(days=i)
        day_name = target_date.strftime("%A")[:3]  # Mon, Tue, etc.
        
        # Real lessons for target date from Lesson model
        target_lessons_db = [l for l in upcoming_lessons_query if l.lesson_date == target_date]
        for l in target_lessons_db:
            todays_lessons.append(TodayLesson(
                group_id=l.group_id,
                group_name=l.group.name,
                subject=l.group.subject.name,
                time=str(l.group.start_time) if l.group.start_time else "TBD",
                topic=l.title,
                lesson_date=target_date.strftime("%Y-%m-%d")
            ))
        
        # Also include scheduled groups if no specific lesson planned
        planned_group_ids = [l.group_id for l in target_lessons_db]
        for group in groups:
            if group.id not in planned_group_ids and group.days_of_week and day_name in group.days_of_week:
                todays_lessons.append(TodayLesson(
                    group_id=group.id,
                    group_name=group.name,
                    subject=group.subject.name,
                    time=str(group.start_time) if group.start_time else "TBD",
                    topic=None,
                    lesson_date=target_date.strftime("%Y-%m-%d")
                ))
                
        if todays_lessons:
            # Sort by time
            todays_lessons.sort(key=lambda x: x.time)
            break # Found lessons for this day, stop searching further days
    
    # Upcoming exams (REAL)
    upcoming_exams = []
    for ex in upcoming_exams_db:
        upcoming_exams.append(UpcomingExam(
            exam_id=ex.id,
            exam_name=ex.title,
            group_name=ex.group.name if ex.group else "Multiple",
            date=ex.start_date.strftime("%Y-%m-%d %H:%M") if ex.start_date else "Flexible",
            type=ex.subject.name if ex.subject else "General"
        ))
    
    # Progress snapshot
    attendance_rate = calculate_attendance_rate(db, teacher_id=target_teacher_id)
    
    progress_snapshot = StudentProgressSnapshot(
        average_completion=75.0, # Placeholder
        attendance_percentage=attendance_rate,
        assignment_submission=82.0 # Placeholder
    )
    
    # Quick notes
    quick_notes = [
        "Review Group A's homework submissions",
        "Prepare materials for Wednesday's lesson",
        "Follow up with 3 absent students"
    ]
    
    return TeacherDashboardResponse(
        kpis=kpis,
        todays_lessons=todays_lessons,
        upcoming_exams=upcoming_exams,
        progress_snapshot=progress_snapshot,
        quick_notes=quick_notes
    )


@router.get("/groups", response_model=List[GroupSummary])
def get_teacher_groups_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all groups assigned to the teacher
    /teacher/groups
    """
    verify_teacher(current_user)
    
    groups = get_teacher_groups(db, current_user.id)
    
    result = []
    for group in groups:
        # Count students
        student_count = db.query(func.count(GroupStudent.id)).filter(
            GroupStudent.group_id == group.id,
            GroupStudent.is_active == True
        ).scalar() or 0
        
        # Check if group chat exists
        has_chat = db.query(Conversation).filter(
            Conversation.type == ConversationType.GROUP,
            Conversation.group_id == group.id
        ).first() is not None
        
        # Build schedule string
        schedule = None
        if group.days_of_week and group.start_time:
            schedule = f"{group.days_of_week} at {group.start_time}"
        
        result.append(GroupSummary(
            id=group.id,
            name=group.name,
            subject_name=group.subject.name,
            student_count=student_count,
            level=group.level.value if group.level else "N/A",
            schedule=schedule,
            days_of_week=group.days_of_week,
            start_time=str(group.start_time) if group.start_time else None,
            end_time=str(group.end_time) if group.end_time else None,
            progress_percentage=0.0,
            has_group_chat=has_chat
        ))
    
    return result


@router.get("/groups/{group_id}/students", response_model=List[StudentInGroup])
def get_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all students in a specific group
    Teachers can only access their own groups
    """
    verify_teacher(current_user)
    
    # Verify this group belongs to the teacher
    group = db.query(Group).filter(
        Group.id == group_id,
        Group.teacher_id == current_user.id
    ).first()
    
    if not group and current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this group"
        )
    
    # Get students
    enrollments = db.query(GroupStudent).filter(
        GroupStudent.group_id == group_id,
        GroupStudent.is_active == True
    ).all()
    
    result = []
    for enrollment in enrollments:
        student = enrollment.student
        
        # TODO: Calculate actual attendance and completion rates
        result.append(StudentInGroup(
            id=student.id,
            name=f"{student.first_name} {student.last_name}",
            email=student.email,
            phone_number=student.phone_number,
            attendance_rate=0.0,
            completion_rate=0.0,
            last_activity=None  # TODO: Track last activity
        ))
    
    return result


@router.get("/courses")
def get_teacher_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get courses/subjects taught by the teacher
    Aggregated view of all groups by subject
    """
    verify_teacher(current_user)
    
    groups = get_teacher_groups(db, current_user.id)
    
    # Group by subject
    courses = {}
    for group in groups:
        subject_name = group.subject.name
        if subject_name not in courses:
            courses[subject_name] = {
                "subject": subject_name,
                "groups": [],
                "total_students": 0
            }
        
        student_count = db.query(func.count(GroupStudent.id)).filter(
            GroupStudent.group_id == group.id,
            GroupStudent.is_active == True
        ).scalar() or 0
        
        courses[subject_name]["groups"].append({
            "id": group.id,
            "name": group.name,
            "level": group.level.value if group.level else "N/A",
            "students": student_count
        })
        courses[subject_name]["total_students"] += student_count
    
    return {
        "courses": list(courses.values()),
        "total_subjects": len(courses)
    }




@router.get("/materials", response_model=List[MaterialResponse])
def get_teacher_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get materials uploaded by the teacher
    """
    verify_teacher(current_user)
    
    # If super admin, they might want to see all materials or their own
    # For now, let's keep it scoped to the user's uploads unless we explicitly handle admin view
    materials = db.query(Material).filter(Material.teacher_id == current_user.id).all()
    
    result = []
    for m in materials:
        group_name = m.group.name if m.group else "All Groups"
        result.append(MaterialResponse(
            id=m.id,
            title=m.title,
            description=m.description,
            file_path=m.file_path,
            file_name=m.file_name,
            file_type=m.file_type,
            file_size=m.file_size,
            group_id=m.group_id,
            group_name=group_name,
            created_at=m.created_at
        ))
    
    return result


@router.post("/materials", response_model=MaterialResponse)
async def upload_material(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    group_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a new study material
    """
    verify_teacher(current_user)
    
    # Validate extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed"
        )
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create DB record
    material = Material(
        title=title,
        description=description,
        file_path=f"uploads/materials/{safe_name}",
        file_name=file.filename,
        file_type=file_ext.replace(".", ""),
        file_size=file_size,
        teacher_id=current_user.id,
        group_id=group_id
    )
    
    db.add(material)
    db.commit()
    db.refresh(material)
    
    # Return with group name
    group_name = material.group.name if material.group else "All Groups"
    return MaterialResponse(
        id=material.id,
        title=material.title,
        description=material.description,
        file_path=material.file_path,
        file_name=material.file_name,
        file_type=material.file_type,
        file_size=material.file_size,
        group_id=material.group_id,
        group_name=group_name,
        created_at=material.created_at
    )


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a study material
    """
    verify_teacher(current_user)
    
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.teacher_id == current_user.id
    ).first()
    
    if not material:
        # Check if super_admin is deleting
        if current_user.role == "super_admin":
             material = db.query(Material).filter(Material.id == material_id).first()
        
        if not material:
            raise HTTPException(status_code=404, detail="Material not found or access denied")
    
    # Delete physical file
    if os.path.exists(material.file_path):
        os.remove(material.file_path)
        
    db.delete(material)
    db.commit()
    
    return {"message": "Material deleted successfully"}



@router.get("/attendance")
def get_attendance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get attendance overview for teacher's groups
    """
    verify_teacher(current_user)
    
    groups = get_teacher_groups(db, current_user.id)
    
    group_stats = []
    for g in groups:
        total_records = db.query(func.count(Attendance.id)).filter(Attendance.group_id == g.id).scalar() or 0
        present_count = db.query(func.count(Attendance.id)).filter(
            Attendance.group_id == g.id, 
            Attendance.status == AttendanceStatus.PRESENT
        ).scalar() or 0
        
        rate = (present_count / total_records * 100) if total_records > 0 else 0.0
        
        group_stats.append({
            "group_id": g.id,
            "group_name": g.name,
            "total_students": len(g.students) if g.students else 0, # Assuming relationship exists
            "attendance_rate": round(rate, 1)
        })

    return {
        "groups": group_stats
    }


@router.get("/groups/{group_id}/attendance", response_model=AttendanceDayView)
def get_group_attendance(
    group_id: int,
    date_str: str,  # passing as string to ease parsing YYYY-MM-DD
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance for a specific group and date"""
    verify_teacher(current_user)
    
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    # Verify group ownership
    group = db.query(Group).filter(Group.id == group_id, Group.teacher_id == current_user.id).first()
    if not group and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Get all students in group
    students = db.query(GroupStudent).filter(
        GroupStudent.group_id == group_id,
        GroupStudent.is_active == True
    ).all()
    
    # Get existing attendance records
    existing_records = db.query(Attendance).filter(
        Attendance.group_id == group_id,
        Attendance.date == target_date
    ).all()
    
    record_map = {r.student_id: r for r in existing_records}
    
    result_records = []
    for enrollment in students:
        std = enrollment.student
        existing = record_map.get(std.id)
        
        result_records.append(AttendanceRecord(
            student_id=std.id,
            student_name=f"{std.first_name} {std.last_name}",
            status=existing.status.value if existing else "present", # Default to present if not marked
            remarks=existing.remarks if existing else None
        ))
        
    return AttendanceDayView(
        group_id=group_id,
        date=target_date,
        records=result_records
    )


@router.post("/attendance")
def save_attendance(
    data: AttendanceBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save or update attendance"""
    verify_teacher(current_user)
    
    # Verify group ownership
    group = db.query(Group).filter(Group.id == data.group_id, Group.teacher_id == current_user.id).first()
    if not group and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Process each record
    for record in data.records:
        # Check if exists
        existing = db.query(Attendance).filter(
            Attendance.group_id == data.group_id,
            Attendance.date == data.date,
            Attendance.student_id == record.student_id
        ).first()
        
        if existing:
            existing.status = AttendanceStatus(record.status)
            existing.remarks = record.remarks
        else:
            new_record = Attendance(
                group_id=data.group_id,
                date=data.date,
                student_id=record.student_id,
                status=AttendanceStatus(record.status),
                remarks=record.remarks
            )
            db.add(new_record)
            
    try:
        db.commit()
        return {"message": "Attendance saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/attendance/history", response_model=AttendanceHistoryResponse)
def get_group_attendance_history(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance history for a specific group for the last 30 classes"""
    verify_teacher(current_user)
    
    # Verify group ownership
    group = db.query(Group).filter(Group.id == group_id, Group.teacher_id == current_user.id).first()
    if not group and getattr(current_user.role, 'value', current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Get all active students in group
    students = db.query(GroupStudent).filter(
        GroupStudent.group_id == group_id,
        GroupStudent.is_active == True
    ).all()

    # Get the last 30 distinct dates with attendance for this group
    dates_query = db.query(Attendance.date).filter(
        Attendance.group_id == group_id
    ).distinct().order_by(Attendance.date.desc()).limit(30).all()
    
    dates = sorted([d[0] for d in dates_query])
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]

    # Get all attendance records for these dates
    if dates:
        records = db.query(Attendance).filter(
            Attendance.group_id == group_id,
            Attendance.date.in_(dates)
        ).all()
        # Create a lookup dictionary: (student_id, date_str) -> status
        record_map = {(r.student_id, r.date.strftime("%Y-%m-%d")): r.status.value if hasattr(r.status, "value") else str(r.status) for r in records}
    else:
        record_map = {}

    result_students = []
    for enrollment in students:
        std = enrollment.student
        std_attendance = {}
        for d in date_strs:
            std_attendance[d] = record_map.get((std.id, d), "unmarked")
            
        result_students.append(AttendanceHistoryRecord(
            student_id=std.id,
            student_name=f"{std.first_name} {std.last_name}",
            attendance=std_attendance
        ))

    return AttendanceHistoryResponse(
        group_id=group_id,
        dates=date_strs,
        students=result_students
    )


@router.get("/rating")
def get_teacher_rating(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get teacher's ratings and feedback
    """
    verify_teacher(current_user)
    
    # Calculate stats
    ratings_query = db.query(TeacherRating).filter(TeacherRating.teacher_id == current_user.id)
    
    total_reviews = ratings_query.count()
    average_rating = ratings_query.with_entities(func.avg(TeacherRating.rating)).scalar() or 0.0
    
    # Distribution
    distribution = {
        5: ratings_query.filter(TeacherRating.rating == 5).count(),
        4: ratings_query.filter(TeacherRating.rating == 4).count(),
        3: ratings_query.filter(TeacherRating.rating == 3).count(),
        2: ratings_query.filter(TeacherRating.rating == 2).count(),
        1: ratings_query.filter(TeacherRating.rating == 1).count(),
    }
    
    # Recent feedback
    recent_reviews = ratings_query.order_by(TeacherRating.created_at.desc()).limit(10).all()
    
    recent_feedback = []
    for r in recent_reviews:
        student_name = "Anonymous"
        if r.rater:
            student_name = f"{r.rater.first_name} {r.rater.last_name}"
            
        recent_feedback.append({
            "id": r.id,
            "student_name": student_name,
            "rating": r.rating,
            "comment": r.comment,
            "date": r.created_at.strftime("%Y-%m-%d")
        })

    # Awards
    awards_db = db.query(TeacherAward).filter(TeacherAward.teacher_id == current_user.id).order_by(TeacherAward.award_date.desc()).all()
    awards = [{
        "id": a.id,
        "title": a.award_title,
        "date": a.award_date.strftime("%Y-%m-%d"),
        "certificate_url": a.certificate_url
    } for a in awards_db]

    return {
        "overall_rating": round(average_rating, 1),
        "total_reviews": total_reviews,
        "distribution": distribution,
        "recent_feedback": recent_feedback,
        "awards": awards
    }


@router.get("/lessons", response_model=List[LessonResponse])
def get_teacher_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all lessons created by the teacher"""
    verify_teacher(current_user)
    lessons = db.query(Lesson).filter(Lesson.teacher_id == current_user.id).order_by(Lesson.lesson_date.desc()).all()
    
    return [
        LessonResponse(
            id=l.id,
            title=l.title,
            description=l.description,
            lesson_date=l.lesson_date,
            group_id=l.group_id,
            group_name=l.group.name,
            created_at=l.created_at
        )
        for l in lessons
    ]

@router.post("/lessons", response_model=LessonResponse)
def create_lesson(
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lesson/notice"""
    verify_teacher(current_user)
    
    # Verify teacher owns group
    group = db.query(Group).filter(Group.id == lesson_data.group_id, Group.teacher_id == current_user.id).first()
    if not group and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied to this group")
        
    lesson = Lesson(
        title=lesson_data.title,
        description=lesson_data.description,
        lesson_date=lesson_data.lesson_date,
        group_id=lesson_data.group_id,
        teacher_id=current_user.id
    )
    
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    
    return LessonResponse(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        lesson_date=lesson.lesson_date,
        group_id=lesson.group_id,
        group_name=lesson.group.name,
        created_at=lesson.created_at
    )

@router.delete("/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a lesson"""
    verify_teacher(current_user)
    
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    if lesson.teacher_id != current_user.id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db.delete(lesson)
    db.commit()
    
    return {"message": "Lesson deleted successfully"}

@router.get("/planner")
def get_teacher_planner(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get teacher's lesson plans, exams, and schedule
    This is the core planning feature
    """
    verify_teacher(current_user)
    
    groups = get_teacher_groups(db, current_user.id)
    group_ids = [g.id for g in groups]
    
    # Fetch real lessons
    lessons = db.query(Lesson).filter(
        Lesson.teacher_id == current_user.id
    ).order_by(Lesson.lesson_date.asc()).all()
    
    # Build schedule from groups
    schedule = []
    for group in groups:
        if group.days_of_week:
            schedule.append({
                "type": "group_schedule",
                "group_id": group.id,
                "group_name": group.name,
                "subject": group.subject.name,
                "days": group.days_of_week,
                "time": str(group.start_time) if group.start_time else None,
                "recurring": True
            })
    
    planned_lessons = [
        {
            "id": l.id,
            "title": l.title,
            "description": l.description,
            "date": str(l.lesson_date),
            "group_id": l.group_id,
            "group_name": l.group.name
        }
        for l in lessons
    ]
    
    return {
        "schedule": schedule,
        "planned_lessons": planned_lessons,
        "planned_exams": [],
        "notes": [],
    }
    # Add these imports at the top of your file
from pydantic import EmailStr
from passlib.context import CryptContext

# Add password context (if not already in your project)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ============================================
# PROFILE SCHEMAS (Add to SCHEMAS section)
# ============================================

class ProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    bio: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class TeacherProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str]
    phone: str
    address: Optional[str]
    bio: Optional[str]
    avatar: Optional[str]
    employee_id: Optional[str]
    join_date: Optional[datetime]
    status: str
    department: Optional[str]
    stats: dict

    class Config:
        from_attributes = True


# ============================================
# PROFILE ENDPOINTS (Add these at the end)
# ============================================

@router.get("/profile", response_model=TeacherProfileResponse)
def get_teacher_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current teacher's profile with stats
    """
    verify_teacher(current_user)
    
    teacher = db.query(User).filter(User.id == current_user.id).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Calculate stats
    total_groups = db.query(func.count(Group.id)).filter(
        Group.teacher_id == teacher.id,
        Group.is_active == True
    ).scalar() or 0
    
    # Get group IDs for student count
    group_ids = [g.id for g in db.query(Group.id).filter(
        Group.teacher_id == teacher.id,
        Group.is_active == True
    ).all()]
    
    total_students = 0
    if group_ids:
        total_students = db.query(func.count(GroupStudent.id)).filter(
            GroupStudent.group_id.in_(group_ids),
            GroupStudent.is_active == True
        ).scalar() or 0
    
    # TODO: Implement actual rating system
    average_rating = 4.5
    
    return TeacherProfileResponse(
        id=teacher.id,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        email=teacher.email,
        phone=teacher.phone_number,
        address=getattr(teacher, 'address', None),
        bio=getattr(teacher, 'bio', None),
        avatar=getattr(teacher, 'avatar', None),
        employee_id=getattr(teacher, 'employee_id', None),
        join_date=teacher.created_at,
        status=teacher.status if hasattr(teacher, 'status') else 'active',
        department=getattr(teacher, 'department', None),
        stats={
            "total_groups": total_groups,
            "total_students": total_students,
            "average_rating": average_rating
        }
    )


@router.put("/profile")
def update_teacher_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current teacher's profile
    """
    verify_teacher(current_user)
    
    teacher = db.query(User).filter(User.id == current_user.id).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Update fields
    teacher.first_name = profile_data.first_name
    teacher.last_name = profile_data.last_name
    teacher.email = profile_data.email
    teacher.phone_number = profile_data.phone
    teacher.address = profile_data.address
    teacher.bio = profile_data.bio
    
    try:
        db.commit()
        db.refresh(teacher)
        
        return {
            "message": "Profile updated successfully",
            "teacher": {
                "id": teacher.id,
                "first_name": teacher.first_name,
                "last_name": teacher.last_name,
                "email": teacher.email,
                "phone_number": teacher.phone_number
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/change-password")
def change_teacher_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change teacher's password
    """
    verify_teacher(current_user)
    
    teacher = db.query(User).filter(User.id == current_user.id).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, teacher.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters"
        )
    
    # Update password
    teacher.password_hash = hash_password(password_data.new_password)
    
    try:
        db.commit()
        return {"message": "Password changed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change password: {str(e)}"
        )