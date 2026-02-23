from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from passlib.context import CryptContext

from app.core.dependencies import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserListItem
from app.auth.dependencies import get_current_user
from app.constants.roles import Role
from app.security.permissions import require_super_admin, check_institution_access
from app.models.rating import TeacherRating
from datetime import datetime
from pydantic import BaseModel

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
    query = db.query(User)
    
    # Multitenancy Scope: Isolate users by Institution
    # Only is_platform_admin (EduComfort staff) can see cross-institution data
    if not current_user.is_platform_admin:
        if current_user.institution_id:
            query = query.filter(User.institution_id == current_user.institution_id)
        else:
            # Individual users only see themselves (or specific public profiles if implemented later)
            query = query.filter(User.id == current_user.id)
            
        # ✅ FIX: Hide Platform Owner from regular lists
        # Filter out platform_owner role using the string value
        query = query.filter(User.role != Role.PLATFORM_OWNER.value)
            
    # If platform admin, they see all, or can filter by institution_id param if added later

    
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserRead)
@router.post("", response_model=UserRead, include_in_schema=False)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user"""
    
    existing_user = db.query(User).filter(User.phone_number == user_data.phone_number).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict(exclude={"password"})
    
    # Auto-assign institution_id if not a platform admin
    if not current_user.is_platform_admin and current_user.institution_id:
        user_dict["institution_id"] = current_user.institution_id

    db_user = User(**user_dict, password_hash=hashed_password)
    
    db.add(db_user)
    db.commit()
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
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.dict(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")
    
    if "phone_number" in update_data:
        existing = db.query(User).filter(
            User.phone_number == update_data["phone_number"],
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already in use")
    
    if "email" in update_data and update_data["email"]:
        existing = db.query(User).filter(
            User.email == update_data["email"],
            User.id != user_id
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a user"""
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=400, detail="Cannot delete super admin")
    
    db.delete(user)
    db.commit()
    
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
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/{user_id}/view")
def view_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Increment profile view count for a user.
    Public endpoint (no auth required for simply viewing, though we might want to prevent spam).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Increment view count
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
    """
    Globally available endpoint to rate a teacher. 
    Can be used by any authenticated user (student, admin, staff, etc).
    """
    # Verify teacher exists and has the role of teacher
    # Sometimes admins are also teachers, so permitting 'admin' is okay if needed.
    teacher = db.query(User).filter(User.id == rating_data.teacher_id, User.role.in_(["teacher", "admin", "super_admin"])).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    # Check if already rated explicitly by this user
    existing = db.query(TeacherRating).filter(
        TeacherRating.rater_id == current_user.id,
        TeacherRating.teacher_id == rating_data.teacher_id
    ).first()
    
    if existing:
        existing.rating = rating_data.rating
        existing.comment = rating_data.comment
        existing.created_at = datetime.now() # Update timestamp
        message = "Rating updated"
    else:
        new_rating = TeacherRating(
            rater_id=current_user.id,
            teacher_id=rating_data.teacher_id,
            rating=rating_data.rating,
            comment=rating_data.comment
        )
        db.add(new_rating)
        message = "Rating submitted"
    
    try:
        db.commit()
        return {"message": message}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# SUPER ADMIN MANAGEMENT ENDPOINTS
# ============================================

@router.put("/{user_id}/promote-to-super-admin")
def promote_to_super_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Promote a user to super_admin role
    Only existing super_admin can use this endpoint
    """
    # Check if current user is super_admin
    require_super_admin(current_user)
    
    # Get the user to promote
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already super_admin
    if user.role == "super_admin":
        raise HTTPException(
            status_code=400, 
            detail=f"{user.first_name} is already a super admin"
        )
    
    # Promote to super_admin
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
    """
    Demote a super_admin to a regular role
    Only existing super_admin can use this endpoint
    """
    # Check if current user is super_admin
    require_super_admin(current_user)
    
    # Prevent demoting yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot demote yourself"
        )
    
    # Get the user to demote
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is super_admin
    if user.role != "super_admin":
        raise HTTPException(
            status_code=400, 
            detail=f"{user.first_name} is not a super admin"
        )
    
    # Validate new role
    valid_roles = ["admin", "teacher", "student", "staff"]
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Demote user
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


@router.get("/super-admins/list")
def list_super_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all super admins in the system
    """
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