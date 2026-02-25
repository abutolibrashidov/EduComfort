"""
Interactive Books API Router
CRUD endpoints for AI-powered interactive book subsystem
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.models.interactive_book import (
    Book, Unit, Exercise, StudentAnswer, UnitProgress, BookProgress,
    AIProcessingLog, TeacherReview
)
from app.models.user import User
from app.schemas.interactive_book import (
    BookCreate, BookUpdate, BookResponse, BookWithUnits,
    UnitCreate, UnitUpdate, UnitResponse, UnitWithExercises,
    ExerciseCreate, ExerciseUpdate, ExerciseResponse,
    StudentAnswerCreate, StudentAnswerResponse,
    UnitProgressResponse, UnitProgressUpdate, BookProgressResponse,
    TeacherReviewCreate, TeacherReviewResponse,
    AIProcessingLogResponse, AIProcessingTrigger
)
from app.auth.dependencies import get_current_user
from app.security.permissions import is_teacher, is_admin_or_higher
from app.tasks.ai_book_processing import process_book_with_ai_background

router = APIRouter(prefix="/interactive-books", tags=["Interactive Books"])


# ============================================================================
# BOOK MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def upload_book(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    file: UploadFile = File(...),
    author: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    trigger_ai: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a new book file and create book record.
    Triggers AI processing in background.
    """
    print(f"📥 Received upload request: filename={file.filename}, title={title}")
    # Verify user is teacher or admin
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IB_ROUTER: Only teachers and admins can upload books"
        )
    
    # Validate file type
    allowed_extensions = ['.pdf', '.docx', '.doc', '.epub']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not supported. Allowed: {allowed_extensions}"
        )
    
    # Calculate file hash for duplicate detection
    import hashlib
    print("⏳ Reading file content for hash...")
    file_content = await file.read()
    print(f"✅ Read {len(file_content)} bytes")
    file_hash = hashlib.sha256(file_content).hexdigest()
    await file.seek(0)  # Reset cursor for saving
    
    # Check for existing book with same hash
    existing_book = db.query(Book).filter(
        Book.institution_id == current_user.institution_id,
        Book.file_hash == file_hash
    ).first()
    
    if existing_book:
        print(f"Duplicate upload detected. Returning existing book {existing_book.id}")
        return existing_book

    # Create upload directory
    upload_dir = f"uploads/interactive_books/{current_user.institution_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)

    # ---------------------------------------------------------------------------
    # TODO (Production): Hybrid storage approach needed here.
    #
    # BookContentExtractor (used in background AI processing) requires LOCAL
    # file access to read/parse the book content (PDF pages, DOCX text, etc.).
    # It cannot operate directly on S3 URLs.
    #
    # Recommended production flow:
    #   1. Save file to a local TEMP path  (as done below).
    #   2. Pass temp path to BookContentExtractor / AI processing.
    #   3. After processing completes, call upload_file(temp_path, folder=…)
    #      from app.utils.storage to push to S3 and get back the public URL.
    #   4. Update book.file_path to the S3 URL.
    #   5. Delete the temp file.
    #
    # The background task (process_book_with_ai_background) should be updated
    # to accept an optional temp_path argument and perform step 3-5.
    # ---------------------------------------------------------------------------
    with open(file_path, "wb") as buffer:
        print(f"💾 Saving file to {file_path}...")
        shutil.copyfileobj(file.file, buffer)
    
    file_size = os.path.getsize(file_path)
    print(f"✅ File saved. Size: {file_size} bytes")
    
    # Create book record
    new_book = Book(
        title=title,
        author=author,
        subject=subject,
        grade_level=grade_level,
        file_path=file_path,
        file_type=file_ext[1:],  # Remove dot
        file_size_bytes=file_size,
        processing_status='pending',
        institution_id=current_user.institution_id,
        uploaded_by_user_id=current_user.id,
        file_hash=file_hash
    )
    
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    # Trigger AI processing in background
    if trigger_ai:
        background_tasks.add_task(process_book_with_ai_background, new_book.id)
        new_book.ai_processing_job_id = f"bg_task_{new_book.id}"
        db.commit()
    
    return new_book


