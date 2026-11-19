from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from passlib.context import CryptContext

from app.core.dependencies import get_db
from app.core.models.user import User
from app.core.schemas.user import UserCreate, UserRead, UserUpdate
from app.auth.dependencies import get_current_user
from app.constants.roles import Role
from app.security.permissions import (
    require_super_admin, require_platform_owner, can_view_user,
    is_platform_owner, is_super_admin, is_admin_or_higher, is_student,
)
from app.engagement.models.rating import TeacherRating
from datetime import datetime
from pydantic import BaseModel
from app.shared.services.user_service import robust_cascade_delete_user

class TeacherRatingCreate(BaseModel):
    teacher_id: int
    rating: int  # 1-5
    comment: Optional[str] = None

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(tags=["Users"])

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def _role_str(user: User) -> str:
    """Safely extract role string whether it's an Enum or a plain string."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


# Who may assign which role. Roles not listed here can be assigned by any user manager.
_PLATFORM_ROLES = {Role.PLATFORM_OWNER.value, Role.PLATFORM_ADMIN.value}
_OWNER_ROLES = {Role.SUPER_ADMIN.value, Role.SCHOOL_OWNER.value}
_ADMIN_ROLES = {
    Role.ADMIN.value, Role.INSTITUTION_ADMIN.value,
    Role.SCHOOL_PRINCIPAL.value, Role.SCHOOL_REGISTRAR.value,
}


def _require_user_manager(current_user: User) -> None:
    """Admins, institution owners, staff and the platform owner manage users."""
    if is_platform_owner(current_user) or is_admin_or_higher(current_user):
        return
    if _role_str(current_user) == Role.STAFF.value:
        return
    raise HTTPException(status_code=403, detail="Access denied")


def _require_can_assign_role(current_user: User, role) -> None:
    role = getattr(role, "value", role)
    if is_platform_owner(current_user):
        return
    if role in _PLATFORM_ROLES:
        raise HTTPException(status_code=403, detail="Cannot assign platform roles")
    if role in _OWNER_ROLES and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only the institution owner can assign this role")
    if role in _ADMIN_ROLES and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Only admins can assign this role")


def _require_can_manage(current_user: User, target: User) -> None:
    """Tenant isolation plus protection of higher-privileged accounts."""
    if is_platform_owner(current_user):
        return
    if current_user.institution_id is None or current_user.institution_id != target.institution_id:
        raise HTTPException(status_code=403, detail="Access denied: user belongs to a different institution")
    if is_platform_owner(target) or target.is_platform_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if (target.is_super_admin or _role_str(target) in _OWNER_ROLES) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only the institution owner can modify this account")
    if _role_str(target) in _ADMIN_ROLES and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Only admins can modify this account")


# ============================================
# ✅ FIX: /super-admins/list MUST come before /{user_id} routes.
# If placed after, FastAPI tries to match "super-admins" as an integer
# user_id and returns 422 Unprocessable Entity.
# ============================================

@router.get("/super-admins/list")
def list_super_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all super admins in the system"""
    require_platform_owner(current_user)
    super_admins = db.query(User).filter(User.role == "super_admin").all()

    return {
        "total": len(super_admins),
        "super_admins": [
            {
                "id": sa.id,
                "name": f"{sa.first_name} {sa.last_name}",
                "email": sa.email,
                "phone": sa.phone_number,
                "is_active": sa.is_active,
                "created_at": sa.created_at
            }
            for sa in super_admins
        ]
    }


