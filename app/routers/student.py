from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict
from datetime import datetime, date
from pydantic import BaseModel
from passlib.context import CryptContext

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_students import GroupStudent
from app.models.payment import Payment
from app.models.conversation import Conversation, ConversationType
from app.models.material import Material
from app.models.gradebook import GradebookLevel, GradebookExam, GradebookScore
from app.models.lesson import Lesson
from app.models.exam import Exam, ExamStatus
from app.models.attendance import Attendance
from app.services.stats_service import (
    calculate_attendance_rate,
    calculate_course_completion_rate
)


router = APIRouter(prefix="/student", tags=["Student"])


# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def verify_student(current_user: User):
    """Verify user is a student, admin, or super_admin"""
    # Fix: User.role is a string column
    role = current_user.role
    if hasattr(role, 'value'):
        role = role.value
        
    if role not in ["student", "admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only students and admins can access this endpoint"
        )


def get_target_student_id(current_user: User, student_id: Optional[int] = None) -> int:
    """Determine which student's data to show, handling admin impersonation"""
    if not student_id:
        return current_user.id
        
    role_str = getattr(current_user.role, 'value', current_user.role)
    if role_str in ["admin", "super_admin"] or getattr(current_user, 'is_platform_admin', False):
        return student_id
        
    if student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot view other students' data")
        
    return current_user.id


# ============================================
# SCHEMAS
# ============================================

class AttendanceHistoryRecord(BaseModel):
    group_id: int
    group_name: str
    attendance: Dict[str, str]

class AttendanceHistoryResponse(BaseModel):
    dates: List[str]
    groups: List[AttendanceHistoryRecord]

class GroupInfo(BaseModel):
    id: int
    name: str
    subject_name: str
    teacher_name: str
    level: str
    days_of_week: str | None
    start_time: str | None
    end_time: str | None
    start_date: str | None
    end_date: str | None
    current_students: int
    max_students: int

    class Config:
        from_attributes = True


class PaymentInfo(BaseModel):
    id: int
    amount: float
    payment_method: str
    payment_date: str
    status: str
    description: str | None

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_groups: int
    active_groups: int
    total_payments: float
    pending_payments: float
    active_groups: int
    total_payments: float
    pending_payments: float
    attendance_rate: int
    completion_rate: int

class LessonInfo(BaseModel):
    id: int
    title: str
    description: Optional[str]
    lesson_date: str
    group_name: str
    teacher_name: str

    class Config:
        from_attributes = True

class MaterialInfo(BaseModel):
    id: int
    title: str
    description: Optional[str]
    file_path: str
    file_name: str
    file_type: str
    created_at: datetime
    group_name: str

    class Config:
        from_attributes = True

class ExamDashboardInfo(BaseModel):
    id: int
    title: str
    subject_name: str
    total_points: float
    duration_minutes: Optional[int]
    start_date: Optional[datetime]
    end_date: Optional[datetime]

    class Config:
        from_attributes = True

class GradebookScoreDashboardInfo(BaseModel):
    exam_title: str
    max_score: float
    score: Optional[float]
    comment: Optional[str]
    date: str

class GradebookLevelDashboardInfo(BaseModel):
    level_id: int
    level_title: str
    group_name: str
    passing_percentage: float
    total_exams: int
    student_score_percentage: float
    is_passing: bool
    exams: List[GradebookScoreDashboardInfo]

class StudentDashboardResponse(BaseModel):
    stats: DashboardStats
    enrolled_groups: List[GroupInfo]
    recent_payments: List[PaymentInfo]
    upcoming_lessons: List[LessonInfo]
    recent_materials: List[MaterialInfo]
    upcoming_exams: List[ExamDashboardInfo]
    gradebooks: List[GradebookLevelDashboardInfo] = []
    group_chats_available: int


class StudentProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None


class TeacherRatingCreate(BaseModel):
    teacher_id: int
    rating: int  # 1-5
    comment: Optional[str] = None


class StudentPasswordChange(BaseModel):
    current_password: str
    new_password: str


class StudentProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str]
    phone: str
    address: Optional[str]
    parent_name: Optional[str]
    parent_phone: Optional[str]
    avatar: Optional[str]
    student_id: Optional[str]
    join_date: Optional[datetime]
    status: str
    branch: Optional[str]
    stats: dict

    class Config:
        from_attributes = True


# ============================================
# ENDPOINTS
# ============================================

from fastapi import APIRouter, Query

# ... imports ...

@router.get("/dashboard", response_model=StudentDashboardResponse)
def get_student_dashboard(
    student_id: Optional[int] = Query(None, description="Admin only: View specific student dashboard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student dashboard with stats, groups, and payments"""
    verify_student(current_user)
    
    # Determine which student's data to show
    target_student_id = get_target_student_id(current_user, student_id)
    
    # Get enrolled groups
    enrollments = db.query(GroupStudent).filter(
        GroupStudent.student_id == target_student_id,
        GroupStudent.is_active
    ).all()
    
    group_ids = [e.group_id for e in enrollments]
    
    groups = db.query(Group).filter(
        Group.id.in_(group_ids) if group_ids else False
    ).all()
    
    # Build group info
    enrolled_groups = []
    active_groups = 0
    
    for group in groups:
        if group.status == "active":
            active_groups += 1
        
        enrolled_groups.append(GroupInfo(
            id=group.id,
            name=group.name,
            subject_name=group.subject.name,
            teacher_name=f"{group.teacher.first_name} {group.teacher.last_name}",
            level=group.level.value if group.level else "N/A",
            days_of_week=group.days_of_week,
            start_time=str(group.start_time) if group.start_time else None,
            end_time=str(group.end_time) if group.end_time else None,
            start_date=str(group.start_date) if group.start_date else None,
            end_date=str(group.end_date) if group.end_date else None,
            current_students=group.current_students,
            max_students=group.max_students
        ))
    
    # Get payments
    payments = db.query(Payment).filter(
        Payment.student_id == target_student_id
    ).order_by(Payment.payment_date.desc()).limit(5).all()
    
    total_payments = db.query(func.sum(Payment.amount)).filter(
        Payment.student_id == target_student_id,
        Payment.status == "completed"
    ).scalar() or 0.0
    
    pending_payments = db.query(func.sum(Payment.amount)).filter(
        Payment.student_id == target_student_id,
        Payment.status == "pending"
    ).scalar() or 0.0
    
    recent_payments = [
        PaymentInfo(
            id=p.id,
            amount=p.amount,
            payment_method=p.payment_method,
            payment_date=str(p.payment_date),
            status=p.status,
            description=p.description
        )
        for p in payments
    ]
    
    # Count group chats available
    group_chats = db.query(Conversation).filter(
        Conversation.type == ConversationType.GROUP,
        Conversation.group_id.in_(group_ids) if group_ids else False
    ).count()

    # Get upcoming lessons for student's groups
    upcoming_lessons_query = db.query(Lesson).filter(
        Lesson.group_id.in_(group_ids) if group_ids else False,
        Lesson.lesson_date >= date.today()
    ).order_by(Lesson.lesson_date.asc()).limit(5).all()

    upcoming_lessons = [
        LessonInfo(
            id=l.id,
            title=l.title,
            description=l.description,
            lesson_date=str(l.lesson_date),
            group_name=l.group.name,
            teacher_name=f"{l.teacher.first_name} {l.teacher.last_name}"
        )
        for l in upcoming_lessons_query
    ]

    # Get recent materials for student's groups
    # Get recent materials for student's groups or from their teachers
    # Find all teachers for the student's groups
    teacher_ids = [g.teacher_id for g in groups]
    
    recent_materials_query = db.query(Material).filter(
        or_(
            Material.group_id.in_(group_ids) if group_ids else False,
            Material.teacher_id.in_(teacher_ids) if teacher_ids else False
        )
    ).order_by(Material.created_at.desc()).limit(10).all()

    recent_materials = [
        MaterialInfo(
            id=m.id,
            title=m.title,
            description=m.description,
            file_path=m.file_path,
            file_name=m.file_name,
            file_type=m.file_type,
            created_at=m.created_at,
            group_name=m.group.name if m.group else "Global"
        )
        for m in recent_materials_query
    ]

    # Get upcoming exams for student's groups
    upcoming_exams_query = db.query(Exam).filter(
        Exam.group_id.in_(group_ids) if group_ids else False,
        Exam.status == ExamStatus.published,
        or_(Exam.end_date >= datetime.utcnow(), Exam.end_date.is_(None))
    ).order_by(Exam.start_date.asc()).limit(5).all()

    upcoming_exams = [
        ExamDashboardInfo(
            id=e.id,
            title=e.title,
            subject_name=e.subject.name,
            total_points=e.total_points,
            duration_minutes=e.duration_minutes,
            start_date=e.start_date,
            end_date=e.end_date
        )
        for e in upcoming_exams_query
    ]
    
    # Get Gradebook data for the student
    gradebook_data = []
    if group_ids:
        # Fetch all levels for student's groups
        levels = db.query(GradebookLevel).filter(
            GradebookLevel.group_id.in_(group_ids),
            GradebookLevel.is_active
        ).all()
        
        for lvl in levels:
            exams_in_level = db.query(GradebookExam).filter(GradebookExam.level_id == lvl.id).all()
            
            level_exams = []
            total_earned = 0.0
            total_possible = 0.0
            
            for ex in exams_in_level:
                # Find student score
                score = db.query(GradebookScore).filter(
                    GradebookScore.exam_id == ex.id,
                    GradebookScore.student_id == target_student_id
                ).first()
                
                if score:
                    total_earned += score.score
                    total_possible += ex.max_score
                    
                level_exams.append(GradebookScoreDashboardInfo(
                    exam_title=ex.title,
                    max_score=ex.max_score,
                    score=score.score if score else None,
                    comment=score.comment if score else None,
                    date=ex.exam_date.strftime("%Y-%m-%d") if ex.exam_date else ""
                ))
            
            # Use max(1) to avoid division by zero if total_possible is 0
            student_percentage = (total_earned / max(total_possible, 1.0)) * 100 if total_possible > 0 else 0
            is_passing = student_percentage >= lvl.passing_percentage
            
            # If no exams graded yet, we don't strictly say failing, but by default it is what it is.
            if total_possible == 0:
                is_passing = True # Or None
                
            gradebook_data.append(GradebookLevelDashboardInfo(
                level_id=lvl.id,
                level_title=lvl.title,
                group_name=lvl.group.name if lvl.group else "Unknown Group",
                passing_percentage=lvl.passing_percentage,
                total_exams=len(exams_in_level),
                student_score_percentage=round(student_percentage, 1),
                is_passing=is_passing,
                exams=level_exams
            ))
    
    # Calculate completion rate (dummy for now)
    completion_rate = calculate_course_completion_rate(db, student_id=target_student_id)
    attendance_rate = calculate_attendance_rate(db, student_id=target_student_id)
    
    stats = DashboardStats(
        total_groups=len(groups),
        active_groups=active_groups,
        total_payments=total_payments,
        pending_payments=pending_payments,
        completion_rate=completion_rate,
        attendance_rate=attendance_rate
    )
    
    return StudentDashboardResponse(
        stats=stats,
        enrolled_groups=enrolled_groups,
        recent_payments=recent_payments,
        upcoming_lessons=upcoming_lessons,
        recent_materials=recent_materials,
        upcoming_exams=upcoming_exams,
        gradebooks=gradebook_data,
        group_chats_available=group_chats
    )


@router.get("/courses", response_model=List[GroupInfo])
def get_student_courses(
    student_id: Optional[int] = Query(None, description="Admin only: View specific student courses"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all courses/groups the student is enrolled in"""
    verify_student(current_user)
    
    target_student_id = get_target_student_id(current_user, student_id)
        
    enrollments = db.query(GroupStudent).filter(
        GroupStudent.student_id == target_student_id,
        GroupStudent.is_active
    ).all()
    
    group_ids = [e.group_id for e in enrollments]
    
    groups = db.query(Group).filter(
        Group.id.in_(group_ids) if group_ids else False
    ).all()
    
    return [
        GroupInfo(
            id=group.id,
            name=group.name,
            subject_name=group.subject.name,
            teacher_name=f"{group.teacher.first_name} {group.teacher.last_name}",
            level=group.level.value if group.level else "N/A",
            days_of_week=group.days_of_week,
            start_time=str(group.start_time) if group.start_time else None,
            end_time=str(group.end_time) if group.end_time else None,
            start_date=str(group.start_date) if group.start_date else None,
            end_date=str(group.end_date) if group.end_date else None,
            current_students=group.current_students,
            max_students=group.max_students
        )
        for group in groups
    ]


@router.get("/payments", response_model=List[PaymentInfo])
def get_student_payments(
    student_id: Optional[int] = Query(None, description="Admin only: View specific student payments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payments for the student"""
    verify_student(current_user)
    
    target_student_id = get_target_student_id(current_user, student_id)
        
    payments = db.query(Payment).filter(
        Payment.student_id == target_student_id
    ).order_by(Payment.payment_date.desc()).all()
    
    return [
        PaymentInfo(
            id=p.id,
            amount=p.amount,
            payment_method=p.payment_method,
            payment_date=str(p.payment_date),
            status=p.status,
            description=p.description
        )
        for p in payments
    ]


@router.get("/rating")
def get_student_rating(
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {
        "rank": "Top 10%",
        "total_score": 1250,
        "attendance_rate": 95,
        "assignment_completion": 88
    }


@router.get("/teachers")
def get_student_teachers(
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all teachers in the student's institution along with their group stats"""
    verify_student(current_user)
    target_student_id = get_target_student_id(current_user, student_id)
    
    # Check if student belongs to an institution
    target_student = db.query(User).filter(User.id == target_student_id).first()
    if not target_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    institution_id = target_student.institution_id
    if not institution_id:
        return []
    
    # Get all teachers in the institution
    teachers = db.query(User).filter(
        User.institution_id == institution_id,
        User.role == "teacher",
        User.is_active
    ).all()
    
    teachers_list = []
    for teacher in teachers:
        # Get active groups for this teacher
        teacher_groups = db.query(Group).filter(
            Group.teacher_id == teacher.id,
            Group.status == "active"
        ).all()
        
        # Calculate stats
        group_count = len(teacher_groups)
        levels = list(set([g.level.value for g in teacher_groups if g.level]))
        subjects = list(set([g.subject.name for g in teacher_groups if g.subject]))
        student_count = sum([g.current_students for g in teacher_groups])
        
        teachers_list.append({
            "id": teacher.id,
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "role": "teacher",
            "phone": getattr(teacher, 'phone_number', None),
            "stats": {
                "group_count": group_count,
                "student_count": student_count,
                "levels": levels,
                "subjects": subjects
            }
        })
            
    return teachers_list



# ============================================
# PROFILE ENDPOINTS
# ============================================

@router.get("/profile", response_model=StudentProfileResponse)
def get_student_profile(
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current student's profile with stats"""
    verify_student(current_user)
    target_student_id = get_target_student_id(current_user, student_id)
    
    student = db.query(User).filter(User.id == target_student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Calculate stats
    enrolled_groups_count = db.query(func.count(GroupStudent.id)).filter(
        GroupStudent.student_id == student.id,
        GroupStudent.is_active
    ).scalar() or 0
    
    # Get enrolled courses (distinct subjects)
    enrolled_courses_query = db.query(func.count(func.distinct(Group.subject_id))).join(
        GroupStudent, Group.id == GroupStudent.group_id
    ).filter(
        GroupStudent.student_id == student.id,
        GroupStudent.is_active
    )
    enrolled_courses_count = enrolled_courses_query.scalar() or 0
    
    # TODO: Calculate actual attendance and completion rates
    attendance_rate = calculate_attendance_rate(db, student_id=student.id)
    completion_rate = calculate_course_completion_rate(db, student_id=student.id)
    
    return StudentProfileResponse(
        id=student.id,
        first_name=student.first_name,
        last_name=student.last_name,
        email=student.email,
        phone=student.phone_number,
        address=getattr(student, 'address', None),
        parent_name=getattr(student, 'parent_name', None),
        parent_phone=getattr(student, 'parent_phone', None),
        avatar=getattr(student, 'avatar', None),
        student_id=getattr(student, 'student_id', None),
        join_date=student.created_at,
        status=getattr(student, 'status', 'active'),
        branch=getattr(student, 'branch_name', None),
        stats={
            "enrolled_courses": enrolled_courses_count,
            "enrolled_groups": enrolled_groups_count,
            "attendance_rate": attendance_rate,
            "completion_rate": completion_rate
        }
    )


@router.put("/profile")
def update_student_profile(
    profile_data: StudentProfileUpdate,
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current student's profile"""
    verify_student(current_user)
    target_student_id = get_target_student_id(current_user, student_id)
    
    student = db.query(User).filter(User.id == target_student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update fields
    student.first_name = profile_data.first_name
    student.last_name = profile_data.last_name
    student.email = profile_data.email
    student.phone_number = profile_data.phone
    student.address = profile_data.address
    student.parent_name = profile_data.parent_name
    student.parent_phone_number = profile_data.parent_phone
    
    try:
        db.commit()
        db.refresh(student)
        
        return {
            "message": "Profile updated successfully",
            "student": {
                "id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "email": student.email,
                "phone": student.phone_number
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/change-password")
def change_student_password(
    password_data: StudentPasswordChange,
    student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change student's password"""
    verify_student(current_user)
    target_student_id = get_target_student_id(current_user, student_id)
    
    student = db.query(User).filter(User.id == target_student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, student.password_hash):
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
    student.password_hash = hash_password(password_data.new_password)
    
    try:
        db.commit()
        return {"message": "Password changed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change password: {str(e)}"
        )


@router.get("/attendance/history", response_model=AttendanceHistoryResponse)
def get_student_attendance_history(
    student_id: Optional[int] = Query(None, description="Admin only: View specific student attendance"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the student's attendance history for their enrolled groups for the last 30 distinct dates."""
    verify_student(current_user)
    
    target_student_id = get_target_student_id(current_user, student_id)
        
    # Get all active enrollments
    enrollments = db.query(GroupStudent).filter(
        GroupStudent.student_id == target_student_id,
        GroupStudent.is_active
    ).all()
    
    group_ids = [e.group_id for e in enrollments]
    
    if not group_ids:
        return AttendanceHistoryResponse(dates=[], groups=[])
        
    # Get groups details
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    group_map = {g.id: g.name for g in groups}

    # Get the last 30 distinct dates with attendance across all student's groups
    dates_query = db.query(Attendance.date).filter(
        Attendance.group_id.in_(group_ids)
    ).distinct().order_by(Attendance.date.desc()).limit(30).all()
    
    dates = sorted([d[0] for d in dates_query])
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]

    # Get student's attendance records for these dates and groups
    if dates:
        records = db.query(Attendance).filter(
            Attendance.student_id == target_student_id,
            Attendance.group_id.in_(group_ids),
            Attendance.date.in_(dates)
        ).all()
        # Create a lookup dictionary: (group_id, date_str) -> status
        record_map = {(r.group_id, r.date.strftime("%Y-%m-%d")): r.status.value if hasattr(r.status, "value") else str(r.status) for r in records}
    else:
        record_map = {}

    result_groups = []
    for g_id in group_ids:
        group_attendance = {}
        for d in date_strs:
            group_attendance[d] = record_map.get((g_id, d), "unmarked")
            
        result_groups.append(AttendanceHistoryRecord(
            group_id=g_id,
            group_name=group_map.get(g_id, "Unknown Group"),
            attendance=group_attendance
        ))

    return AttendanceHistoryResponse(
        dates=date_strs,
        groups=result_groups
    )