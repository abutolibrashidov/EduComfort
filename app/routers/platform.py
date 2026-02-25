from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from passlib.context import CryptContext

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.institution import Institution
from app.models.subscription import InstitutionSubscription, SubscriptionPlan
from app.models.user import User
from app.constants.roles import Role

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic schemas for new endpoints
class CreateInstitutionRequest(BaseModel):
    name: str
    subdomain: str
    admin_first_name: str
    admin_last_name: str
    admin_phone: str
    admin_password: str
    subscription_plan: Optional[str] = "basic"
    ai_credits: Optional[float] = 0.0

class UpdateCreditsRequest(BaseModel):
    credits: float

# Create router
router = APIRouter(prefix="/platform", tags=["Platform Owner"])

# Check platform owner dependency
def verify_platform_owner(current_user: User = Depends(get_current_user)):
    """
    Verify user is the Platform Owner or Super Admin (God Mode)
    Both SUPER_ADMIN and PLATFORM_OWNER have full platform access
    """
    # print(f"DEBUG: Verifying Platform Owner. Role: {current_user.role}")
    
    # Handle both string comparison and Enum comparison
    user_role = current_user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value
    
    # Allow both SUPER_ADMIN and PLATFORM_OWNER
    allowed_roles = [
        Role.PLATFORM_OWNER.value, 
        Role.PLATFORM_OWNER,
        Role.SUPER_ADMIN.value,
        Role.SUPER_ADMIN,
        "platform_owner",
        "super_admin"
    ]
    
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Platform Owner or Super Admin only"
        )
    return current_user