@router.get("/", response_model=List[UserRead], include_in_schema=True)
@router.get("", response_model=List[UserRead], include_in_schema=False)
def get_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    limit: Optional[int] = Query(None, description="Limit results"),
    skip: int = Query(0, description="Skip results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users with optional filters"""
    if is_student(current_user) or _role_str(current_user) == Role.PARENT.value:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ FIX: Always exclude soft-deleted users from listings
    query = db.query(User).filter(User.is_active)

    # Multitenancy Scope: Isolate users by Institution
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            query = query.filter(User.institution_id == current_user.institution_id)
        else:
            query = query.filter(User.id == current_user.id)

        # ✅ FIX: Hide Platform Owner from regular lists
        # Must check both Enum and string forms to avoid silent mismatch
        query = query.filter(
            User.role != Role.PLATFORM_OWNER.value,
            User.role != Role.PLATFORM_OWNER,
        )

    if role:
        try:
            role_enum = Role(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_filter),
                User.last_name.ilike(search_filter),
                User.phone_number.ilike(search_filter),
                User.email.ilike(search_filter)
            )
        )

    if skip:
        query = query.offset(skip)
    if limit:
        query = query.limit(limit)

    return query.all()


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id, User.is_active).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not can_view_user(current_user, user):
        raise HTTPException(status_code=403, detail="Access denied: user belongs to a different institution")
    return user


