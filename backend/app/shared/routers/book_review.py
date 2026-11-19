"""
Phase 3: Teacher Review Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User
from app.academic.models.student_book import StudentBook
from app.academic.models.book_content import BookContent


router = APIRouter(prefix="/book-review", tags=["Book Review"])


# Schemas
class PageReviewResponse(BaseModel):
    id: int
    page_number: int
    chapter_number: int
    chapter_title: str
    ocr_confidence: float
    needs_review: bool
    is_reviewed: bool
    page_content: str
    reviewed_text: str = None
    reviewed_at: str = None
    
    class Config:
        from_attributes = True


class ReviewSubmission(BaseModel):
    reviewed_text: str


@router.get("/books/{book_id}/pages/review", response_model=List[PageReviewResponse])
async def get_pages_needing_review(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all pages that need review for a book (teachers only)
    """
    # Check if user is teacher or admin
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can access review pages"
        )
    
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if teacher is in same institution as the book uploader
    if current_user.role == "teacher":
        if book.assigned_by_id != current_user.id:
            uploader = db.query(User).filter(User.id == book.assigned_by_id).first()
            if not uploader or uploader.institution_id != current_user.institution_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only review books within your institution"
                )
    
    # Get pages needing review
    pages = db.query(BookContent).filter(
        BookContent.book_id == book_id,
        BookContent.needs_review
    ).order_by(BookContent.page_number).all()
    
    # Format response
    result = []
    for page in pages:
        result.append({
            "id": page.id,
            "page_number": page.page_number,
            "chapter_number": page.chapter_number,
            "chapter_title": page.chapter_title or "Untitled",
            "ocr_confidence": getattr(page, 'ocr_confidence', 0),
            "needs_review": page.needs_review,
            "is_reviewed": page.is_reviewed,
            "page_content": page.page_content,
            "reviewed_text": page.reviewed_text,
            "reviewed_at": page.reviewed_at.isoformat() if page.reviewed_at else None
        })
    
    return result


@router.put("/books/{book_id}/pages/{page_number}/review")
async def submit_page_review(
    book_id: int,
    page_number: int,
    review: ReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit review for a page (teachers only)
    """
    # Check if user is teacher or admin
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can review pages"
        )
    
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if teacher is in same institution as the book uploader
    if current_user.role == "teacher":
        if book.assigned_by_id != current_user.id:
            uploader = db.query(User).filter(User.id == book.assigned_by_id).first()
            if not uploader or uploader.institution_id != current_user.institution_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only review books within your institution"
                )
    
    # Get page
    page = db.query(BookContent).filter(
        BookContent.book_id == book_id,
        BookContent.page_number == page_number
    ).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )
    
    # Update page with review
    page.reviewed_text = review.reviewed_text
    page.reviewed_by = current_user.id
    page.reviewed_at = datetime.utcnow()
    page.is_reviewed = True
    page.needs_review = False  # Mark as no longer needing review
    
    db.commit()
    db.refresh(page)
    
    return {
        "message": "Page review submitted successfully",
        "page_number": page_number,
        "is_reviewed": True,
        "reviewed_at": page.reviewed_at.isoformat()
    }