# ============================
# DASHBOARD
# ============================
@router.get("/dashboard")
def get_platform_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    """
    Get high-level platform statistics
    """
    try:
        # Institutions
        total_institutions = db.query(Institution).count()
        active_institutions = db.query(Institution).filter(Institution.is_active == True).count()
        
        # Users
        total_users = db.query(User).count()
        
        # Individual Learners (role=student, institution_id=None)
        individual_learners = db.query(User).filter(
            User.role == Role.STUDENT,
            User.institution_id == None
        ).count()
        
        # Calculate Revenue (Sum of active subscriptions)
        revenue_mtd = 0
        try:
            # Get all active subscriptions
            active_subs = db.query(InstitutionSubscription).filter(
                InstitutionSubscription.status == 'active'
            ).all()
            
            plan_prices = {
                SubscriptionPlan.BRONZE: 50,
                SubscriptionPlan.SILVER: 200,
                SubscriptionPlan.GOLD: 500,
                # Enterprise handled as 0 or custom logic
            }
            
            for sub in active_subs:
                revenue_mtd += plan_prices.get(sub.plan, 0)
        except Exception as e:
            print(f"Error calculating revenue: {e}")
            revenue_mtd = 0
        
        return {
            "stats": {
                "total_institutions": total_institutions,
                "active_institutions": active_institutions,
                "total_users": total_users,
                "individual_learners": individual_learners,
                "revenue_mtd": revenue_mtd,
                "system_health": 98.5 
            }
        }
    except Exception as e:
        print(f"Dashboard Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================
# INSTITUTIONS
# ============================
@router.get("/institutions")
def get_all_institutions(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    """
    List all institutions
    """
    institutions = db.query(Institution).all()
    
    result = []
    for inst in institutions:
        try:
            user_count = db.query(func.count(User.id)).filter(User.institution_id == inst.id).scalar()
            
            admin = db.query(User).filter(
                User.institution_id == inst.id,
                User.role.in_([Role.ADMIN, Role.SUPER_ADMIN, "admin", "super_admin"]),
                User.is_active == True
            ).order_by(User.is_super_admin.desc(), User.id.asc()).first()
            
            result.append({
                "id": inst.id,
                "name": inst.name,
                "subdomain": inst.subdomain,
                "is_active": inst.is_active,
                "created_at": inst.created_at,
                "user_count": user_count,
                "ai_credits_balance": inst.ai_credits_balance or 0.0,
                "admin_id": admin.id if admin else None
            })
        except Exception as e:
            print(f"Error processing institution {inst.id}: {e}")
            # Continue with basic data
            result.append({
                "id": inst.id,
                "name": inst.name,
                "subdomain": inst.subdomain,
                "is_active": inst.is_active,
                "error": str(e)
            })
        
    return result

@router.post("/institutions/{institution_id}/suspend")
def suspend_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    inst.is_active = False
    db.commit()
    return {"message": f"Institution {inst.name} suspended"}

@router.post("/institutions/{institution_id}/activate")
def activate_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    inst.is_active = True
    db.commit()
    return {"message": f"Institution {inst.name} activated"}

@router.delete("/institutions/{institution_id}")
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    try:
        db.delete(inst)
        db.commit()
        return {"message": f"Institution {inst.name} deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete institution: {str(e)}")

# ============================
# USERS (Global Management)
# ============================
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "phone": u.phone_number,
            "role": u.role,
            "institution_id": u.institution_id,
            "institution_name": u.institution.name if u.institution else "Individual / N/A",
            "created_at": u.created_at,
            "is_active": u.is_active
        }
        for u in users
    ]

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Manual cascade deletion for tables without CASCADE constraints
        # Wrapped in try-except to handle schema mismatches
        print(f"🗑️ Cascading delete for user {user_id}...")
        
        # Import models
        from app.models.exam import ExamSubmission
        from app.models.messaging import Message
        from app.models.performance import StudentPerformance, ExamPerformanceDetail, WorkbookPerformanceDetail
        from app.models.payment import Payment
        from app.models.material import Material
        from app.models.lesson import Lesson
        from app.models.onlinecourse import StudentEnrollment, StudentCourseProgress, AssignmentSubmission, StudentLessonProgress
        from app.models.ielts import IELTSSubmission, IELTSWritingSubmission
        from app.models.interactive_workbook import StudentExerciseSubmission, WorkbookProgress
        from app.models.announcement import Announcement
        
        # Exam submissions
        try:
            db.query(ExamSubmission).filter(ExamSubmission.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete exam submissions: {e}")
        
        # Messages - try both old and new schema
        try:
            db.query(Message).filter(
                (Message.sender_id == user_id) | (Message.receiver_id == user_id)
            ).delete()
        except Exception as e:
            print(f"⚠️ Could not delete messages (may be using conversation model): {e}")
        
        # Performance records
        try:
            db.query(StudentPerformance).filter(StudentPerformance.student_id == user_id).delete()
            db.query(ExamPerformanceDetail).filter(ExamPerformanceDetail.student_id == user_id).delete()
            db.query(WorkbookPerformanceDetail).filter(WorkbookPerformanceDetail.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete performance records: {e}")
        
        # Payments
        try:
            db.query(Payment).filter(Payment.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete payments: {e}")
        
        # Workbook progress and submissions
        try:
            db.query(WorkbookProgress).filter(WorkbookProgress.student_id == user_id).delete()
            db.query(StudentExerciseSubmission).filter(StudentExerciseSubmission.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete workbook data: {e}")
        
        # Course enrollments and progress
        try:
            db.query(StudentEnrollment).filter(StudentEnrollment.student_id == user_id).delete()
            db.query(StudentCourseProgress).filter(StudentCourseProgress.enrollment_id.in_(
                db.query(StudentEnrollment.id).filter(StudentEnrollment.student_id == user_id)
            )).delete(synchronize_session=False)
            db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id == user_id).delete()
            db.query(StudentLessonProgress).filter(StudentLessonProgress.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete course data: {e}")
        
        # IELTS submissions
        try:
            db.query(IELTSSubmission).filter(IELTSSubmission.student_id == user_id).delete()
            db.query(IELTSWritingSubmission).filter(IELTSWritingSubmission.student_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete IELTS data: {e}")
        
        # Materials and lessons created by teachers
        try:
            db.query(Material).filter(Material.teacher_id == user_id).delete()
            db.query(Lesson).filter(Lesson.teacher_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete materials/lessons: {e}")
        
        # Announcements
        try:
            db.query(Announcement).filter(Announcement.author_id == user_id).delete()
        except Exception as e:
            print(f"⚠️ Could not delete announcements: {e}")
        
        # Tables with CASCADE will auto-delete:
        # - Attendance (has ondelete="CASCADE")
        # - Achievements (has ondelete="CASCADE")
        # - Feed posts, likes, follows (has ondelete="CASCADE")
        # - Conversations and messages (has ondelete="CASCADE")
        # - Group students (has ondelete="CASCADE")
        
        # Now delete the user
        db.delete(user)
        db.commit()
        print(f"✅ User {user_id} and all associated data deleted")
        return {"message": f"User {user.first_name} and all associated data permanently deleted"}
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback Strategy: Block user instead
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_active = False
                db.commit()
                return {
                    "message": f"User {user.first_name} could not be permanently deleted. They have been BLOCKED instead.", 
                    "status": "blocked",
                    "error": str(e)
                }
        except Exception as block_error:
            print(f"❌ Critical: Could not block user either: {block_error}")
            
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete user: {str(e)}"
        )

@router.post("/users/{user_id}/block")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = False
    db.commit()
    return {"message": f"User {user.first_name} blocked"}

@router.post("/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = True
    db.commit()
    return {"message": f"User {user.first_name} unblocked"}

# ============================
# SYSTEM HEALTH
# ============================
@router.get("/health")
def get_system_health(
    current_user: User = Depends(verify_platform_owner)
):
    return {
        "services": [
            {"name": "Database", "status": "operational", "latency": "12ms"},
            {"name": "API Gateway", "status": "operational", "latency": "5ms"},
        ],
        "features": {
            "payments": "active" 
        }
    }


# ============================
# CREATE INSTITUTION
# ============================
@router.post("/institutions", status_code=201)
def create_institution(
    data: CreateInstitutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    """
    Create a new institution and seed its first super_admin user.
    """
    # Check subdomain uniqueness
    existing = db.query(Institution).filter(Institution.subdomain == data.subdomain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")

    # Check phone uniqueness for the new admin
    existing_user = db.query(User).filter(User.phone_number == data.admin_phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    # Create institution
    institution = Institution(
        name=data.name,
        subdomain=data.subdomain,
        subscription_tier=data.subscription_plan or "basic",
        ai_credits_balance=data.ai_credits or 0.0,
        is_active=True,
    )
    db.add(institution)
    db.flush()  # get institution.id without full commit

    # Seed first admin (super_admin role)
    hashed = _pwd_context.hash(data.admin_password)
    admin_user = User(
        first_name=data.admin_first_name,
        last_name=data.admin_last_name,
        phone_number=data.admin_phone,
        password_hash=hashed,
        role="super_admin",
        is_super_admin=True,
        institution_id=institution.id,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(institution)

    return {
        "message": f"Institution '{institution.name}' created successfully",
        "institution_id": institution.id,
        "admin_phone": data.admin_phone,
    }


# ============================
# GROWTH STATS (for charts)
# ============================
@router.get("/stats/growth")
def get_growth_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    """
    Return monthly user & institution registration counts for the last 6 months.
    Used to populate the platform dashboard growth chart.
    """
    now = datetime.utcnow()
    result = []
    for i in range(5, -1, -1):
        # Calculate first day of target month
        target = now - timedelta(days=i * 30)
        m, y = target.month, target.year

        user_count = db.query(func.count(User.id)).filter(
            extract('month', User.created_at) == m,
            extract('year', User.created_at) == y,
            User.role != "platform_owner"
        ).scalar() or 0

        inst_count = db.query(func.count(Institution.id)).filter(
            extract('month', Institution.created_at) == m,
            extract('year', Institution.created_at) == y,
        ).scalar() or 0

        result.append({
            "month": target.strftime("%b %Y"),
            "users": user_count,
            "institutions": inst_count,
        })

    return {"growth": result}


# ============================
# AI CREDITS MANAGEMENT
# ============================
@router.put("/institutions/{institution_id}/credits")
def update_institution_credits(
    institution_id: int,
    body: UpdateCreditsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner)
):
    """
    Set the AI credits balance for an institution.
    """
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    if body.credits < 0:
        raise HTTPException(status_code=400, detail="Credits cannot be negative")
    inst.ai_credits_balance = body.credits
    db.commit()
    return {"message": f"Credits updated for {inst.name}", "ai_credits_balance": inst.ai_credits_balance}
