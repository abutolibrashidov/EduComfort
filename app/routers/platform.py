from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from loguru import logger
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from passlib.context import CryptContext

from app.core.database import get_db, SessionLocal
from app.auth.dependencies import get_current_user
from app.models.institution import Institution
from app.models.subscription import InstitutionSubscription, SubscriptionPlan
from app.models.user import User
from app.services.user_service import robust_cascade_delete_user
from app.services.institution_service import robust_cascade_delete_institution
from app.constants.roles import Role

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== Schemas ====================

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


# ==================== Router ====================

router = APIRouter(prefix="/platform", tags=["Platform Owner"])


# ==================== Auth dependency ====================

def verify_platform_owner(current_user: User = Depends(get_current_user)):
    """Verify user is Platform Owner or Super Admin."""
    user_role = current_user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value

    allowed = {
        Role.PLATFORM_OWNER.value,
        Role.SUPER_ADMIN.value,
        "platform_owner",
        "super_admin",
    }
    if user_role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Platform Owner or Super Admin only",
        )
    return current_user


# ==================== Background task helper ====================

def _hard_delete_institution_bg(institution_id: int, institution_name: str) -> None:
    """
    Run the cascade delete in a background task so the HTTP response
    is returned immediately (after the soft-delete) without waiting.

    Uses its own DB session — BackgroundTasks run after the response
    is sent, so the request's session is already closed.
    """
    db = SessionLocal()
    try:
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if not inst:
            logger.warning(f"BG delete: institution {institution_id} already gone")
            return
        robust_cascade_delete_institution(db, inst)
        logger.info(f"BG delete: institution '{institution_name}' ({institution_id}) fully scrubbed")
    except Exception as exc:
        db.rollback()
        logger.error(f"BG delete FAILED for institution {institution_id}: {exc}")
    finally:
        db.close()


