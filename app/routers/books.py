"""
Books Router - Teacher assigns books to students
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.student_book import StudentBook
from app.models.group import Group
from app.models.interactive_book import Book as InteractiveBook
from app.tasks.ai_book_processing import process_book_with_ai_background
from fastapi import BackgroundTasks
from pydantic import BaseModel


router = APIRouter(prefix="/books", tags=["Books"])


# Schemas
class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    subject_id: Optional[int] = None
    description: Optional[str] = None
    is_required: bool = False


class BookAssign(BaseModel):
    book_id: int
    assigned_to_group_id: Optional[int] = None
    assigned_to_student_id: Optional[int] = None
    is_required: bool = False


class BookResponse(BaseModel):
    id: int
    title: str
    author: Optional[str]
    subject_id: Optional[int]
    description: Optional[str]
    file_path: str
    cover_image: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]
    assigned_by_id: int
    is_required: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Helper function
def save_book_file(file: UploadFile, user_id: int) -> tuple:
    """Save uploaded book file and return (file_path, file_size, file_type)"""
    
    # Create uploads directory if not exists
    upload_dir = "uploads/books"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"book_{user_id}_{timestamp}{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    file_type = file_extension.lstrip('.')
    
    return file_path, file_size, file_type


# TEACHER ENDPOINTS

@router.post("/upload")
async def upload_book(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    author: Optional[str] = Form(None),
    subject_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    is_required: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a new book (Teachers only)
    
    Returns job_id for tracking async processing
    """
    # Check if user is teacher
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can upload books"
        )
    
    # Validate file type
    allowed_extensions = {'.pdf', '.epub', '.docx', '.doc', '.png', '.jpg', '.jpeg'}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save file
    file_path, file_size, file_type = save_book_file(file, current_user.id)
    
    # Validate uploaded file
    from app.utils.file_detector import validate_upload, detect_and_route
    is_valid, error_msg = validate_upload(file_path, max_size_mb=100)
    if not is_valid:
        # Clean up file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Detect file type and route to pipeline
    pipeline_type, analysis_data = detect_and_route(file_path)
    
    # Create book record (initially not assigned to anyone)
    new_book = StudentBook(
        title=title,
        author=author,
        subject_id=subject_id,
        description=description,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        assigned_by_id=current_user.id,
        is_required=is_required
    )
    
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    # Create processing job
    from app.models.book_processing_job import BookProcessingJob
    from app.tasks.book_processing import process_text_extraction, process_ocr
    
    job = BookProcessingJob(
        book_id=new_book.id,
        job_type=pipeline_type,
        status="queued",
        priority=5,  # Default priority
        job_metadata={
            'file_size': file_size,
            'file_type': file_type,
            'detected_classification': analysis_data.get('classification', 'unknown'),
            'text_density': analysis_data.get('avg_chars_per_page', 0),
            'total_pages': analysis_data.get('total_pages', 0)
        }
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Dispatch to appropriate Celery task
    if pipeline_type == "text_extraction":
        task = process_text_extraction.delay(job.id)
    elif pipeline_type in ["ocr_tesseract", "ocr_cloud"]:
        task = process_ocr.delay(job.id)
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unknown pipeline type: {pipeline_type}"
        )
    
    # Update job with Celery task ID
    job.celery_task_id = task.id
    db.commit()

    # --- AI INTEGRATION: Create Interactive Book Record ---
    try:
        # Create corresponding InteractiveBook record
        interactive_book = InteractiveBook(
            title=new_book.title,
            author=new_book.author,
            subject=str(new_book.subject_id) if new_book.subject_id else None,
            file_path=new_book.file_path,
            file_type=new_book.file_type,
            file_size_bytes=new_book.file_size,
            processing_status='pending',
            institution_id=current_user.institution_id,
            uploaded_by_user_id=current_user.id,
            is_published=False  # Generated content needs review first
        )
        db.add(interactive_book)
        db.commit()
        db.refresh(interactive_book)

        # Trigger AI processing
        background_tasks.add_task(process_book_with_ai_background, interactive_book.id)
        
        # Link back (optional, just logging for now)
        print(f"Triggered AI processing for book {new_book.id} -> InteractiveBook {interactive_book.id}")
        
    except Exception as e:
        print(f"Failed to trigger AI processing: {e}")
        # Don't fail the request, just log error
    # ------------------------------------------------------
    
    return {
        "message": "Book uploaded successfully. Standard and AI processing started.",
        "book_id": new_book.id,
        "job_id": job.id,
        "job_type": pipeline_type,
        "celery_task_id": task.id,
        "status": "queued",
        "book": {
            "id": new_book.id,
            "title": new_book.title,
            "author": new_book.author,
            "file_type": new_book.file_type,
            "file_size": new_book.file_size
        }
    }