@router.post("/", response_model=UserRead)
@router.post("", response_model=UserRead, include_in_schema=False)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user"""
    _require_user_manager(current_user)
    _require_can_assign_role(current_user, user_data.role)
    if not is_platform_owner(current_user) and not current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ FIX: Only check ACTIVE users for phone uniqueness.
    # Without this, soft-deleted users block their phone number forever.
    existing_user = db.query(User).filter(
        User.phone_number == user_data.phone_number,
        User.is_active,
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    if user_data.email:
        # ✅ FIX: Same — only active users for email uniqueness
        existing_email = db.query(User).filter(
            User.email == user_data.email,
            User.is_active,
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user_data.password)

    # ✅ FIX: Pydantic v2 compat — model_dump() replaces dict()
    user_dict = (
        user_data.model_dump(exclude={"password"})
        if hasattr(user_data, "model_dump")
        else user_data.dict(exclude={"password"})
    )

    # Auto-assign institution_id if not a platform admin
    if not current_user.is_platform_admin and current_user.institution_id:
        user_dict["institution_id"] = current_user.institution_id

    db_user = User(**user_dict, password_hash=hashed_password)

    db.add(db_user)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        err = str(e.orig)
        if "phone_number" in err or "phone" in err.lower():
            raise HTTPException(status_code=400, detail="Phone number already registered")
        if "email" in err:
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="User with this data already exists")
    db.refresh(db_user)

    return db_user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a user"""

    user = db.query(User).filter(User.id == user_id, User.is_active).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ✅ FIX: Pydantic v2 compat
    update_data = (
        user_data.model_dump(exclude_unset=True)
        if hasattr(user_data, "model_dump")
        else user_data.dict(exclude_unset=True)
    )

    # Users may edit their own basic profile; anything else needs a user manager
    is_self_profile_edit = (
        user.id == current_user.id
        and "role" not in update_data
        and "is_active" not in update_data
        and "branch_id" not in update_data
    )
    if not is_self_profile_edit:
        _require_user_manager(current_user)
        _require_can_manage(current_user, user)
        if update_data.get("role") is not None:
            _require_can_assign_role(current_user, update_data["role"])

    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")

    if "phone_number" in update_data:
        existing = db.query(User).filter(
            User.phone_number == update_data["phone_number"],
            User.id != user_id,
            User.is_active,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already in use")

    if "email" in update_data and update_data["email"]:
        existing = db.query(User).filter(
            User.email == update_data["email"],
            User.id != user_id,
            User.is_active,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user — soft-delete immediately, hard cascade in background"""

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()

    # ✅ FIX: Idempotent — if already soft-deleted, return success instead of 404
    # (React StrictMode fires DELETE twice; second call must not error)
    if not user or not user.is_active:
        return {"message": "User deleted successfully", "id": user_id, "status": "already_deleted"}

    _require_user_manager(current_user)
    _require_can_manage(current_user, user)

    if user.is_super_admin:
        raise HTTPException(status_code=400, detail="Cannot delete super admin")


    # ✅ FIX: Two-phase delete pattern — same as platform.py
    # Phase 1 (sync, <100ms): soft-delete so UI removes the row immediately.
    # Also mangle unique fields (phone, email) so the DB UNIQUE constraint is
    # freed immediately — same pattern used for institution subdomain.
    user.is_active = False
    user.phone_number = f"{user.phone_number}__deleted_{user_id}"
    if user.email:
        user.email = f"{user.email}__deleted_{user_id}"
    db.commit()

    # Phase 2 (async, after response): cascade hard-delete runs in background
    # No client timeout pressure; server keeps running even if client disconnects
    def _hard_delete():
        from app.core.dependencies import SessionLocal
        bg_db = SessionLocal()
        try:
            robust_cascade_delete_user(bg_db, bg_db.query(User).filter(User.id == user_id).first())
        except Exception as e:
            bg_db.rollback()
            print(f"[background] hard-delete user {user_id} failed: {e}")
        finally:
            bg_db.close()

    background_tasks.add_task(_hard_delete)

    return {"message": "User deleted successfully", "id": user_id}


@router.post("/{user_id}/toggle-status", response_model=UserRead)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle user active status"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    _require_user_manager(current_user)
    _require_can_manage(current_user, user)

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return user


@router.post("/{user_id}/view")
def view_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Increment profile view count for a user (public endpoint)."""
    user = db.query(User).filter(User.id == user_id, User.is_active).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.profile_views += 1
    db.commit()

    return {"views": user.profile_views}


# ============================================
# RATING ENDPOINTS
# ============================================

@router.post("/rate-teacher")
def rate_teacher(
    rating_data: TeacherRatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a teacher. Can be used by any authenticated user."""
    teacher = db.query(User).filter(
        User.id == rating_data.teacher_id,
        User.role.in_(["teacher", "admin", "super_admin"]),
        User.is_active,
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    existing = db.query(TeacherRating).filter(
        TeacherRating.rater_id == current_user.id,
        TeacherRating.teacher_id == rating_data.teacher_id
    ).first()

    if existing:
        existing.rating = rating_data.rating
        existing.comment = rating_data.comment
        existing.created_at = datetime.now()
        msg = "Rating updated"
    else:
        new_rating = TeacherRating(
            rater_id=current_user.id,
            teacher_id=rating_data.teacher_id,
            rating=rating_data.rating,
            comment=rating_data.comment
        )
        db.add(new_rating)
        msg = "Rating submitted"

    try:
        db.commit()
        return {"message": msg}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not save rating")


# ============================================
# SUPER ADMIN MANAGEMENT ENDPOINTS
# ============================================

@router.put("/{user_id}/promote-to-super-admin")
def promote_to_super_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Promote a user to super_admin role. Only existing super_admin can use this."""
    require_super_admin(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _require_can_manage(current_user, user)

    role = _role_str(user)
    if role == "super_admin":
        raise HTTPException(status_code=400, detail=f"{user.first_name} is already a super admin")

    user.role = "super_admin"
    db.commit()
    db.refresh(user)

    return {
        "message": f"User {user.first_name} {user.last_name} promoted to super admin",
        "user_id": user.id,
        "new_role": "super_admin"
    }


@router.put("/{user_id}/demote-from-super-admin")
def demote_from_super_admin(
    user_id: int,
    new_role: str = Query("admin", description="New role after demotion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Demote a super_admin to a regular role. Only existing super_admin can use this."""
    require_super_admin(current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _require_can_manage(current_user, user)

    role = _role_str(user)
    if role != "super_admin":
        raise HTTPException(status_code=400, detail=f"{user.first_name} is not a super admin")

    valid_roles = ["admin", "teacher", "student", "staff"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    old_role = user.role
    user.role = new_role
    db.commit()
    db.refresh(user)

    return {
        "message": f"User {user.first_name} {user.last_name} demoted from {old_role} to {new_role}",
        "user_id": user.id,
        "old_role": old_role,
        "new_role": new_role
    }