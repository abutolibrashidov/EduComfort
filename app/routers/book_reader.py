"""
Book Reader Router - Interactive book reading with progress tracking
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.student_book import StudentBook
from app.models.book_content import BookContent, StudentBookProgress, StudentBookAnswer
from app.utils.book_content_extractor import extract_book_content
from pydantic import BaseModel
from datetime import datetime


router = APIRouter(prefix="/book-reader", tags=["Book Reader"])


# Schemas
class ProgressUpdate(BaseModel):
    current_page: int
    current_chapter: int
    time_spent_minutes: float


class ExerciseSubmission(BaseModel):
    exercise_number: str
    student_answer: str


class BookProgressResponse(BaseModel):
    current_page: int
    current_chapter: int
    total_pages_read: int
    completion_percentage: float
    time_spent_minutes: float
    bookmarks: Optional[List[int]]
    
    class Config:
        from_attributes = True


class BookPageResponse(BaseModel):
    page_number: int
    chapter_number: int
    chapter_title: Optional[str]
    content: str
    exercises: Optional[List[dict]]
    file_type: Optional[str] = 'pdf'  # Default to pdf for backward compatibility
    
    class Config:
        from_attributes = True


# Background task for content extraction
def extract_and_save_content(book_id: int, file_path: str, db: Session):
    """Extract content from book and save to database"""
    try:
        print(f"Extracting content from: {file_path}")
        content_data = extract_book_content(file_path)
        
        # Delete existing content for this book
        db.query(BookContent).filter(BookContent.book_id == book_id).delete()
        
        # Save extracted content
        for chapter in content_data.get("chapters", []):
            for page in chapter.get("pages", []):
                book_content = BookContent(
                    book_id=book_id,
                    chapter_number=chapter["chapter_number"],
                    chapter_title=chapter.get("title"),
                    page_number=page["page_number"],
                    page_content=page["content"],
                    exercises=json.dumps(page.get("exercises", []))
                )
                db.add(book_content)
        
        db.commit()
        print(f"✅ Content extraction completed for book {book_id}")
        
    except Exception as e:
        print(f"❌ Content extraction failed: {str(e)}")
        db.rollback()


# EXTRACTION ENDPOINTS

@router.post("/books/{book_id}/extract")
async def extract_book_content_endpoint(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extract content from a book (Teachers only)
    Runs in background
    """
    # Check if user is teacher
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can extract book content"
        )
    
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Verify ownership
    if book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only extract content from books you uploaded"
        )
    
    # Add extraction task to background
    background_tasks.add_task(extract_and_save_content, book_id, book.file_path, db)
    
    return {"message": "Content extraction started in background"}


@router.get("/books/{book_id}/extraction-status")
async def get_extraction_status(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if book content has been extracted
    Returns extraction status even if there are errors
    """
    try:
        # Get book
        book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        # Check if content exists
        content_count = db.query(BookContent).filter(BookContent.book_id == book_id).count()
        
        # Get chapter and page counts
        chapters = db.query(BookContent.chapter_number).filter(
            BookContent.book_id == book_id
        ).distinct().count()
        
        return {
            "book_id": book_id,
            "is_extracted": content_count > 0,
            "total_pages": content_count,
            "total_chapters": chapters,
            "status": "ready" if content_count > 0 else "not_extracted"
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        # Log the error but return a safe default response
        print(f"Error checking extraction status for book {book_id}: {str(e)}")
        # Return default "not extracted" status instead of crashing
        return {
            "book_id": book_id,
            "is_extracted": False,
            "total_pages": 0,
            "total_chapters": 0,
            "status": "not_extracted",
            "error": "Could not check extraction status"
        }


# STUDENT READING ENDPOINTS

@router.get("/books/{book_id}/pages/{page_number}", response_model=BookPageResponse)
async def get_book_page(
    book_id: int,
    page_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific page from a book
    """
    # Get the book first
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if student has access to this book
    if current_user.role == "student":
        # Check direct assignment
        has_access = book.assigned_to_student_id == current_user.id
        
        # If not directly assigned, check group assignment
        if not has_access and book.assigned_to_group_id:
            student_group_ids = [group.id for group in current_user.student_groups]
            has_access = book.assigned_to_group_id in student_group_ids
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this book"
            )
    
    # Find the master book (content is stored with master book ID)
    # Master book has the same file_path but assigned_to_student_id is None
    master_book = db.query(StudentBook).filter(
        StudentBook.file_path == book.file_path,
        StudentBook.assigned_to_student_id == None
    ).first()
    
    if not master_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master book not found"
        )
    
    # Get page content using master book ID
    page_content = db.query(BookContent).filter(
        BookContent.book_id == master_book.id,
        BookContent.page_number == page_number
    ).first()
    
    if not page_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found. Book content may not be extracted yet."
        )
    
    # Parse exercises from JSON
    exercises = json.loads(page_content.exercises) if page_content.exercises else []
    
    return {
        "page_number": page_content.page_number,
        "chapter_number": page_content.chapter_number,
        "chapter_title": page_content.chapter_title,
        "content": page_content.page_content,
        "exercises": exercises,
        "file_type": master_book.file_type
    }


