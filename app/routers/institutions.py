"""
Institution Management Router
Handles institution branding, settings, and multi-tenant configuration
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.models.institution import Institution
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.security.permissions import is_platform_owner, is_super_admin, is_admin_or_higher
from pydantic import BaseModel, Field

router = APIRouter(prefix="/institutions", tags=["Institutions"])


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


class InstitutionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    brand_name: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


from datetime import datetime

class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    start_date: datetime
    next_billing_date: Optional[datetime]
    auto_renew: bool

    class Config:
        from_attributes = True

class InstitutionResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    description: Optional[str]
    logo_url: Optional[str]
    brand_name: Optional[str]
    primary_color: str
    secondary_color: str
    subscription_tier: str
    is_active: bool
    subscription: Optional[SubscriptionResponse] = None

    class Config:
        from_attributes = True


# ==================== Helper Functions ====================

def get_user_institution(db: Session, user: User) -> Institution:
    """Get the institution for the current user"""
    if not user.institution_id:
        # If user has no institution, get or create default EduComfort institution
        institution = db.query(Institution).filter(
            Institution.subdomain == "educomfort"
        ).first()
        
        if not institution:
            # Create default EduComfort institution
            institution = Institution(
                name="EduComfort",
                subdomain="educomfort",
                brand_name="EduComfort",
                primary_color="#1890ff",
                secondary_color="#52c41a",
                is_active=True,
                subscription_tier="enterprise"
            )
            db.add(institution)
            db.commit()
            db.refresh(institution)
        
        # Associate user with institution
        user.institution_id = institution.id
        db.commit()
    
    institution = db.query(Institution).options(
        joinedload(Institution.subscription)
    ).filter(
        Institution.id == user.institution_id
    ).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution


def save_logo(file: UploadFile, institution_id: int) -> str:
    """Save uploaded logo and return the URL path"""
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"institution_{institution_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL path (relative to uploads mount point)
    return f"/uploads/logos/{filename}"


# ==================== Endpoints ====================

@router.get("/current", response_model=InstitutionResponse)
def get_current_institution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's institution settings
    """
    # Handle Platform Owner (no institution)
    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if str(role_val) == "platform_owner":
        return {
            "id": 0,
            "name": "Platform Administration",
            "subdomain": "platform",
            "contact_email": current_user.email,
            "contact_phone": None,
            "address": "Admin HQ",
            "description": "Platform Owner Management Interface",
            "brand_name": "EduComfort Platform",
            "logo_url": None,
            "primary_color": "#001529", # AntD dark sidebar color
            "secondary_color": "#1890ff",
            "subscription_tier": "enterprise",
            "is_active": True,
            "subscription": {
                "plan": "gold",
                "status": "active", 
                "start_date": datetime.utcnow(), 
                "auto_renew": True,
                "next_billing_date": None
            }
        }

    institution = get_user_institution(db, current_user)
    # print(f"DEBUG: Institution {institution.name} ID {institution.id}")
    return institution


@router.put("/current", response_model=InstitutionResponse)
def update_current_institution(
    data: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's institution settings
    Requires admin or super_admin role
    """
    try:
        if not is_admin_or_higher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update institution settings"
            )
        
        institution = get_user_institution(db, current_user)
        
        # Update fields
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(institution, field, value)
        
        db.commit()
        db.refresh(institution)
        
        return institution
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/current/logo", response_model=InstitutionResponse)
async def upload_institution_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a logo for the current institution
    Requires admin or super_admin role
    """
    try:
        if not is_admin_or_higher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can upload institution logos"
            )
        
        # Validate file type
        allowed_extensions = {".jpg", ".jpeg", ".png", ".svg", ".webp"}
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        institution = get_user_institution(db, current_user)
        
        # Delete old logo if exists
        if institution.logo_url:
            old_logo_path = institution.logo_url.replace("/uploads/", "uploads/")
            if os.path.exists(old_logo_path):
                try:
                    os.remove(old_logo_path)
                except Exception as e:
                    print(f"Warning: Could not delete old logo: {e}")
        
        # Save new logo
        logo_url = save_logo(file, institution.id)
        institution.logo_url = logo_url
        
        db.commit()
        db.refresh(institution)
        
        return institution
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution_by_id(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get institution by ID
    Requires super_admin role
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view other institutions"
        )
    
    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution


@router.get("/", response_model=list[InstitutionResponse])
def list_institutions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all institutions
    Requires super_admin role
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can list all institutions"
        )
    
    institutions = db.query(Institution).filter(
        Institution.subdomain != "educomfort"
    ).all()
    return institutions


# ==================== Link Learner Schema ====================
class LinkLearnerRequest(BaseModel):
    email: str = Field(..., description="Email of the individual learner to link")

@router.post("/learners/link", response_model=InstitutionResponse)
def link_existing_learner(
    data: LinkLearnerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Link an existing individual learner to the current institution.
    The learner must NOT belong to any other institution.
    """
    # Verify current user is admin/super_admin
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can link learners"
        )
    
    # Get Admin's Institution
    institution = get_user_institution(db, current_user)
    
    # Find Learner
    learner = db.query(User).filter(User.email == data.email).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found with this email")
        
    # Validation
    if learner.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")
        
    if learner.institution_id is not None:
        if learner.institution_id == institution.id:
            raise HTTPException(status_code=400, detail="User is already in your institution")
        else:
            raise HTTPException(status_code=400, detail="User belongs to another institution")
            
    # Link Learner
    learner.institution_id = institution.id
    db.commit()
    
    return institution

