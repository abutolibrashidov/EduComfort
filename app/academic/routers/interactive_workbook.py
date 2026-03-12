"""
Interactive Workbook Router - Auto-checked exercises
"""

import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.interactive_workbook import (
    InteractiveWorkbook,
    WorkbookExercise,
    StudentExerciseSubmission,
    WorkbookProgress,
)
from app.constants.roles import Role
from app.schemas.interactive_workbook import (
    InteractiveWorkbookCreate,
    InteractiveWorkbookResponse,
    InteractiveWorkbookDetailResponse,
    WorkbookExerciseCreate,
    WorkbookExerciseResponse,
    StudentExerciseSubmissionCreate,
    StudentExerciseSubmissionResponse,
    WorkbookProgressResponse,
    WorkbookDashboardResponse,
)
from app.utils.exercise_validator import ExerciseValidator, PDFExtractor

router = APIRouter(prefix="/interactive-workbooks", tags=["Interactive Workbooks"])


# ==================== WORKBOOK MANAGEMENT ====================

@router.post("", response_model=InteractiveWorkbookResponse, status_code=201)
def create_workbook(
    workbook: InteractiveWorkbookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new interactive workbook (Teacher/Admin only)"""
    
    if current_user.role not in [Role.TEACHER, Role.ADMIN]:
        raise HTTPException(status_code=403, detail="Only teachers can create workbooks")
    
    new_workbook = InteractiveWorkbook(
        title=workbook.title,
        description=workbook.description,
        subject_id=workbook.subject_id,
        created_by_id=current_user.id,
        level=workbook.level,
        difficulty_level=workbook.difficulty_level,
    )
    
    db.add(new_workbook)
    db.commit()
    db.refresh(new_workbook)
    
    return new_workbook


@router.get("", response_model=List[InteractiveWorkbookResponse])
def list_workbooks(
    subject_id: int = None,
    status: str = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workbooks (optionally filter by subject/status)"""
    
    query = db.query(InteractiveWorkbook)
    
    if subject_id:
        query = query.filter(InteractiveWorkbook.subject_id == subject_id)
    if status:
        query = query.filter(InteractiveWorkbook.status == status)
    
    # Non-admin users see only published workbooks
    if current_user.role != Role.ADMIN:
        query = query.filter(InteractiveWorkbook.status == "published")
    
    return query.offset(skip).limit(limit).all()


@router.get("/{workbook_id}", response_model=InteractiveWorkbookDetailResponse)
def get_workbook(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workbook with all exercises"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check permission
    if workbook.status != "published" and current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view this workbook")
    
    return workbook


@router.put("/{workbook_id}", response_model=InteractiveWorkbookResponse)
def update_workbook(
    workbook_id: int,
    title: str = Form(None),
    description: str = Form(None),
    status: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update workbook (Teacher/Admin only)"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this workbook")
    
    if title:
        workbook.title = title
    if description:
        workbook.description = description
    if status:
        workbook.status = status
        if status == "published":
            workbook.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(workbook)
    return workbook


@router.post("/{workbook_id}/upload", response_model=InteractiveWorkbookResponse)
async def upload_workbook_file(
    workbook_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload PDF/DOCX file to workbook"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save file
    upload_dir = "uploads/workbooks"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_name = f"{workbook_id}_{file.filename}"
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    workbook.file_name = file.filename
    workbook.file_type = file.filename.split(".")[-1]
    workbook.file_path = file_path
    
    # Extract text from file
    if workbook.file_type == "pdf":
        extracted_text, page_count = PDFExtractor.extract_text_from_pdf(file_path)
    elif workbook.file_type == "docx":
        extracted_text, page_count = PDFExtractor.extract_text_from_docx(file_path)
    else:
        with open(file_path, "r", encoding="utf-8") as f:
            extracted_text = f.read()
    
    # Store extracted text as metadata (optional)
    workbook.extracted_text = extracted_text
    
    # Auto-generate exercises from text
    exercises_rs = PDFExtractor.parse_exercises_from_text(extracted_text)
    
    for ex_data in exercises_rs:
        new_exercise = WorkbookExercise(
            workbook_id=workbook.id,
            exercise_number=ex_data["exercise_number"],
            exercise_type=ex_data["exercise_type"],
            exercise_text=ex_data["exercise_text"],
            instructions=ex_data["instructions"],
            correct_answer=ex_data["correct_answer"],
            points=ex_data["points"]
        )
        db.add(new_exercise)
        
    db.commit()
    db.refresh(workbook)
    
    # Update total exercise count
    workbook.total_exercises = len(exercises_rs)
    db.commit()
    
    return workbook


# ==================== EXERCISE MANAGEMENT ====================

@router.post("/{workbook_id}/exercises", response_model=WorkbookExerciseResponse, status_code=201)
def create_exercise(
    workbook_id: int,
    exercise: WorkbookExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an exercise to workbook (Teacher/Admin only)"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_exercise = WorkbookExercise(
        workbook_id=workbook_id,
        exercise_number=exercise.exercise_number,
        exercise_type=exercise.exercise_type,
        exercise_text=exercise.exercise_text,
        instructions=exercise.instructions,
        options=exercise.options,
        correct_answer=exercise.correct_answer,
        correct_answers_list=exercise.correct_answers_list,
        case_sensitive=exercise.case_sensitive,
        accept_partial=exercise.accept_partial,
        points=exercise.points,
    )
    
    db.add(new_exercise)
    workbook.total_exercises = len(workbook.exercises) + 1
    db.commit()
    db.refresh(new_exercise)
    
    return new_exercise


@router.get("/{workbook_id}/exercises", response_model=List[WorkbookExerciseResponse])
def list_exercises(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all exercises in workbook"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    return db.query(WorkbookExercise).filter(WorkbookExercise.workbook_id == workbook_id).all()


@router.put("/exercises/{exercise_id}", response_model=WorkbookExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise: WorkbookExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an exercise"""
    
    db_exercise = db.query(WorkbookExercise).filter(WorkbookExercise.id == exercise_id).first()
    if not db_exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == db_exercise.workbook_id).first()
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_exercise.exercise_text = exercise.exercise_text
    db_exercise.correct_answer = exercise.correct_answer
    db_exercise.correct_answers_list = exercise.correct_answers_list
    db_exercise.points = exercise.points
    
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


# ==================== STUDENT SUBMISSIONS (AUTO-CHECKING) ====================

@router.post("/{workbook_id}/exercises/{exercise_id}/submit", response_model=StudentExerciseSubmissionResponse, status_code=201)
def submit_exercise_answer(
    workbook_id: int,
    exercise_id: int,
    submission: StudentExerciseSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits answer to exercise - AUTO-CHECKED"""
    
    if current_user.role != Role.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit exercises")
    
    exercise = db.query(WorkbookExercise).filter(WorkbookExercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Auto-check the answer
    is_correct, feedback = ExerciseValidator.validate_answer(
        student_answer=submission.student_answer,
        correct_answer=exercise.correct_answer,
        exercise_type=exercise.exercise_type,
        case_sensitive=exercise.case_sensitive,
        accept_partial=exercise.accept_partial,
        alternative_answers=exercise.correct_answers_list,
    )
    
    # Calculate points
    points_earned = exercise.points if is_correct else 0.0
    
    # Create submission record
    new_submission = StudentExerciseSubmission(
        workbook_id=workbook_id,
        exercise_id=exercise_id,
        student_id=current_user.id,
        student_answer=submission.student_answer,
        is_correct=is_correct,
        points_earned=points_earned,
        feedback=feedback,
    )
    
    db.add(new_submission)
    
    # Update progress
    progress = db.query(WorkbookProgress).filter(
        (WorkbookProgress.workbook_id == workbook_id) & (WorkbookProgress.student_id == current_user.id)
    ).first()
    
    if not progress:
        progress = WorkbookProgress(
            workbook_id=workbook_id,
            student_id=current_user.id,
            total_exercises=len(db.query(WorkbookExercise).filter(WorkbookExercise.workbook_id == workbook_id).all()),
        )
        db.add(progress)
    
    progress.exercises_completed += 1
    if is_correct:
        progress.exercises_correct += 1
    progress.points_earned += points_earned
    progress.completion_percentage = (progress.exercises_completed / progress.total_exercises) * 100
    
    db.commit()
    db.refresh(new_submission)
    
    return new_submission


@router.get("/{workbook_id}/my-submissions", response_model=List[StudentExerciseSubmissionResponse])
def get_my_submissions(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all my submissions for a workbook"""
    
    return db.query(StudentExerciseSubmission).filter(
        (StudentExerciseSubmission.workbook_id == workbook_id) & (StudentExerciseSubmission.student_id == current_user.id)
    ).all()


# ==================== PROGRESS TRACKING ====================

@router.get("/{workbook_id}/my-progress", response_model=WorkbookProgressResponse)
def get_my_progress(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's progress in workbook"""
    
    progress = db.query(WorkbookProgress).filter(
        (WorkbookProgress.workbook_id == workbook_id) & (WorkbookProgress.student_id == current_user.id)
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="No progress found")
    
    return progress


@router.get("/{workbook_id}/dashboard", response_model=WorkbookDashboardResponse)
def get_workbook_dashboard(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complete dashboard for student (workbook + exercises + progress)"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    progress = db.query(WorkbookProgress).filter(
        (WorkbookProgress.workbook_id == workbook_id) & (WorkbookProgress.student_id == current_user.id)
    ).first()
    
    exercises = db.query(WorkbookExercise).filter(WorkbookExercise.workbook_id == workbook_id).all()
    
    submissions = db.query(StudentExerciseSubmission).filter(
        (StudentExerciseSubmission.workbook_id == workbook_id) & (StudentExerciseSubmission.student_id == current_user.id)
    ).all()
    
    submissions_dict = {sub.exercise_id: sub for sub in submissions}
    
    return WorkbookDashboardResponse(
        workbook=workbook,
        progress=progress,
        exercises=exercises,
        student_submissions=submissions_dict,
    )


@router.get("/{workbook_id}/all-submissions", response_model=List[StudentExerciseSubmissionResponse])
def get_all_submissions(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all submissions for workbook (Teacher/Admin only)"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(StudentExerciseSubmission).filter(StudentExerciseSubmission.workbook_id == workbook_id).all()


# ==================== STATISTICS ====================

@router.get("/{workbook_id}/statistics")
def get_workbook_statistics(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get statistics about workbook performance (Teacher/Admin only)"""
    
    workbook = db.query(InteractiveWorkbook).filter(InteractiveWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if current_user.id != workbook.created_by_id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = db.query(StudentExerciseSubmission).filter(StudentExerciseSubmission.workbook_id == workbook_id).all()
    
    total_submissions = len(submissions)
    correct_answers = len([s for s in submissions if s.is_correct])
    average_score = sum([s.points_earned for s in submissions]) / total_submissions if total_submissions > 0 else 0
    
    return {
        "workbook_id": workbook_id,
        "total_submissions": total_submissions,
        "correct_answers": correct_answers,
        "incorrect_answers": total_submissions - correct_answers,
        "success_rate": (correct_answers / total_submissions * 100) if total_submissions > 0 else 0,
        "average_score": average_score,
    }
