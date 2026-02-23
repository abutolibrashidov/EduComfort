from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.branch import Branch
from app.models.institution import Institution
from app.models.payment import Payment
from app.models.payment import Payment
from sqlalchemy import and_, extract
from app.services.stats_service import (
    calculate_attendance_rate,
    calculate_payment_collection_rate,
    calculate_course_completion_rate
)

router = APIRouter(prefix="/staff", tags=["Staff"])

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def verify_staff(current_user: User):
    """Verify user is staff, admin, or super_admin"""
    # Fix: User.role is a string column, handle both cases safely
    role = current_user.role
    if hasattr(role, 'value'):
        role = role.value
        
    if role not in ["staff", "admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only authorized users can access this endpoint"
        )


# ============================================
# SCHEMAS
# ============================================

class DashboardStats(BaseModel):
    total_branches: int
    total_users: int
    active_students: int
    pending_approvals: int
    total_revenue: float
    current_month_revenue: float
    last_month_revenue: float
    revenue_growth: float
    revenue_growth: float
    monthly_stats: List[dict]
    attendance_rate: int
    collection_rate: int
    completion_rate: int


class RecentRegistration(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    phone_number: str
    role: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class BranchSummary(BaseModel):
    id: int
    name: str
    phone_number: Optional[str]
    student_count: int
    is_active: bool

    class Config:
        from_attributes = True


class InstitutionSummary(BaseModel):
    id: int
    name: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str

    class Config:
        from_attributes = True


class StaffDashboardResponse(BaseModel):
    stats: DashboardStats
    recent_registrations: List[RecentRegistration]
    branch_summary: List[BranchSummary]
    institution: Optional[InstitutionSummary] = None


class StaffProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None


class StaffPasswordChange(BaseModel):
    current_password: str
    new_password: str


class StaffProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str]
    phone: str
    address: Optional[str]
    avatar: Optional[str]
    employee_id: Optional[str]
    join_date: Optional[datetime]
    status: str
    branch: Optional[str]
    stats: dict

    class Config:
        from_attributes = True


# ============================================
# DASHBOARD ENDPOINTS
# ============================================

