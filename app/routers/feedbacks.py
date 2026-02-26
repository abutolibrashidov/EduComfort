from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.feedback import Feedback

router = APIRouter()

# Schemas
class FeedbackCreate(BaseModel):
    content: str
    type: str = "general"

class FeedbackRead(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_role: str
    content: str
    type: str
    created_at: datetime

    class Config:
        orm_mode = True

# Endpoints

@router.post("/", response_model=FeedbackRead)
def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Users submit feedback"""
    db_feedback = Feedback(
        **feedback.dict(),
        user_id=current_user.id
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    # Attach user name for response
    db_feedback.user_name = f"{current_user.first_name} {current_user.last_name}"
    db_feedback.user_role = current_user.role
    
    return db_feedback

@router.get("/", response_model=List[FeedbackRead])
def read_feedbacks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Platform owner reads all feedback"""
    if current_user.role not in ["super_admin", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()

    # Attach user names and roles
    for f in feedbacks:
        try:
            author = db.query(User).filter(User.id == f.user_id).first()
            if author:
                f.user_name = f"{author.first_name} {author.last_name}"
                f.user_role = author.role
            else:
                f.user_name = "Unknown"
                f.user_role = "unknown"
        except Exception:
            f.user_name = "Unknown"
            f.user_role = "unknown"

    return feedbacks

@router.delete("/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Platform owner can clear feedback"""
    if current_user.role not in ["super_admin", "platform_owner"]:
        raise HTTPException(status_code=403, detail="Access denied")

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    db.delete(feedback)
    db.commit()

    return {"message": "Feedback deleted"}
