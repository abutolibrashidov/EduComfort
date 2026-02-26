from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.announcement import Announcement

router = APIRouter()

# Schemas
class AnnouncementBase(BaseModel):
    title: str
    content: str
    target_audience: str = "all"

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementRead(AnnouncementBase):
    id: int
    author_id: int
    author_name: str
    created_at: datetime

    class Config:
        orm_mode = True

# Endpoints

@router.post("/", response_model=AnnouncementRead)
def create_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[DEBUG] create_announcement: user={current_user.id}, role={current_user.role}", flush=True)
    if current_user.role not in ["super_admin", "admin", "teacher", "platform_owner"]:
        print(f"[DEBUG] create_announcement: Access denied for role {current_user.role}", flush=True)
        raise HTTPException(status_code=403, detail="Access denied")

    db_announcement = Announcement(
        **announcement.dict(),
        author_id=current_user.id
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)

    # Attach author name for response
    db_announcement.author_name = f"{current_user.first_name} {current_user.last_name}"
    
    return db_announcement

@router.get("/", response_model=List[AnnouncementRead])
def read_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get announcements relevant to current user"""
    query = db.query(Announcement)

    # Filter based on role
    if current_user.role not in ["super_admin", "admin", "platform_owner", "staff"]:
        if current_user.role == "student":
            query = query.filter(Announcement.target_audience.in_(["all", "students"]))
        elif current_user.role == "teacher":
            query = query.filter(Announcement.target_audience.in_(["all", "teachers"]))
        else:
            # Fallback for unexpected roles
            query = query.filter(Announcement.target_audience == "all")

    announcements = query.order_by(Announcement.created_at.desc()).all()

    # Attach author names
    for a in announcements:
        try:
            author = db.query(User).filter(User.id == a.author_id).first()
            if author:
                a.author_name = f"{author.first_name} {author.last_name}"
            else:
                a.author_name = "Unknown"
        except Exception as e:
            print(f"Error fetching author for announcement {a.id}: {e}")
            a.author_name = "Unknown"

    return announcements

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an announcement"""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    print(f"[DEBUG] delete_announcement: id={announcement_id}, user={current_user.id}, role={current_user.role}, author={announcement.author_id}", flush=True)
    # Only author, admin, or platform owner can delete
    if current_user.role not in ["super_admin", "admin", "platform_owner"] and announcement.author_id != current_user.id:
        print(f"[DEBUG] delete_announcement: Access denied! role={current_user.role}, author_id={announcement.author_id}", flush=True)
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(announcement)
    db.commit()

    return {"message": "Announcement deleted"}