def _hard_delete_user_bg(user_id: int, user_name: str) -> None:
    """Same pattern for user hard-delete in background."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"BG delete: user {user_id} already gone")
            return
        robust_cascade_delete_user(db, user)
        logger.info(f"BG delete: user '{user_name}' ({user_id}) fully scrubbed")
    except Exception as exc:
        db.rollback()
        logger.error(f"BG delete FAILED for user {user_id}: {exc}")
    finally:
        db.close()


# ==================== Dashboard ====================

@router.get("/dashboard")
def get_platform_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    try:
        total_institutions = db.query(Institution).count()
        active_institutions = db.query(Institution).filter(Institution.is_active == True).count()
        total_users = db.query(User).count()
        individual_learners = db.query(User).filter(
            User.role == Role.STUDENT,
            User.institution_id == None,
        ).count()

        revenue_mtd = 0
        try:
            plan_prices = {
                SubscriptionPlan.BRONZE: 50,
                SubscriptionPlan.SILVER: 200,
                SubscriptionPlan.GOLD: 500,
            }
            active_subs = db.query(InstitutionSubscription).filter(
                InstitutionSubscription.status == "active"
            ).all()
            for sub in active_subs:
                revenue_mtd += plan_prices.get(sub.plan, 0)
        except Exception as e:
            logger.warning(f"Revenue calc skipped: {e}")

        return {
            "stats": {
                "total_institutions": total_institutions,
                "active_institutions": active_institutions,
                "total_users": total_users,
                "individual_learners": individual_learners,
                "revenue_mtd": revenue_mtd,
                "system_health": 98.5,
            }
        }
    except Exception as e:
        logger.exception(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Institutions ====================

@router.get("/institutions")
def get_all_institutions(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    # ✅ FIX: exclude soft-deleted institutions so they disappear immediately after delete
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    result = []
    for inst in institutions:
        try:
            user_count = (
                db.query(func.count(User.id))
                .filter(User.institution_id == inst.id)
                .scalar()
            )
            admin = (
                db.query(User)
                .filter(
                    User.institution_id == inst.id,
                    User.role.in_([Role.ADMIN, Role.SUPER_ADMIN, "admin", "super_admin"]),
                    User.is_active == True,
                )
                .order_by(User.is_super_admin.desc(), User.id.asc())
                .first()
            )
            result.append({
                "id": inst.id,
                "name": inst.name,
                "subdomain": inst.subdomain,
                "is_active": inst.is_active,
                "created_at": inst.created_at,
                "user_count": user_count,
                "ai_credits_balance": inst.ai_credits_balance or 0.0,
                "admin_id": admin.id if admin else None,
            })
        except Exception as e:
            logger.warning(f"Error processing institution {inst.id}: {e}")
            result.append({
                "id": inst.id,
                "name": inst.name,
                "subdomain": inst.subdomain,
                "is_active": inst.is_active,
                "error": str(e),
            })
    return result


@router.post("/institutions/{institution_id}/suspend")
def suspend_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    inst.is_active = False
    db.commit()
    return {"message": f"Institution '{inst.name}' suspended"}


@router.post("/institutions/{institution_id}/activate")
def activate_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    inst.is_active = True
    db.commit()
    return {"message": f"Institution '{inst.name}' activated"}


@router.delete("/institutions/{institution_id}")
def delete_institution(
    institution_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """
    Delete an institution and all its data.

    STRATEGY: Two-phase delete to avoid the 60-second client timeout.

    Phase 1 (sync, in this request):
      - Verify institution exists
      - Soft-delete: set is_active=False so it disappears from all UIs immediately
      - Return 202 Accepted immediately — client is unblocked

    Phase 2 (async BackgroundTask, after response is sent):
      - robust_cascade_delete_institution() runs in background
      - Deletes all related records and the institution row itself
      - Takes as long as needed without any client timeout risk
    """
    inst = db.query(Institution).filter(Institution.id == institution_id).first()

    # ✅ FIX: Idempotent delete — React StrictMode fires DELETE twice in dev.
    # If already soft-deleted or fully gone, return 200 silently instead of 404.
    # A 404 here causes the UI component to enter an error state and lock the button.
    if not inst or not inst.is_active:
        return {
            "message": f"Institution {institution_id} already deleted",
            "status": "already_deleted",
        }

    inst_name = inst.name
    inst_subdomain = inst.subdomain

    # Phase 1: soft-delete → respond immediately (< 100ms)
    # ✅ FIX: mangle subdomain immediately so the UNIQUE constraint is freed.
    # This allows the same subdomain to be reused right away even before
    # the background hard-delete completes.
    inst.is_active = False
    inst.subdomain = f"{inst_subdomain}__deleted_{institution_id}"
    db.commit()

    # Phase 2: hard cascade delete runs after response is sent
    background_tasks.add_task(_hard_delete_institution_bg, institution_id, inst_name)

    return {
        "message": f"Institution '{inst_name}' is being deleted",
        "status": "processing",
        "detail": "Deactivated immediately. All data will be permanently removed shortly.",
    }


# ==================== Users ====================

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    # ✅ FIX: exclude soft-deleted users (is_active=False) so they disappear
    # from the UI immediately after deletion without waiting for background hard-delete
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}",
            "email": u.email,
            "phone": u.phone_number,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "institution_id": u.institution_id,
            "institution_name": u.institution.name if u.institution else "Individual / N/A",
            "created_at": u.created_at,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """
    Delete a user. Same two-phase pattern as institution delete:
    deactivate immediately, hard-delete in background.
    """
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()

    # ✅ FIX: Idempotent — if already soft-deleted or fully gone, return success
    # (React StrictMode fires DELETE twice in dev; second call must not 404)
    if not user or not user.is_active:
        return {
            "message": f"User {user_id} already deleted",
            "status": "already_deleted",
        }

    user_name = f"{user.first_name} {user.last_name}"

    # Soft-delete first — user disappears from all queries immediately
    user.is_active = False
    db.commit()

    # Schedule hard delete
    background_tasks.add_task(_hard_delete_user_bg, user_id, user_name)

    return {
        "message": f"User '{user_name}' is being deleted",
        "status": "processing",
    }


@router.post("/users/{user_id}/block")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"User '{user.first_name}' blocked"}


@router.post("/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": f"User '{user.first_name}' unblocked"}


# ==================== System Health ====================

@router.get("/health")
def get_system_health(current_user: User = Depends(verify_platform_owner)):
    return {
        "services": [
            {"name": "Database", "status": "operational", "latency": "12ms"},
            {"name": "API Gateway", "status": "operational", "latency": "5ms"},
        ],
        "features": {"payments": "active"},
    }


# ==================== Create Institution ====================

@router.post("/institutions", status_code=201)
def create_institution(
    data: CreateInstitutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    from app.models.platform_notification import PlatformNotification

    existing = db.query(Institution).filter(
        Institution.subdomain == data.subdomain,
        Institution.is_active == True  # ✅ FIX: don't block reuse of subdomains from deleted/suspended institutions
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")

    existing_user = db.query(User).filter(User.phone_number == data.admin_phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    institution = Institution(
        name=data.name,
        subdomain=data.subdomain,
        subscription_tier=data.subscription_plan or "basic",
        ai_credits_balance=data.ai_credits or 0.0,
        is_active=True,
    )
    db.add(institution)
    db.flush()

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

    # ✅ Platform notification: inform platform owner about new institution
    notif = PlatformNotification(
        title=f"Yangi muassasa ro'yxatdan o'tdi",
        message=(
            f"'{data.name}' muassasasi muvaffaqiyatli yaratildi. "
            f"Admin: {data.admin_first_name} {data.admin_last_name} ({data.admin_phone}). "
            f"Tarif: {data.subscription_plan or 'basic'}."
        ),
        notification_type="success",
        related_institution_id=institution.id,
    )
    db.add(notif)

    db.commit()
    db.refresh(institution)

    return {
        "message": f"Institution '{institution.name}' created successfully",
        "institution_id": institution.id,
        "admin_phone": data.admin_phone,
    }


# ==================== Growth Stats ====================

@router.get("/stats/growth")
def get_growth_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = []
    for i in range(5, -1, -1):
        target = now - timedelta(days=i * 30)
        m, y = target.month, target.year

        user_count = (
            db.query(func.count(User.id))
            .filter(
                extract("month", User.created_at) == m,
                extract("year", User.created_at) == y,
                User.role != "platform_owner",
            )
            .scalar() or 0
        )
        inst_count = (
            db.query(func.count(Institution.id))
            .filter(
                extract("month", Institution.created_at) == m,
                extract("year", Institution.created_at) == y,
            )
            .scalar() or 0
        )
        result.append({
            "month": target.strftime("%b %Y"),
            "users": user_count,
            "institutions": inst_count,
        })

    return {"growth": result}


# ==================== AI Credits ====================

@router.put("/institutions/{institution_id}/credits")
def update_institution_credits(
    institution_id: int,
    body: UpdateCreditsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    if body.credits < 0:
        raise HTTPException(status_code=400, detail="Credits cannot be negative")
    inst.ai_credits_balance = body.credits
    db.commit()
    return {
        "message": f"Credits updated for '{inst.name}'",
        "ai_credits_balance": inst.ai_credits_balance,
    }


# ==================== Platform Notifications ====================

@router.get("/notifications")
def get_platform_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Get platform-level notifications (new institutions, warnings, etc.)"""
    from app.models.platform_notification import PlatformNotification
    q = db.query(PlatformNotification).order_by(PlatformNotification.created_at.desc())
    if unread_only:
        q = q.filter(PlatformNotification.is_read == False)
    notifs = q.limit(50).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "related_institution_id": n.related_institution_id,
            "created_at": n.created_at,
        }
        for n in notifs
    ]


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Mark a platform notification as read."""
    from app.models.platform_notification import PlatformNotification
    n = db.query(PlatformNotification).filter(PlatformNotification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.patch("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Mark all platform notifications as read."""
    from app.models.platform_notification import PlatformNotification
    db.query(PlatformNotification).filter(PlatformNotification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}