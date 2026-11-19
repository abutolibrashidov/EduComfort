from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict
from datetime import datetime, date
from pydantic import BaseModel
from passlib.context import CryptContext

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.center.models.group import Group
from app.center.models.group_students import GroupStudent
from app.billing.models.payment import Payment
from app.engagement.models.conversation import Conversation, ConversationType
from app.academic.models.material import Material
from app.academic.models.gradebook import GradebookLevel, GradebookExam, GradebookScore
from app.academic.models.lesson import Lesson
from app.academic.models.exam import Exam, ExamStatus
from app.academic.models.attendance import Attendance
from app.academic.services.stats_service import (
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


def get_target_student_id(db: Session, current_user: User, student_id: Optional[int] = None) -> int:
    """Determine which student's data to show, handling admin impersonation"""
    if not student_id:
        return current_user.id
        
    from app.security.permissions import can_view_user
    target_student = db.query(User).filter(User.id == student_id).first()
    if not target_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if not can_view_user(current_user, target_student):
        raise HTTPException(status_code=403, detail="Access denied: Cannot view this student's data")
        
    return target_student.id


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
    target_student_id = get_target_student_id(db, current_user, student_id)
    
    from app.academic.services.student_service import get_student_dashboard_data
    return get_student_dashboard_data(db, target_student_id)


@router.get("/courses", response_model=List[GroupInfo])
def get_student_courses(
    student_id: Optional[int] = Query(None, description="Admin only: View specific student courses"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all courses/groups the student is enrolled in"""
    verify_student(current_user)
    
    target_student_id = get_target_student_id(db, current_user, student_id)
        
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
    
    target_student_id = get_target_student_id(db, current_user, student_id)
        
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
    target_student_id = get_target_student_id(db, current_user, student_id)
    
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
    
    from app.engagement.models.rating import TeacherRating
    from app.engagement.models.feed import UserFollow

    teachers_list = []
    for teacher in teachers:
        # Get active groups for this teacher
        teacher_groups = db.query(Group).filter(
            Group.teacher_id == teacher.id,
            Group.status == "active"
        ).all()
        
        # Calculate stats
        group_count = len(teacher_groups)
        levels = list(set([str(getattr(g.level, 'value', g.level)) for g in teacher_groups if g.level]))
        subjects = list(set([g.subject.name for g in teacher_groups if g.subject]))
        student_count = sum([getattr(g, 'current_students', 0) or 0 for g in teacher_groups])
        
        # Get Average Rating
        avg_rating = db.query(func.avg(TeacherRating.rating)).filter(
            TeacherRating.teacher_id == teacher.id
        ).scalar() or 0.0

        # Check if following
        is_following = db.query(UserFollow).filter(
            UserFollow.follower_id == current_user.id,
            UserFollow.followed_id == teacher.id
        ).first() is not None
        
        teachers_list.append({
            "id": teacher.id,
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "role": "teacher",
            "phone": getattr(teacher, 'phone_number', None),
            "avatar": getattr(teacher, 'avatar', None),
            "is_following": is_following,
            "stats": {
                "group_count": group_count,
                "student_count": student_count,
                "levels": levels,
                "subjects": subjects,
                "average_rating": round(float(avg_rating), 1)
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
    target_student_id = get_target_student_id(db, current_user, student_id)
    
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
    target_student_id = get_target_student_id(db, current_user, student_id)
    
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
    target_student_id = get_target_student_id(db, current_user, student_id)
    
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
    
    target_student_id = get_target_student_id(db, current_user, student_id)
        
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