@router.get("/books/{book_id}/chapters")
async def get_book_chapters(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of chapters in a book
    """
    # Get the book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check access
    if current_user.role == "student":
        has_access = book.assigned_to_student_id == current_user.id
        
        if not has_access and book.assigned_to_group_id:
            student_group_ids = [group.id for group in current_user.student_groups]
            has_access = book.assigned_to_group_id in student_group_ids
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this book"
            )
    
    # Find master book
    master_book = db.query(StudentBook).filter(
        StudentBook.file_path == book.file_path,
        StudentBook.assigned_to_student_id == None
    ).first()
    
    if not master_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master book not found"
        )
    
    # Get unique chapters using master book ID
    chapters = db.query(
        BookContent.chapter_number,
        BookContent.chapter_title
    ).filter(
        BookContent.book_id == master_book.id
    ).distinct().order_by(BookContent.chapter_number).all()
    
    # Get page counts for each chapter
    result = []
    for chapter_num, chapter_title in chapters:
        page_count = db.query(BookContent).filter(
            BookContent.book_id == master_book.id,
            BookContent.chapter_number == chapter_num
        ).count()
        
        result.append({
            "chapter_number": chapter_num,
            "title": chapter_title,
            "page_count": page_count
        })
    
    return result


@router.get("/books/{book_id}/my-progress", response_model=BookProgressResponse)
async def get_my_progress(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get student's reading progress for a book
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint"
        )
    
    # Get or create progress
    progress = db.query(StudentBookProgress).filter(
        StudentBookProgress.student_id == current_user.id,
        StudentBookProgress.book_id == book_id
    ).first()
    
    if not progress:
        # Create initial progress
        # Get the book to retrieve file_path for extraction
        book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        # Find the master book (content is stored with master book ID)
        master_book = db.query(StudentBook).filter(
            StudentBook.file_path == book.file_path,
            StudentBook.assigned_to_student_id == None
        ).first()
        
        if not master_book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Master book not found"
            )

        # Get total pages from BookContent for the master book
        total_pages_in_book = db.query(BookContent).filter(
            BookContent.book_id == master_book.id
        ).count()
        
        progress = StudentBookProgress(
            student_id=current_user.id,
            book_id=book_id,
            current_page=1,
            current_chapter=1,
            total_pages_read=0,
            completion_percentage=0.0,
            time_spent_minutes=0.0
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress


@router.post("/books/{book_id}/progress")
async def update_progress(
    book_id: int,
    progress_data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update student's reading progress
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can update progress"
        )
    
    # Get progress
    progress = db.query(StudentBookProgress).filter(
        StudentBookProgress.student_id == current_user.id,
        StudentBookProgress.book_id == book_id
    ).first()
    
    if not progress:
        progress = StudentBookProgress(
            student_id=current_user.id,
            book_id=book_id
        )
        db.add(progress)
    
    # Update progress
    progress.current_page = progress_data.current_page
    progress.current_chapter = progress_data.current_chapter
    progress.time_spent_minutes += progress_data.time_spent_minutes
    progress.last_read_at = datetime.utcnow()
    
    # Update total pages read (unique pages)
    if progress_data.current_page > progress.total_pages_read:
        progress.total_pages_read = progress_data.current_page
    
    # Calculate completion percentage
    total_pages = db.query(BookContent).filter(BookContent.book_id == book_id).count()
    if total_pages > 0:
        progress.completion_percentage = (progress.total_pages_read / total_pages) * 100
    
    db.commit()
    
    return {"message": "Progress updated successfully"}


@router.post("/books/{book_id}/exercises/submit")
async def submit_exercise(
    book_id: int,
    submission: ExerciseSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit answer to a book exercise
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can submit exercises"
        )
    
    # Find the exercise in book content
    # This is simplified - in production you'd need content_id
    content = db.query(BookContent).filter(
        BookContent.book_id == book_id
    ).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book content not found"
        )
    
    # Save answer
    answer = StudentBookAnswer(
        student_id=current_user.id,
        book_id=book_id,
        content_id=content.id,
        exercise_number=submission.exercise_number,
        student_answer=submission.student_answer,
        submitted_at=datetime.utcnow()
    )
    
    db.add(answer)
    db.commit()
    
    return {"message": "Answer submitted successfully"}


# TEACHER ANALYTICS ENDPOINTS

@router.get("/books/{book_id}/analytics")
async def get_book_analytics(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get analytics for a book (Teachers only)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access analytics"
        )
    
    # Get all student progress for this book
    progress_records = db.query(StudentBookProgress).filter(
        StudentBookProgress.book_id == book_id
    ).all()
    
    # Calculate stats
    total_students = len(progress_records)
    avg_completion = sum(p.completion_percentage for p in progress_records) / total_students if total_students > 0 else 0
    avg_time_spent = sum(p.time_spent_minutes for p in progress_records) / total_students if total_students > 0 else 0
    
    return {
        "total_students": total_students,
        "average_completion": round(avg_completion, 2),
        "average_time_spent_minutes": round(avg_time_spent, 2),
        "students": [
            {
                "student_id": p.student_id,
                "current_page": p.current_page,
                "completion_percentage": p.completion_percentage,
                "time_spent_minutes": p.time_spent_minutes,
                "last_read_at": p.last_read_at
            }
            for p in progress_records
        ]
    }