@router.get("", response_model=List[BookResponse])
def list_books(
    skip: int = 0,
    limit: int = 100,
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    is_published: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all books with optional filters."""
    query = db.query(Book).filter(Book.institution_id == current_user.institution_id)
    
    if subject:
        query = query.filter(Book.subject == subject)
    if grade_level:
        query = query.filter(Book.grade_level == grade_level)
    if is_published is not None:
        query = query.filter(Book.is_published == is_published)
    
    # Students only see published books
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print(f"DEBUG: list_books filtering for student/other. User={current_user.id} Role={current_user.role}")
        query = query.filter(Book.is_published == True)
    else:
        print(f"DEBUG: list_books showing all for teacher/admin. User={current_user.id} Role={current_user.role}")
    
    books = query.offset(skip).limit(limit).all()
    return books


@router.get("/{book_id}", response_model=BookWithUnits)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get book details with units."""
    book = db.query(Book).options(
        joinedload(Book.units)
    ).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    print(f"DEBUG: get_book book_id={book_id}")
    print(f"DEBUG: User={current_user.id} Role={current_user.role} Inst={current_user.institution_id}")
    print(f"DEBUG: is_teacher={is_teacher(current_user)}")
    print(f"DEBUG: is_admin={is_admin_or_higher(current_user)}")
    print(f"DEBUG: Book ID={book.id} Book Inst={book.institution_id} Book published={book.is_published}")
    
    # Students can only view published books
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print("DEBUG: Access restricted to teacher/admin check for students")
        if not book.is_published:
            print("DEBUG: Book not published -> 403")
            raise HTTPException(status_code=403, detail="IB_ROUTER: Book not published yet")
    else:
        print("DEBUG: Teacher/Admin access granted (Institution match already checked in query)")
    
    return book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update book metadata (teachers/admins only)."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Update fields
    for field, value in book_update.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    
    book.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(book)
    
    return book


@router.put("/{book_id}/publish", response_model=BookResponse)
def publish_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish book for students (teachers/admins only)."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.processing_status != 'completed':
        raise HTTPException(
            status_code=400,
            detail="Cannot publish book that hasn't completed processing"
        )
    
    book.is_published = True
    book.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(book)
    
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify permissions (Admins or the Teacher who uploaded it)
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not is_admin_or_higher(current_user) and book.uploaded_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="IB_ROUTER: Permission denied to delete this book")
    
    # Delete file
    # TODO (Production): Replace with:
    #   from app.utils.storage import delete_file
    #   delete_file(book.file_path)
    # This will handle both local dev paths and S3 URLs correctly.
    # The current `os.path.exists / os.remove` only works for local files.
    if os.path.exists(book.file_path):
        os.remove(book.file_path)
    
    db.delete(book)
    db.commit()
    
    return None


