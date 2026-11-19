from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.engagement.models.feedback import Feedback

router = APIRouter()
# NOTE: prefix="/feedbacks" is set in main.py — do NOT add it here


# ==================== Helpers ====================

def _role_str(user: User) -> str:
    """Safely extract role as string — handles both Enum and plain string columns."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _require_platform_staff(user: User) -> None:
    """Raise 403 unless platform owner (feedback spans all institutions)."""
    if not (user.is_platform_admin or _role_str(user) == "platform_owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


# ==================== Schemas ====================

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
        from_attributes = True  # Pydantic v2



# ==================== Routes ====================
#
# KEY FIX: main.py registers with prefix="/feedbacks".
# With redirect_slashes=False on the FastAPI app:
#   prefix + "/"  -> /feedbacks/   <- frontend calls /feedbacks -> 404
#   prefix + ""   -> /feedbacks    <- correct
#
# Register on both "" and "/" so either URL form works without 404.

@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit feedback. Available to all authenticated users."""
    db_feedback = Feedback(
        content=feedback.content,
        type=feedback.type,
        user_id=current_user.id,
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    # Attach transient display fields for the response (not stored in DB)
    db_feedback.user_name = (
        f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Unknown"
    )
    db_feedback.user_role = _role_str(current_user)
    return db_feedback


@router.get("", response_model=List[FeedbackRead])
@router.get("/", response_model=List[FeedbackRead], include_in_schema=False)
def read_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all feedback. Requires platform_owner or super_admin."""
    # FIX: original compared current_user.role directly to strings.
    # When role is a SQLAlchemy Enum, Role.SUPER_ADMIN != "super_admin" -> silent 403.
    _require_platform_staff(current_user)

    feedbacks = (
        db.query(Feedback)
        .order_by(Feedback.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # FIX: original ran one SELECT per feedback row (N+1 queries).
    # Batch-load all authors in a single IN query instead.
    author_ids = {f.user_id for f in feedbacks if f.user_id is not None}
    authors: dict = {}
    if author_ids:
        authors = {
            u.id: u
            for u in db.query(User).filter(User.id.in_(author_ids)).all()
        }

    for f in feedbacks:
        author = authors.get(f.user_id)
        if author:
            f.user_name = (
                f"{author.first_name or ''} {author.last_name or ''}".strip() or "Unknown"
            )
            f.user_role = _role_str(author)
        else:
            f.user_name = "Unknown"
            f.user_role = "unknown"

    return feedbacks


@router.delete("/{feedback_id}", status_code=status.HTTP_200_OK)
def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a feedback entry. Requires platform_owner or super_admin."""
    _require_platform_staff(current_user)

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found"
        )

    db.delete(feedback)
    db.commit()
    return {"message": "Feedback deleted", "id": feedback_id}