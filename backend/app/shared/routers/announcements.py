"""
Announcements Router
- Announcements are scoped per institution (institution_id)
- Platform owners see ALL announcements across all institutions
- Admins/super_admins only see/create announcements for their own institution
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.engagement.models.announcement import Announcement

router = APIRouter(tags=["Announcements"])
# NOTE: prefix="/announcements" is set in main.py


# ==================== Helpers ====================

def _role_str(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_platform_owner(user: User) -> bool:
    return _role_str(user) in ("platform_owner",)


def _is_admin(user: User) -> bool:
    return _role_str(user) in ("admin", "super_admin", "platform_owner", "teacher")


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ann_to_dict(a: Announcement, author_name: str = None) -> dict:
    return {
        "id": a.id,
        "title": a.title or "",
        "content": a.content or "",
        "target_audience": a.target_audience,
        "target_roles": a.target_audience,   # alias for frontend compat
        "is_active": True,
        "created_at": a.created_at or _now(),
        "expires_at": None,
        "author_id": a.author_id,
        "author_name": author_name,
        "institution_id": a.institution_id,
    }


# ==================== Schemas ====================

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: Optional[str] = "all"


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    target_audience: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    target_audience: Optional[str] = None
    target_roles: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    expires_at: Optional[datetime] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    institution_id: Optional[int] = None

    class Config:
        from_attributes = True



# ==================== Routes ====================

@router.get("", response_model=List[AnnouncementResponse])
@router.get("/", response_model=List[AnnouncementResponse], include_in_schema=False)
def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List announcements scoped by institution.
    Platform owners see all. Everyone else sees only their institution's announcements.
    """
    try:
        q = db.query(Announcement).order_by(Announcement.created_at.desc())

        # Institution isolation: platform_owner sees all, others only their institution
        if not _is_platform_owner(current_user):
            if current_user.institution_id:
                q = q.filter(Announcement.institution_id == current_user.institution_id)
            else:
                # No institution → only platform-wide (null institution_id)
                q = q.filter(Announcement.institution_id.is_(None))

        announcements = q.offset(skip).limit(limit).all()

        result = []
        for a in announcements:
            author_name = None
            if a.author:
                author_name = f"{a.author.first_name} {a.author.last_name}"
            result.append(_ann_to_dict(a, author_name))
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch announcements: {str(exc)}",
        )


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")

    try:
        announcement = Announcement(
            title=data.title,
            content=data.content,
            target_audience=data.target_audience or "all",
            author_id=current_user.id,
            institution_id=current_user.institution_id,  # scope to creator's institution
        )
        db.add(announcement)
        db.commit()
        db.refresh(announcement)

        author_name = f"{current_user.first_name} {current_user.last_name}"
        return _ann_to_dict(announcement, author_name)

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create: {str(exc)}")


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Isolation check
    if not _is_platform_owner(current_user):
        if a.institution_id and a.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied")

    author_name = None
    if a.author:
        author_name = f"{a.author.first_name} {a.author.last_name}"
    return _ann_to_dict(a, author_name)


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")

    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Institution isolation
    if not _is_platform_owner(current_user):
        if a.institution_id and a.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Cannot edit another institution's announcement")

    try:
        update_data = (
            data.model_dump(exclude_unset=True)
            if hasattr(data, "model_dump")
            else data.dict(exclude_unset=True)
        )
        for field, value in update_data.items():
            setattr(a, field, value)
        db.commit()
        db.refresh(a)

        author_name = None
        if a.author:
            author_name = f"{a.author.first_name} {a.author.last_name}"
        return _ann_to_dict(a, author_name)

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(exc)}")


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")

    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Institution isolation
    if not _is_platform_owner(current_user):
        if a.institution_id and a.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Cannot delete another institution's announcement")

    try:
        db.delete(a)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(exc)}")