# ============================================================================
# UNIT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/{book_id}/units", response_model=List[UnitResponse])
def list_units(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all units in a book."""
    # Verify book access
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print(f"DEBUG: list_units checking access. User={current_user.id} Role={current_user.role}")
        if not book.is_published:
            print("DEBUG: list_units 403 - Book not published")
            raise HTTPException(status_code=403, detail="Book not published")
    
    units = db.query(Unit).filter(
        Unit.book_id == book_id
    ).order_by(Unit.unit_number).all()
    
    return units


@router.get("/units/{unit_id}", response_model=UnitWithExercises)
def get_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unit details with exercises."""
    unit = db.query(Unit).options(
        joinedload(Unit.exercises)
    ).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Verify book access
    book = db.query(Book).filter(
        Book.id == unit.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print(f"DEBUG: get_unit checking access. User={current_user.id} Role={current_user.role}")
        if not book.is_published:
            print("DEBUG: get_unit 403 - Book not published")
            raise HTTPException(status_code=403, detail="Book not published")
    
    return unit


@router.put("/units/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: int,
    unit_update: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update unit (teachers/admins only)."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Verify book ownership
    book = db.query(Book).filter(
        Book.id == unit.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    for field, value in unit_update.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
    
    unit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(unit)
    
    return unit


# ============================================================================
# EXERCISE ENDPOINTS
# ============================================================================

@router.get("/units/{unit_id}/exercises", response_model=List[ExerciseResponse])
def list_exercises(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all exercises in a unit."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Verify access
    book = db.query(Book).filter(
        Book.id == unit.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print(f"DEBUG: list_exercises checking access. User={current_user.id} Role={current_user.role}")
        if not book.is_published:
            print("DEBUG: list_exercises 403 - Book not published")
            raise HTTPException(status_code=403, detail="Book not published")
    
    exercises = db.query(Exercise).filter(
        Exercise.unit_id == unit_id
    ).order_by(Exercise.sequence_order).all()
    
    return exercises


@router.get("/exercises/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exercise details."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Verify access
    book = db.query(Book).filter(
        Book.id == exercise.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        print(f"DEBUG: get_exercise checking access. User={current_user.id} Role={current_user.role}")
        if not book.is_published:
            print("DEBUG: get_exercise 403 - Book not published")
            raise HTTPException(status_code=403, detail="Book not published")
    
    return exercise


@router.post("/exercises/{exercise_id}/submit", response_model=StudentAnswerResponse)
def submit_answer(
    exercise_id: int,
    answer_data: StudentAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit student answer to an exercise."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Verify book is published
    book = db.query(Book).filter(
        Book.id == exercise.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book or not book.is_published:
        raise HTTPException(status_code=403, detail="Book not available")
    
    # Count existing attempts
    attempt_count = db.query(func.count(StudentAnswer.id)).filter(
        StudentAnswer.student_id == current_user.id,
        StudentAnswer.exercise_id == exercise_id
    ).scalar()
    
    # Auto-grade if possible
    is_correct = None
    points_earned = 0.0
    auto_feedback = None
    
    if exercise.auto_gradable:
        # Simple comparison for now (can be enhanced)
        submitted = answer_data.submitted_answer
        correct = exercise.correct_answer
        
        if exercise.exercise_type == 'multiple_choice':
            is_correct = str(submitted).upper() == str(correct).upper()
        elif exercise.exercise_type == 'true_false':
            is_correct = str(submitted).lower() == str(correct).lower()
        else:
            # For complex types, mark as needs teacher grading
            is_correct = None
        
        if is_correct:
            points_earned = exercise.points
            auto_feedback = "Correct! Well done."
        elif is_correct is False:
            auto_feedback = f"Incorrect. The correct answer is: {correct}"
    
    # Create answer record
    new_answer = StudentAnswer(
        student_id=current_user.id,
        exercise_id=exercise_id,
        unit_id=exercise.unit_id,
        book_id=exercise.book_id,
        submitted_answer=answer_data.submitted_answer,
        is_correct=is_correct,
        points_earned=points_earned,
        points_possible=exercise.points,
        auto_feedback=auto_feedback,
        attempt_number=attempt_count + 1,
        time_spent_seconds=answer_data.time_spent_seconds,
        confidence_level=answer_data.confidence_level
    )
    
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)
    
    # Update progress
    _update_unit_progress(db, current_user.id, exercise.unit_id, exercise.book_id)
    _update_book_progress(db, current_user.id, exercise.book_id)
    
    return new_answer


@router.put("/exercises/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_update: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update exercise (teachers/admins only)."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Verify access
    book = db.query(Book).filter(
        Book.id == exercise.book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    for field, value in exercise_update.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    
    exercise.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exercise)
    
    return exercise


# ============================================================================
# PROGRESS TRACKING ENDPOINTS
# ============================================================================

@router.get("/{book_id}/my-progress", response_model=BookProgressResponse)
def get_my_book_progress(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's progress for a book."""
    # Verify book access
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id,
        Book.is_published == True
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found or not published")
    
    # Get or create progress
    progress = db.query(BookProgress).filter(
        BookProgress.student_id == current_user.id,
        BookProgress.book_id == book_id
    ).first()
    
    if not progress:
        # Create initial progress
        progress = BookProgress(
            student_id=current_user.id,
            book_id=book_id,
            status='not_started'
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress


@router.get("/units/{unit_id}/my-progress", response_model=UnitProgressResponse)
def get_my_unit_progress(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's progress for a unit."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Verify book access
    book = db.query(Book).filter(
        Book.id == unit.book_id,
        Book.institution_id == current_user.institution_id,
        Book.is_published == True
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found or not published")
    
    # Get or create progress
    progress = db.query(UnitProgress).filter(
        UnitProgress.student_id == current_user.id,
        UnitProgress.unit_id == unit_id
    ).first()
    
    if not progress:
        # Create initial progress
        progress = UnitProgress(
            student_id=current_user.id,
            unit_id=unit_id,
            book_id=unit.book_id,
            status='not_started'
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress


@router.post("/units/{unit_id}/progress", response_model=UnitProgressResponse)
def update_my_unit_progress(
    unit_id: int,
    progress_update: UnitProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's unit progress."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Get or create progress
    progress = db.query(UnitProgress).filter(
        UnitProgress.student_id == current_user.id,
        UnitProgress.unit_id == unit_id
    ).first()
    
    if not progress:
        progress = UnitProgress(
            student_id=current_user.id,
            unit_id=unit_id,
            book_id=unit.book_id,
            status='in_progress',
            started_at=datetime.utcnow()
        )
        db.add(progress)
    
    # Update fields
    if progress_update.current_page:
        progress.current_page = progress_update.current_page
    
    if progress_update.time_spent_seconds:
        progress.time_spent_seconds += progress_update.time_spent_seconds
    
    progress.last_accessed_at = datetime.utcnow()
    progress.access_count += 1
    
    if progress.status == 'not_started':
        progress.status = 'in_progress'
        progress.started_at = datetime.utcnow()
    
    db.commit()
    db.refresh(progress)
    
    # Update book progress
    _update_book_progress(db, current_user.id, unit.book_id)
    
    return progress


# ============================================================================
# TEACHER REVIEW ENDPOINTS
# ============================================================================

@router.get("/needs-review", response_model=List[ExerciseResponse])
def get_items_needing_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all exercises needing review (teachers/admins only)."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    exercises = db.query(Exercise).join(Book).filter(
        Exercise.needs_review == True,
        Book.institution_id == current_user.institution_id
    ).order_by(Exercise.ai_confidence.asc()).all()
    
    return exercises


@router.post("/exercises/{exercise_id}/review", response_model=TeacherReviewResponse)
def submit_review(
    exercise_id: int,
    review_data: TeacherReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit teacher review for an exercise."""
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Create review record
    review = TeacherReview(
        teacher_id=current_user.id,
        exercise_id=exercise_id,
        unit_id=exercise.unit_id,
        book_id=exercise.book_id,
        review_type='exercise',
        action=review_data.action,
        original_data=review_data.original_data,
        corrected_data=review_data.corrected_data,
        review_notes=review_data.review_notes,
        quality_rating=review_data.quality_rating
    )
    
    db.add(review)
    
    # Update exercise
    exercise.needs_review = False
    exercise.reviewed_by_user_id = current_user.id
    exercise.reviewed_at = datetime.utcnow()
    
    if review_data.action == 'corrected' and review_data.corrected_data:
        exercise.teacher_corrections = review_data.corrected_data
    
    db.commit()
    db.refresh(review)
    
    return review


# ============================================================================
# AI PROCESSING ENDPOINTS
# ============================================================================

@router.post("/{book_id}/process-with-ai")
def trigger_ai_processing(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger AI processing for a book (teachers/admins only).
    Useful for re-processing or processing books uploaded without AI.
    """
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.processing_status == 'processing':
        raise HTTPException(
            status_code=400,
            detail="Book is already being processed"
        )
    
    # Trigger background task
    background_tasks.add_task(process_book_with_ai_background, book_id)
    
    # Update status
    book.processing_status = 'pending'
    book.ai_processing_job_id = f"manual_trigger_{book_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    db.commit()
    
    return {
        "message": "AI processing triggered",
        "book_id": book_id,
        "job_id": book.ai_processing_job_id
    }


@router.get("/{book_id}/processing-status")
def get_processing_status(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI processing status for a book.
    Returns book status, AI logs, and statistics.
    """
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Get AI processing logs
    ai_logs = db.query(AIProcessingLog).filter(
        AIProcessingLog.book_id == book_id
    ).order_by(AIProcessingLog.created_at.desc()).all()
    
    # Get statistics
    unit_count = db.query(func.count(Unit.id)).filter(Unit.book_id == book_id).scalar()
    exercise_count = db.query(func.count(Exercise.id)).filter(Exercise.book_id == book_id).scalar()
    exercises_needing_review = db.query(func.count(Exercise.id)).filter(
        Exercise.book_id == book_id,
        Exercise.needs_review == True
    ).scalar()
    
    return {
        "book_id": book_id,
        "title": book.title,
        "processing_status": book.processing_status,
        "ai_model_used": book.ai_model_used,
        "ai_processing_cost": book.ai_processing_cost,
        "overall_confidence": book.overall_confidence,
        "needs_manual_review": book.needs_manual_review,
        "is_published": book.is_published,
        "statistics": {
            "total_units": unit_count,
            "total_exercises": exercise_count,
            "exercises_needing_review": exercises_needing_review
        },
        "ai_logs": [
            {
                "job_id": log.job_id,
                "operation_type": log.operation_type,
                "status": log.status,
                "tokens_used": log.tokens_used,
                "cost_usd": log.cost_usd,
                "confidence_score": log.confidence_score,
                "error_message": log.error_message,
                "created_at": log.created_at
            }
            for log in ai_logs
        ]
    }


@router.get("/ai-logs/{book_id}", response_model=List[AIProcessingLogResponse])
def get_ai_logs(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all AI processing logs for a book (teachers/admins only).
    """
    if not is_teacher(current_user) and not is_admin_or_higher(current_user):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.institution_id == current_user.institution_id
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    logs = db.query(AIProcessingLog).filter(
        AIProcessingLog.book_id == book_id
    ).order_by(AIProcessingLog.created_at.desc()).all()
    
    return logs


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _update_unit_progress(db: Session, student_id: int, unit_id: int, book_id: int):
    """Update unit progress based on exercise submissions."""
    progress = db.query(UnitProgress).filter(
        UnitProgress.student_id == student_id,
        UnitProgress.unit_id == unit_id
    ).first()
    
    if not progress:
        progress = UnitProgress(
            student_id=student_id,
            unit_id=unit_id,
            book_id=book_id,
            status='in_progress',
            started_at=datetime.utcnow()
        )
        db.add(progress)
    
    # Count exercises
    total_exercises = db.query(func.count(Exercise.id)).filter(
        Exercise.unit_id == unit_id
    ).scalar()
    
    # Count attempted and correct
    attempted = db.query(func.count(func.distinct(StudentAnswer.exercise_id))).filter(
        StudentAnswer.student_id == student_id,
        StudentAnswer.unit_id == unit_id
    ).scalar()
    
    correct = db.query(func.count(func.distinct(StudentAnswer.exercise_id))).filter(
        StudentAnswer.student_id == student_id,
        StudentAnswer.unit_id == unit_id,
        StudentAnswer.is_correct == True
    ).scalar()
    
    # Calculate points
    points_data = db.query(
        func.sum(StudentAnswer.points_earned),
        func.sum(StudentAnswer.points_possible)
    ).filter(
        StudentAnswer.student_id == student_id,
        StudentAnswer.unit_id == unit_id
    ).first()
    
    progress.total_exercises = total_exercises
    progress.exercises_attempted = attempted
    progress.exercises_correct = correct
    progress.total_points_earned = points_data[0] or 0.0
    progress.total_points_possible = points_data[1] or 0.0
    
    # Update completion
    if total_exercises > 0:
        progress.completion_percentage = (attempted / total_exercises) * 100
        
        if progress.completion_percentage >= 100:
            progress.status = 'completed'
            if not progress.completed_at:
                progress.completed_at = datetime.utcnow()
    
    db.commit()


def _update_book_progress(db: Session, student_id: int, book_id: int):
    """Update book progress based on unit progress."""
    progress = db.query(BookProgress).filter(
        BookProgress.student_id == student_id,
        BookProgress.book_id == book_id
    ).first()
    
    if not progress:
        progress = BookProgress(
            student_id=student_id,
            book_id=book_id,
            status='in_progress',
            started_at=datetime.utcnow()
        )
        db.add(progress)
    
    # Aggregate from unit progress
    total_units = db.query(func.count(Unit.id)).filter(Unit.book_id == book_id).scalar()
    
    units_started = db.query(func.count(UnitProgress.id)).filter(
        UnitProgress.student_id == student_id,
        UnitProgress.book_id == book_id,
        UnitProgress.status.in_(['in_progress', 'completed', 'mastered'])
    ).scalar()
    
    units_completed = db.query(func.count(UnitProgress.id)).filter(
        UnitProgress.student_id == student_id,
        UnitProgress.book_id == book_id,
        UnitProgress.status.in_(['completed', 'mastered'])
    ).scalar()
    
    # Aggregate exercises and points
    exercise_stats = db.query(
        func.sum(UnitProgress.total_exercises),
        func.sum(UnitProgress.exercises_attempted),
        func.sum(UnitProgress.exercises_correct),
        func.sum(UnitProgress.total_points_earned),
        func.sum(UnitProgress.total_points_possible),
        func.sum(UnitProgress.time_spent_seconds)
    ).filter(
        UnitProgress.student_id == student_id,
        UnitProgress.book_id == book_id
    ).first()
    
    progress.total_units = total_units
    progress.units_started = units_started
    progress.units_completed = units_completed
    progress.total_exercises = exercise_stats[0] or 0
    progress.exercises_attempted = exercise_stats[1] or 0
    progress.exercises_correct = exercise_stats[2] or 0
    progress.total_points_earned = exercise_stats[3] or 0.0
    progress.total_points_possible = exercise_stats[4] or 0.0
    progress.total_time_spent_seconds = exercise_stats[5] or 0
    
    # Update completion
    if total_units > 0:
        progress.completion_percentage = (units_completed / total_units) * 100
        
        if progress.completion_percentage >= 100:
            progress.status = 'completed'
            if not progress.completed_at:
                progress.completed_at = datetime.utcnow()
    
    progress.last_accessed_at = datetime.utcnow()
    db.commit()
