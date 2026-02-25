from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pathlib import Path

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.workbook import Workbook, WorkbookSubmission
from app.models.subject import Subject
from app.schemas.workbook import (
    WorkbookCreate,
    WorkbookUpdate,
    WorkbookResponse,
    WorkbookListResponse,
    WorkbookSubmissionResponse,
    WorkbookSubmissionListResponse,
    WorkbookSubmissionSubmit,
    WorkbookGradeSubmission,
    WorkbookGradingResponse,
    StudentWorkbookPerformance,
    WorkbookDashboardResponse,
    WorkbookSubmissionStatus,
)
from app.security.permissions import require_role
from app.utils.storage import upload_file, delete_file

router = APIRouter(prefix="/workbooks", tags=["workbooks"])

# Allowed file extensions for workbook uploads
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".pptx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ============ WORKBOOK CRUD ENDPOINTS ============

@router.post("", response_model=WorkbookResponse, status_code=status.HTTP_201_CREATED)
async def create_workbook(
    title: str = Form(...),
    subject_id: int = Form(...),
    description: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    total_tasks: int = Form(default=0),
    max_points: float = Form(default=100.0),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workbook and upload file (Teacher only)"""
    require_role(current_user, ["teacher", "admin"])

    # Validate extension before uploading
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Upload via storage abstraction (S3 in prod, local disk in dev)
    file_url = upload_file(file, folder="workbooks")
    file_name = file.filename or "unknown"
    file_type = file_ext

    # Create workbook
    workbook = Workbook(
        title=title,
        description=description,
        subject_id=subject_id,
        created_by_id=current_user.id,
        level=level,
        total_tasks=total_tasks,
        max_points=max_points,
        file_path=file_url,   # now stores the URL, not a local path
        file_name=file_name,
        file_type=file_type,
        status="draft"
    )

    db.add(workbook)
    db.commit()
    db.refresh(workbook)

    return workbook


@router.get("", response_model=List[WorkbookListResponse])
async def list_workbooks(
    subject_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workbooks (students see published, teachers/admin see all)"""
    query = db.query(Workbook)
    
    # Students only see published workbooks
    if current_user.role == "student":
        query = query.filter(Workbook.status == "published")
    
    if subject_id:
        query = query.filter(Workbook.subject_id == subject_id)
    
    if status:
        query = query.filter(Workbook.status == status)
    
    workbooks = query.order_by(Workbook.created_at.desc()).all()
    return workbooks


@router.get("/{workbook_id}", response_model=WorkbookResponse)
async def get_workbook(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workbook details"""
    workbook = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Students can only see published workbooks
    if current_user.role == "student" and workbook.status != "published":
        raise HTTPException(status_code=403, detail="You don't have access to this workbook")
    
    return workbook


@router.put("/{workbook_id}", response_model=WorkbookResponse)
async def update_workbook(
    workbook_id: int,
    update_data: WorkbookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update workbook (Creator/Admin only)"""
    require_role(current_user, ["teacher", "admin"])
    
    workbook = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check ownership
    if current_user.role == "teacher" and workbook.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own workbooks")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(workbook, key):
            setattr(workbook, key, value)
    
    workbook.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(workbook)
    
    return workbook


@router.delete("/{workbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workbook(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete workbook (Creator/Admin only)"""
    require_role(current_user, ["teacher", "admin"])

    workbook = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")

    # Check ownership
    if current_user.role == "teacher" and workbook.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own workbooks")

    # Delete the backing file via storage abstraction (handles both S3 and local disk)
    if workbook.file_path:
        delete_file(workbook.file_path)

    db.delete(workbook)
    db.commit()


# ============ WORKBOOK SUBMISSION ENDPOINTS ============

@router.post("/{workbook_id}/submit", response_model=WorkbookSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_workbook(
    workbook_id: int,
    submit_data: WorkbookSubmissionSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student submits workbook (answers/notes)"""
    require_role(current_user, ["student"])
    
    # Get workbook
    workbook = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if workbook.status != "published":
        raise HTTPException(status_code=403, detail="This workbook is not available for submission")
    
    # Check if submission already exists
    existing_submission = db.query(WorkbookSubmission).filter(
        WorkbookSubmission.workbook_id == workbook_id,
        WorkbookSubmission.student_id == current_user.id
    ).first()
    
    if existing_submission:
        # Update existing submission
        existing_submission.submission_notes = submit_data.submission_notes
        existing_submission.status = WorkbookSubmissionStatus.submitted
        existing_submission.submitted_at = datetime.utcnow()
        existing_submission.submitted_to_teacher = True
        existing_submission.teacher_notified_at = None  # Will be updated when teacher reviews
        db.commit()
        db.refresh(existing_submission)
        return existing_submission
    
    # Create new submission
    submission = WorkbookSubmission(
        workbook_id=workbook_id,
        student_id=current_user.id,
        submission_notes=submit_data.submission_notes,
        status=WorkbookSubmissionStatus.submitted,
        created_at=datetime.utcnow(),
        started_at=datetime.utcnow(),
        submitted_at=datetime.utcnow(),
        submitted_to_teacher=True,
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.get("/{workbook_id}/submissions", response_model=List[WorkbookSubmissionListResponse])
async def get_workbook_submissions(
    workbook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all submissions for a workbook (Teacher/Admin only)"""
    require_role(current_user, ["teacher", "admin"])
    
    workbook = db.query(Workbook).filter(Workbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check ownership
    if current_user.role == "teacher" and workbook.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view submissions for your own workbooks")
    
    submissions = db.query(WorkbookSubmission).filter(
        WorkbookSubmission.workbook_id == workbook_id
    ).order_by(WorkbookSubmission.submitted_at.desc()).all()
    
    return submissions


@router.get("/submissions/{submission_id}", response_model=WorkbookSubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get submission details"""
    submission = db.query(WorkbookSubmission).filter(WorkbookSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check access: student (own submission), teacher (own workbook), admin
    if current_user.role == "student" and submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")
    
    if current_user.role == "teacher":
        workbook = db.query(Workbook).filter(Workbook.id == submission.workbook_id).first()
        if workbook.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view submissions for your own workbooks")
    
    return submission


@router.put("/submissions/{submission_id}/grade", response_model=WorkbookGradingResponse)
async def grade_submission(
    submission_id: int,
    grade_data: WorkbookGradeSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Grade student submission (Teacher/Admin only)"""
    require_role(current_user, ["teacher", "admin"])
    
    submission = db.query(WorkbookSubmission).filter(WorkbookSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check ownership
    workbook = db.query(Workbook).filter(Workbook.id == submission.workbook_id).first()
    if current_user.role == "teacher" and workbook.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only grade submissions for your own workbooks")
    
    # Update submission with grade
    submission.score_obtained = grade_data.score_obtained
    submission.max_score = workbook.max_points
    submission.percentage = (grade_data.score_obtained / workbook.max_points * 100) if workbook.max_points > 0 else 0
    submission.teacher_feedback = grade_data.teacher_feedback
    submission.status = WorkbookSubmissionStatus.graded
    submission.graded_at = datetime.utcnow()
    submission.teacher_notified_at = datetime.utcnow()
    
    db.commit()
    db.refresh(submission)
    
    return WorkbookGradingResponse(
        submission_id=submission.id,
        student_id=submission.student_id,
        score_obtained=submission.score_obtained,
        max_score=submission.max_score,
        percentage=submission.percentage,
        teacher_feedback=submission.teacher_feedback,
        graded_at=submission.graded_at,
    )


# ============ STUDENT VIEWS ============

@router.get("/student/{student_id}/submissions", response_model=List[WorkbookSubmissionListResponse])
async def get_student_submissions(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's workbook submissions"""
    # Students can only view their own submissions
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")
    
    submissions = db.query(WorkbookSubmission).filter(
        WorkbookSubmission.student_id == student_id
    ).order_by(WorkbookSubmission.submitted_at.desc()).all()
    
    return submissions


@router.get("/student/{student_id}/dashboard", response_model=WorkbookDashboardResponse)
async def get_student_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get student's workbook dashboard"""
    # Students can only view their own dashboard
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own dashboard")
    
    submissions = db.query(WorkbookSubmission).filter(
        WorkbookSubmission.student_id == student_id
    ).all()
    
    total_workbooks = len(set(s.workbook_id for s in submissions))
    completed = len([s for s in submissions if s.status in ["submitted", "graded"]])
    pending = len([s for s in submissions if s.status in ["not_started", "in_progress"]])
    graded = len([s for s in submissions if s.status == "graded"])
    
    average_score = None
    graded_submissions = [s for s in submissions if s.percentage is not None]
    if graded_submissions:
        average_score = sum(s.percentage for s in graded_submissions) / len(graded_submissions)
    
    return WorkbookDashboardResponse(
        total_workbooks=total_workbooks,
        completed_workbooks=completed,
        pending_workbooks=pending,
        graded_workbooks=graded,
        average_score=average_score,
        recent_workbooks=[]
    )


# ============ TEACHER VIEWS ============

@router.get("/teacher/{teacher_id}/pending", response_model=List[WorkbookSubmissionListResponse])
async def get_teacher_pending_submissions(
    teacher_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all pending submissions for teacher's workbooks"""
    require_role(current_user, ["teacher", "admin"])
    
    # Teachers can only view their own pending submissions
    if current_user.role == "teacher" and current_user.id != teacher_id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")
    
    # Get all workbooks created by this teacher
    workbooks = db.query(Workbook).filter(Workbook.created_by_id == teacher_id).all()
    workbook_ids = [w.id for w in workbooks]
    
    if not workbook_ids:
        return []
    
    # Get pending submissions for those workbooks
    pending_submissions = db.query(WorkbookSubmission).filter(
        WorkbookSubmission.workbook_id.in_(workbook_ids),
        WorkbookSubmission.status.in_(["submitted", "in_progress"])
    ).order_by(WorkbookSubmission.submitted_at.asc()).all()
    
    return pending_submissions
