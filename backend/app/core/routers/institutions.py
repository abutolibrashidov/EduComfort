"""
Institution Management Router
Handles institution branding, settings, and multi-tenant configuration
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
import os
import shutil
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.models.institution import Institution
from app.core.models.user import User
from app.auth.dependencies import get_current_user
from app.security.permissions import is_admin_or_higher
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/institutions", tags=["Institutions"])

# ==================== Constants ====================

ALLOWED_LOGO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}  # no .svg: it can carry scripts
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


# ==================== Schemas ====================

class InstitutionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    brand_name: Optional[str] = None
    primary_color: str = Field(default="#1890ff", pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field(default="#52c41a", pattern="^#[0-9A-Fa-f]{6}$")
    slogan: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    brand_name: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    slogan: Optional[str] = None


class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    start_date: datetime
    next_billing_date: Optional[datetime] = None
    auto_renew: bool

    class Config:
        from_attributes = True


class InstitutionResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    institution_type: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    brand_name: Optional[str] = None
    primary_color: str
    secondary_color: str
    slogan: Optional[str] = None
    subscription_tier: str
    is_active: bool
    subscription: Optional[SubscriptionResponse] = None

    class Config:
        from_attributes = True


# ✅ Placed BEFORE routes to avoid forward-ref issues with /learners/link
class LinkLearnerRequest(BaseModel):
    email: str = Field(..., description="Email of the individual learner to link")


# ==================== Helpers ====================

def _get_role_str(user: User) -> str:
    """Safely extract role string whether it's a Python Enum or a plain string."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _now_utc() -> datetime:
    """Return current UTC time — compatible with Python 3.12+ (utcnow() is deprecated)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_user_institution(db: Session, user: User) -> Institution:
    """Get the institution for the current user with strict tenant isolation."""
    role = _get_role_str(user)

    if not user.institution_id:
        if getattr(user, "is_platform_admin", False) or role == "platform_owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform staff must specify an institution context",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not associated with any institution",
        )

    institution = (
        db.query(Institution)
        .options(joinedload(Institution.subscription))
        .filter(Institution.id == user.institution_id)
        .first()
    )

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found",
        )

    return institution


def _save_logo(file: UploadFile, institution_id: int) -> str:
    """Save uploaded logo to disk and return its URL path."""
    upload_dir = "uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower()
    timestamp = _now_utc().strftime("%Y%m%d_%H%M%S")
    filename = f"institution_{institution_id}_{timestamp}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"/uploads/logos/{filename}"


def _delete_logo_file(logo_url: str) -> None:
    """Best-effort deletion of an old logo file. Never raises."""
    try:
        local_path = logo_url.lstrip("/")
        if os.path.exists(local_path):
            os.remove(local_path)
    except Exception as exc:
        logger.warning(f"Could not delete old logo at '{logo_url}': {exc}")


# ==================== Routes ====================
#
# ROUTE ORDER IS CRITICAL with FastAPI.
# Literal paths (/current, /current/logo) MUST come before param paths (/{id}).
#
# Order:
#  1. GET  /current
#  2. PUT  /current
#  3. POST /current/logo
#  4. GET  ""  (list)
#  5. POST /learners/link
#  6. GET  /{institution_id}   <- ALWAYS LAST

@router.get("/current", response_model=InstitutionResponse)
def get_current_institution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's institution settings."""
    role = _get_role_str(current_user)

    if role == "platform_owner":
        return {
            "id": 0,
            "name": "Platform Administration",
            "subdomain": "platform",
            "institution_type": "platform",
            "contact_email": current_user.email,
            "contact_phone": None,
            "address": None,
            "description": "Platform Owner Management Interface",
            "brand_name": "EduComfort Platform",
            "logo_url": None,
            "primary_color": "#001529",
            "secondary_color": "#1890ff",
            "subscription_tier": "enterprise",
            "is_active": True,
            "subscription": {
                "plan": "gold",
                "status": "active",
                "start_date": _now_utc(),
                "auto_renew": True,
                "next_billing_date": None,
            },
        }

    return get_user_institution(db, current_user)


@router.put("/current", response_model=InstitutionResponse)
def update_current_institution(
    data: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's institution settings. Requires admin or higher."""
    if not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update institution settings",
        )

    institution = get_user_institution(db, current_user)

    update_data = (
        data.model_dump(exclude_unset=True)
        if hasattr(data, "model_dump")
        else data.dict(exclude_unset=True)
    )

    for field, value in update_data.items():
        setattr(institution, field, value)

    try:
        db.commit()
        db.refresh(institution)
    except Exception as exc:
        db.rollback()
        logger.exception(f"Failed to update institution {institution.id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save institution settings")

    return institution


@router.post("/current/logo", response_model=InstitutionResponse)
async def upload_institution_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a logo for the current institution. Requires admin or higher."""
    if not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can upload institution logos",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_LOGO_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_LOGO_SIZE_BYTES // (1024*1024)} MB",
        )
    await file.seek(0)

    institution = get_user_institution(db, current_user)

    if institution.logo_url:
        _delete_logo_file(institution.logo_url)

    logo_url = _save_logo(file, institution.id)
    institution.logo_url = logo_url

    try:
        db.commit()
        db.refresh(institution)
    except Exception as exc:
        db.rollback()
        _delete_logo_file(logo_url)
        logger.exception(f"Failed to persist logo for institution {institution.id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save logo")

    return institution


@router.get("", response_model=List[InstitutionResponse])
def list_institutions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all institutions. Requires platform_owner only."""
    role = _get_role_str(current_user)

    if role != "platform_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the platform owner can list all institutions",
        )

    return (
        db.query(Institution)
        .filter(Institution.subdomain != "educomfort")
        .order_by(Institution.id)
        .all()
    )


@router.post("/learners/link")
def link_existing_learner(
    data: LinkLearnerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link an existing individual learner to the current institution."""
    role = _get_role_str(current_user)

    if role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can link learners",
        )

    institution = get_user_institution(db, current_user)

    learner = db.query(User).filter(User.email == data.email).first()
    if not learner:
        raise HTTPException(status_code=404, detail="No user found with that email")

    if _get_role_str(learner) != "student":
        raise HTTPException(status_code=400, detail="The specified user is not a student")

    if learner.institution_id is not None:
        if learner.institution_id == institution.id:
            raise HTTPException(status_code=400, detail="User is already in your institution")
        raise HTTPException(status_code=400, detail="User belongs to another institution")

    learner.institution_id = institution.id
    db.commit()

    return {"message": f"Learner '{data.email}' successfully linked to '{institution.name}'"}


# ⚠️ KEEP THIS LAST — int param route must come after all literal path routes
@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution_by_id(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get institution by ID. Requires platform_owner or super_admin."""
    role = _get_role_str(current_user)

    if role not in ["super_admin", "platform_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    if role == "super_admin" and institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admins can only view their own institution",
        )

    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    return institution