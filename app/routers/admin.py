from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import extract
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.payment import Payment
from app.models.teacher_payment import TeacherPayment
from app.models.expense import Expense
from app.models.group_students import GroupStudent
from app.models.attendance import Attendance
from app.constants.roles import Role
from app.security.permissions import is_admin_or_higher
from app.services.stats_service import (
    calculate_attendance_rate,
    calculate_payment_collection_rate,
    calculate_course_completion_rate
)

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

class AttendanceHistoryRecord(BaseModel):
    student_id: int
    student_name: str
    attendance: Dict[str, str]

class AttendanceHistoryResponse(BaseModel):
    group_id: int
    dates: List[str]
    students: List[AttendanceHistoryRecord]

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated statistics for the Admin Dashboard.
    Ensures strict role separation and tenant isolation.
    """
    
    try:
        # 1. Security & Isolation Check
        if not is_admin_or_higher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Access denied"
            )
        
        # Determine the institution scope
        # Platform Owner sees global stats (or filtered if we add that later)
        # Super Admin / Admin sees ONLY their institution
        institution_id = current_user.institution_id
        
        # Base query for users in this institution
        user_query = db.query(User).filter(User.is_active == True)
        
        if institution_id:
            user_query = user_query.filter(User.institution_id == institution_id)
        
        # 2. Key Metrics Calculation
        
        # Count Students
        total_students = user_query.filter(User.role == Role.STUDENT).count()
        
        # Count Teachers (Strictly role='teacher')
        total_teachers = user_query.filter(User.role == Role.TEACHER).count()
        
        # Count Staff (Admins + Staff members, excluding Super Admin if desired, but usually included in "Staff")
        # We group 'admin', 'staff', 'super_admin' as "Staff" for the dashboard view
        staff_roles = [Role.ADMIN, Role.STAFF, Role.SUPER_ADMIN, "admin", "staff", "super_admin"]
        total_staff = user_query.filter(User.role.in_(staff_roles)).count()
        
        # Active Groups
        group_query = db.query(Group).filter(Group.status == 'active')
        if institution_id:
            group_query = group_query.filter(Group.institution_id == institution_id)
        total_groups = group_query.count()
        
        # Revenue (Completed payments only)
        payment_query = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed"
        )
        if institution_id:
            payment_query = payment_query.filter(User.institution_id == institution_id)
            
        # FIX: Handle None result from sum()
        total_revenue = payment_query.scalar() or 0.0

        # Current Month Revenue
        now = datetime.utcnow()
        current_month_start = datetime(now.year, now.month, 1)
        next_month = now.replace(day=28) + timedelta(days=4)
        current_month_end = next_month - timedelta(days=next_month.day)

        current_month_query = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed",
            Payment.payment_date >= current_month_start,
            Payment.payment_date <= current_month_end
        )
        if institution_id:
            current_month_query = current_month_query.filter(User.institution_id == institution_id)
        current_month_revenue = current_month_query.scalar() or 0.0

        # Last Month Revenue
        last_month_end = current_month_start - timedelta(days=1)
        last_month_start = datetime(last_month_end.year, last_month_end.month, 1)

        last_month_query = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed",
            Payment.payment_date >= last_month_start,
            Payment.payment_date <= last_month_end
        )
        if institution_id:
            last_month_query = last_month_query.filter(User.institution_id == institution_id)
        last_month_revenue = last_month_query.scalar() or 0.0

        revenue_growth = 0.0
        if last_month_revenue > 0:
            revenue_growth = ((current_month_revenue - last_month_revenue) / last_month_revenue) * 100
        elif current_month_revenue > 0:
            revenue_growth = 100.0

        # --- EXPENSES & NET PROFIT ---
        # Total Expenses = Older TeacherPayment + New Expense model
        tp_sum = db.query(func.sum(TeacherPayment.amount))
        exp_sum = db.query(func.sum(Expense.amount))
        
        if institution_id:
            # TeacherPayment has teacher_id, need to check if user belongs to institution
            tp_sum = tp_sum.join(User, TeacherPayment.teacher_id == User.id).filter(User.institution_id == institution_id)
            exp_sum = exp_sum.filter(Expense.institution_id == institution_id)
            
        total_staff_costs = (tp_sum.scalar() or 0.0) + (exp_sum.scalar() or 0.0)
        net_profit = total_revenue - total_staff_costs

        # Monthly Stats (Last 6 Months)
        monthly_stats = []
        for i in range(5, -1, -1):
            date = now - timedelta(days=i*30) # Approx
            check_month = date.month
            check_year = date.year
            
            month_query = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
                Payment.status == "completed",
                extract('month', Payment.payment_date) == check_month,
                extract('year', Payment.payment_date) == check_year
            )
            if institution_id:
                month_query = month_query.filter(User.institution_id == institution_id)
            
            month_rev = month_query.scalar() or 0.0
            
            monthly_stats.append({
                "month": date.strftime("%B"),
                "year": check_year,
                "revenue": month_rev
            })

        # Calculate Rates
        attendance_rate = calculate_attendance_rate(db, institution_id)
        collection_rate = calculate_payment_collection_rate(db, institution_id)
        completion_rate = calculate_course_completion_rate(db, institution_id)
        
        # 3. Recent Activity (New assignments/users)
        # Get last 5 users registered
        recent_users = user_query.order_by(User.created_at.desc()).limit(5).all()
        
        recent_users_data = [
            {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}",
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at
            }
            for u in recent_users
        ]

        return {
            "metrics": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_staff": total_staff,
                "total_groups": total_groups,
                "total_revenue": total_revenue,
                "total_expenses": total_staff_costs,
                "net_profit": net_profit,
                "current_month_revenue": current_month_revenue,
                "last_month_revenue": last_month_revenue,
                "revenue_growth": round(revenue_growth, 1),
                "current_month_revenue": current_month_revenue,
                "last_month_revenue": last_month_revenue,
                "revenue_growth": round(revenue_growth, 1),
                "monthly_stats": monthly_stats,
                "attendance_rate": attendance_rate,
                "collection_rate": collection_rate,
                "completion_rate": completion_rate
            },
            "recent_users": recent_users_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] ADMIN DASHBOARD ERROR: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard Error: {str(e)}"
        )


@router.get("/groups/{group_id}/attendance/history", response_model=AttendanceHistoryResponse)
def get_admin_group_attendance_history(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance history for a specific group for the last 30 classes (Admin view)"""
    if not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Verify group ownership/visibility
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if current_user.institution_id and group.institution_id != current_user.institution_id:
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