@router.get("/dashboard", response_model=StaffDashboardResponse)
def get_staff_dashboard(
    staff_id: Optional[int] = Query(None, description="Admin only: View specific staff dashboard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get staff dashboard with branches, users, and registrations
    NO payment or student-specific data
    """
    verify_staff(current_user)
    
    # Determine which staff's data to show
    target_staff_id = current_user.id
    target_inst_id = current_user.institution_id
    
    if staff_id:
        # Only super_admin can view other admins/staff
        role = current_user.role
        if hasattr(role, 'value'): role = role.value
            
        if role == "super_admin":
            target_staff_id = staff_id
            # Get target staff's institution
            target_user = db.query(User).filter(User.id == staff_id).first()
            if target_user:
                target_inst_id = target_user.institution_id
        else:
            if staff_id != current_user.id:
                raise HTTPException(status_code=403, detail="Cannot view other staff data")
    
    inst_id = target_inst_id
    
    try:
        # Fetch Institution Data for Branding
        institution_data = None
        if inst_id:
            institution = db.query(Institution).filter(Institution.id == inst_id).first()
            if institution:
                institution_data = InstitutionSummary(
                    id=institution.id,
                    name=institution.name,
                    logo_url=institution.logo_url,
                    primary_color=institution.primary_color,
                    secondary_color=institution.secondary_color
                )
        
        # Calculate stats with Institution Scope
        
        if inst_id is None and current_user.role != "super_admin":
             # Should practically never happen if verify_staff passes, but safety check
             # If super_admin has no institution, likely local dev issue or platform admin
             pass
        
        # 1. Total Branches
        total_branches = db.query(func.count(Branch.id)).filter(Branch.institution_id == inst_id).scalar() or 0
        
        # 2. Total Users
        total_users = db.query(func.count(User.id)).filter(User.institution_id == inst_id).scalar() or 0
        
        # 3. Active Students
        active_students = db.query(func.count(User.id)).filter(
            User.role == "student",
            User.is_active == True,
            User.institution_id == inst_id
        ).scalar() or 0
        
        # 4. Pending Approvals
        pending_approvals = db.query(func.count(User.id)).filter(
            User.is_active == False,
            User.institution_id == inst_id
        ).scalar() or 0
        
        # 5. Revenue Statistics
        # Total Revenue
        total_revenue = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed",
            User.institution_id == inst_id
        ).scalar() or 0.0

        # Current Month Revenue
        now = datetime.utcnow()
        current_month_start = datetime(now.year, now.month, 1)
        next_month = now.replace(day=28) + timedelta(days=4)
        current_month_end = next_month - timedelta(days=next_month.day)

        current_month_revenue = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed",
            User.institution_id == inst_id,
            Payment.payment_date >= current_month_start,
            Payment.payment_date <= current_month_end
        ).scalar() or 0.0

        # Last Month Revenue
        last_month_end = current_month_start - timedelta(days=1)
        last_month_start = datetime(last_month_end.year, last_month_end.month, 1)

        last_month_revenue = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
            Payment.status == "completed",
            User.institution_id == inst_id,
            Payment.payment_date >= last_month_start,
            Payment.payment_date <= last_month_end
        ).scalar() or 0.0

        # Growth Percentage
        revenue_growth = 0.0
        if last_month_revenue > 0:
            revenue_growth = ((current_month_revenue - last_month_revenue) / last_month_revenue) * 100
        elif current_month_revenue > 0:
            revenue_growth = 100.0 # 100% growth if starting from 0

        # Monthly Stats (Last 6 Months)
        monthly_stats = []
        for i in range(5, -1, -1):
            date = now - timedelta(days=i*30) # Approx
            check_month = date.month
            check_year = date.year
            
            month_rev = db.query(func.sum(Payment.amount)).join(User, Payment.student_id == User.id).filter(
                Payment.status == "completed",
                User.institution_id == inst_id,
                extract('month', Payment.payment_date) == check_month,
                extract('year', Payment.payment_date) == check_year
            ).scalar() or 0.0
            
            monthly_stats.append({
                "month": date.strftime("%B"),
                "year": check_year,
                "revenue": month_rev
            })

        attendance_rate = calculate_attendance_rate(db, inst_id)
        collection_rate = calculate_payment_collection_rate(db, inst_id)
        completion_rate = calculate_course_completion_rate(db, inst_id)

        stats = DashboardStats(
            total_branches=total_branches,
            total_users=total_users,
            active_students=active_students,
            pending_approvals=pending_approvals,
            total_revenue=total_revenue,
            current_month_revenue=current_month_revenue,
            last_month_revenue=last_month_revenue,
            revenue_growth=round(revenue_growth, 1),
            monthly_stats=monthly_stats,
            attendance_rate=attendance_rate,
            collection_rate=collection_rate,
            completion_rate=completion_rate
        )

        stats = DashboardStats(
            total_branches=total_branches,
            total_users=total_users,
            active_students=active_students,
            pending_approvals=pending_approvals,
            total_revenue=total_revenue,
            current_month_revenue=current_month_revenue,
            last_month_revenue=last_month_revenue,
            revenue_growth=round(revenue_growth, 1),
            monthly_stats=monthly_stats,
            attendance_rate=attendance_rate,
            collection_rate=collection_rate,
            completion_rate=completion_rate
        )
        
        # Get recent registrations (last 10)
        recent_users = db.query(User).filter(
            User.institution_id == inst_id
        ).order_by(
            User.created_at.desc()
        ).limit(10).all()
        
        recent_registrations = [
            RecentRegistration(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name or "",
                phone_number=user.phone_number,
                role=user.role,
                created_at=user.created_at,
                is_active=user.is_active
            )
            for user in recent_users
        ]
        
        # Get branch summary
        branches = db.query(Branch).filter(Branch.institution_id == inst_id).all()
        
        branch_summary = []
        for branch in branches:
            # Count students in this branch
            student_count = db.query(func.count(User.id)).filter(
                User.role == "student",
                User.branch_id == branch.id,
                 User.institution_id == inst_id
            ).scalar() or 0
            
            branch_summary.append(BranchSummary(
                id=branch.id,
                name=branch.name,
                phone_number=branch.phone_number,
                student_count=student_count,
                is_active=branch.is_active
            ))
        
        return StaffDashboardResponse(
            stats=stats,
            recent_registrations=recent_registrations,
            branch_summary=branch_summary,
            institution=institution_data
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard Error: {str(e)}")


# ============================================
# PROFILE ENDPOINTS
# ============================================

@router.get("/profile", response_model=StaffProfileResponse)
def get_staff_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current staff member's profile
    """
    verify_staff(current_user)
    
    staff = db.query(User).filter(User.id == current_user.id).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Staff-specific stats - SCOPED TO INSTITUTION
    inst_id = current_user.institution_id
    total_users_managed = db.query(func.count(User.id)).filter(User.institution_id == inst_id).scalar() or 0
    total_branches = db.query(func.count(Branch.id)).filter(Branch.institution_id == inst_id).scalar() or 0
    
    return StaffProfileResponse(
        id=staff.id,
        first_name=staff.first_name,
        last_name=staff.last_name,
        email=staff.email,
        phone=staff.phone_number,
        address=getattr(staff, 'address', None),
        avatar=getattr(staff, 'avatar', None),
        employee_id=getattr(staff, 'employee_id', None),
        join_date=staff.created_at,
        status=getattr(staff, 'status', 'active'),
        branch=getattr(staff, 'branch_name', None),
        stats={
            "total_users_managed": total_users_managed,
            "total_branches": total_branches
        }
    )


@router.put("/profile")
def update_staff_profile(
    profile_data: StaffProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current staff member's profile
    """
    verify_staff(current_user)
    
    staff = db.query(User).filter(User.id == current_user.id).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Update fields
    staff.first_name = profile_data.first_name
    staff.last_name = profile_data.last_name
    staff.email = profile_data.email
    staff.phone_number = profile_data.phone
    
    # Update optional fields
    if hasattr(staff, 'address'):
        staff.address = profile_data.address
    
    try:
        db.commit()
        db.refresh(staff)
        
        return {
            "message": "Profile updated successfully",
            "staff": {
                "id": staff.id,
                "first_name": staff.first_name,
                "last_name": staff.last_name,
                "email": staff.email,
                "phone": staff.phone_number
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/change-password")
def change_staff_password(
    password_data: StaffPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change staff member's password
    """
    verify_staff(current_user)
    
    staff = db.query(User).filter(User.id == current_user.id).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, staff.password_hash):
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
    staff.password_hash = hash_password(password_data.new_password)
    
    try:
        db.commit()
        return {"message": "Password changed successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change password: {str(e)}"
        )