@router.post("/assign")
async def assign_book(
    assignment: BookAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign a book to a student or group (Teachers only)
    """
    # Check if user is teacher
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can assign books"
        )
    
    # Get the MASTER book (where assigned_to_student_id is None)
    book = db.query(StudentBook).filter(
        StudentBook.id == assignment.book_id,
        StudentBook.assigned_to_student_id is None  # Master copy
    ).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in your library"
        )
    
    # Verify teacher owns this book
    if book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only assign books you uploaded"
        )
    
    # Must assign to either group or student
    if not assignment.assigned_to_group_id and not assignment.assigned_to_student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must assign to either a group or a student"
        )
    
    # If assigning to group, create individual assignments for each student
    if assignment.assigned_to_group_id:
        group = db.query(Group).filter(Group.id == assignment.assigned_to_group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Get all students in group
        students = group.students  # Use the correct relationship name
        
        if not students:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active students in this group"
            )
        
        # Create assignment for each student
        assigned_count = 0
        for student in students:
            # Check if already assigned (look for same title and student)
            existing = db.query(StudentBook).filter(
                StudentBook.title == book.title,
                StudentBook.assigned_by_id == current_user.id,
                StudentBook.assigned_to_student_id == student.id,
                StudentBook.is_active
            ).first()
            
            if not existing:
                # Create new assignment
                new_assignment = StudentBook(
                    title=book.title,
                    author=book.author,
                    subject_id=book.subject_id,
                    description=book.description,
                    file_path=book.file_path,
                    cover_image=book.cover_image,
                    file_size=book.file_size,
                    file_type=book.file_type,
                    assigned_by_id=current_user.id,
                    assigned_to_group_id=assignment.assigned_to_group_id,
                    assigned_to_student_id=student.id,
                    is_required=assignment.is_required
                )
                db.add(new_assignment)
                assigned_count += 1
        
        db.commit()
        return {"message": f"Book assigned to {assigned_count} students in group"}
    
    # Assign to individual student
    else:
        # Check if already assigned
        existing = db.query(StudentBook).filter(
            StudentBook.title == book.title,
            StudentBook.assigned_by_id == current_user.id,
            StudentBook.assigned_to_student_id == assignment.assigned_to_student_id,
            StudentBook.is_active
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book already assigned to this student"
            )
        
        # Create assignment
        new_assignment = StudentBook(
            title=book.title,
            author=book.author,
            subject_id=book.subject_id,
            description=book.description,
            file_path=book.file_path,
            cover_image=book.cover_image,
            file_size=book.file_size,
            file_type=book.file_type,
            assigned_by_id=current_user.id,
            assigned_to_student_id=assignment.assigned_to_student_id,
            is_required=assignment.is_required
        )
        db.add(new_assignment)
        db.commit()
        
        return {"message": "Book assigned successfully"}


@router.get("/my-library", response_model=List[BookResponse])
async def get_teacher_library(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all books uploaded by current teacher
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this endpoint"
        )
    
    books = db.query(StudentBook).filter(
        StudentBook.assigned_by_id == current_user.id,
        StudentBook.assigned_to_student_id is None,  # Only master copies
        StudentBook.is_active  # Filter out deleted books
    ).all()
    
    return books


# STUDENT ENDPOINTS

@router.get("/my-books", response_model=List[BookResponse])
async def get_my_books(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all books assigned to current student
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint"
        )
    
    query = db.query(StudentBook).filter(
        StudentBook.assigned_to_student_id == current_user.id,
        StudentBook.is_active
    )
    
    # Filter by subject if provided
    if subject_id:
        query = query.filter(StudentBook.subject_id == subject_id)
    
    books = query.all()
    return books


@router.get("/{book_id}/download")
async def download_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a book file
    """
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check permissions
    if current_user.role == "student":
        # Student can only download their assigned books
        if book.assigned_to_student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this book"
            )
    elif current_user.role == "teacher":
        # Teacher can download their own books
        if book.assigned_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this book"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if file exists
    if not os.path.exists(book.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book file not found on server at path: {book.file_path}"
        )
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=book.file_path,
        filename=f"{book.title}.{book.file_type}",
        media_type="application/octet-stream"
    )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book_details(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific book
    """
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Permission Logic
    # 1. Teachers can see books from their institution
    if current_user.role == "teacher":
        if book.assigned_by_id == current_user.id:
            return book
            
        # Check if uploader is in same institution
        uploader = db.query(User).filter(User.id == book.assigned_by_id).first()
        if uploader and uploader.institution_id == current_user.institution_id:
            return book
            
    # 2. Students can see books assigned to them
    if current_user.role == "student":
        if book.assigned_to_student_id == current_user.id:
            return book
            
    # 3. Users can see the master copy if they have an assignment derived from it
    # If the requested book is a master copy (assigned_to_student_id is None)
    if book.assigned_to_student_id is None:
        # Check if student has an assignment of this book
        assignment = db.query(StudentBook).filter(
            StudentBook.file_path == book.file_path,
            StudentBook.assigned_to_student_id == current_user.id,
            StudentBook.is_active
        ).first()
        
        if assignment:
            return book

    # 4. Admins/Super Admins can view any book
    if current_user.role in ["admin", "super_admin", "platform_owner"]:
        return book

    # If none of the above, deny access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this book"
    )


@router.delete("/{book_id}")
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a book (Teachers only)
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can delete books"
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
            detail="You can only delete books you uploaded"
        )
    
    # Soft delete (mark as inactive)
    # Also mark all assigned copies as inactive
    related_books = db.query(StudentBook).filter(
        StudentBook.assigned_by_id == current_user.id,
        StudentBook.file_path == book.file_path,
        StudentBook.is_active
    ).all()
    
    deleted_count = 0
    for related_book in related_books:
        related_book.is_active = False
        deleted_count += 1
        
    db.commit()
    
    return {"message": f"Book deleted successfully. Removed {deleted_count} copies/assignments."}
