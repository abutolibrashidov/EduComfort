from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.core.models.user import User
from app.billing.models.payment import Payment
from app.academic.models.attendance import Attendance, AttendanceStatus

def calculate_payment_collection_rate(db: Session, institution_id: int = None, student_id: int = None) -> int:
    """
    Calculate portion of payments marked as 'completed' vs 'pending' + 'completed'.
    Returns integer percentage (0-100).
    """
    query = db.query(
        func.sum(case((Payment.status == 'completed', Payment.amount), else_=0)),
        func.sum(Payment.amount)
    )
    
    if institution_id:
        query = query.join(User, Payment.student_id == User.id).filter(User.institution_id == institution_id)
        
    if student_id:
        query = query.filter(Payment.student_id == student_id)
        
    result = query.first()
    if not result:
        return 0
        
    completed_sum, total_sum = result
    
    if not total_sum or total_sum == 0:
        return 0
        
    return int((completed_sum / total_sum) * 100)

def calculate_attendance_rate(db: Session, institution_id: int = None, student_id: int = None, teacher_id: int = None) -> int:
    """
    Calculate attendance rate: (Present + Late) / Total Records
    """
    try:
        from app.center.models.group import Group
        
        # Base queries
        total_query = db.query(func.count(Attendance.id))
        present_query = db.query(func.count(Attendance.id)).filter(
            Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        )
        
        if institution_id:
            # Join with User to filter by institution
            total_query = total_query.join(User, Attendance.student_id == User.id).filter(User.institution_id == institution_id)
            present_query = present_query.join(User, Attendance.student_id == User.id).filter(User.institution_id == institution_id)
            
        if student_id:
            total_query = total_query.filter(Attendance.student_id == student_id)
            present_query = present_query.filter(Attendance.student_id == student_id)
            
        if teacher_id:
            # Filter by groups taught by teacher
            # Attendance -> Group -> teacher_id
            total_query = total_query.join(Group, Attendance.group_id == Group.id).filter(Group.teacher_id == teacher_id)
            present_query = present_query.join(Group, Attendance.group_id == Group.id).filter(Group.teacher_id == teacher_id)
            
        total = total_query.scalar() or 0
        present = present_query.scalar() or 0
        
        if total == 0:
            return 0
            
        return int((present / total) * 100)

    except Exception as e:
        print(f"Error calculating attendance: {e}")
        return 0

def calculate_course_completion_rate(db: Session, institution_id: int = None, student_id: int = None) -> int:
    """
    Calculate course completion rate based on completed groups vs total groups.
    Alternatively, calculate based on students in completed groups vs total enrolled students.
    Returns integer percentage (0-100).
    """
    try:
        from app.center.models.group import Group, GroupStatus
        from app.core.models.user import User

        # Calculate based on group status
        total_groups_query = db.query(func.count(Group.id)).filter(
            Group.status != GroupStatus.CANCELLED
        )
        completed_groups_query = db.query(func.count(Group.id)).filter(
            Group.status == GroupStatus.COMPLETED
        )

        if institution_id:
            total_groups_query = total_groups_query.filter(Group.institution_id == institution_id)
            completed_groups_query = completed_groups_query.filter(Group.institution_id == institution_id)

        if student_id:
            # If we need it for a specific student, we check groups the student is in
            total_groups_query = total_groups_query.join(Group.students).filter(User.id == student_id)
            completed_groups_query = completed_groups_query.join(Group.students).filter(User.id == student_id)

        total_groups = total_groups_query.scalar() or 0
        completed_groups = completed_groups_query.scalar() or 0

        if total_groups == 0:
            return 0

        return int((completed_groups / total_groups) * 100)
    except Exception as e:
        print(f"Error calculating course completion: {e}")
        return 0
