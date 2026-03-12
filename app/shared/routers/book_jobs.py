"""
Book Processing Jobs Router
API endpoints for managing async book processing jobs
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.book_processing_job import BookProcessingJob
from app.models.student_book import StudentBook
from app.tasks.book_processing import process_text_extraction, process_ocr

router = APIRouter(prefix="/book-jobs", tags=["Book Processing Jobs"])


# Schemas
class JobStatusResponse(BaseModel):
    """Response schema for job status"""
    id: int
    book_id: int
    status: str
    job_type: str
    priority: int
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    retry_count: int
    max_retries: int
    error_message: Optional[str]
    metadata: dict
    progress_percentage: int
    can_retry: bool
    
    class Config:
        from_attributes = True


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get status of a processing job
    
    Teachers can view jobs for their books
    """
    # Get job
    job = db.query(BookProcessingJob).filter(BookProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check permissions (only teacher who uploaded can view)
    book = db.query(StudentBook).filter(StudentBook.id == job.book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if current_user.role == "teacher" and book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view jobs for your own books"
        )
    
    # Convert to response
    job_dict = job.to_dict()
    job_dict['progress_percentage'] = job.progress_percentage
    job_dict['can_retry'] = job.can_retry
    
    return job_dict


@router.get("/book/{book_id}/jobs", response_model=List[JobStatusResponse])
async def get_book_jobs(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all processing jobs for a book
    
    Returns jobs in reverse chronological order (newest first)
    """
    # Get book
    book = db.query(StudentBook).filter(StudentBook.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check permissions
    if current_user.role == "teacher" and book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view jobs for your own books"
        )
    
    # Get jobs
    jobs = db.query(BookProcessingJob).filter(
        BookProcessingJob.book_id == book_id
    ).order_by(BookProcessingJob.created_at.desc()).all()
    
    # Convert to response
    result = []
    for job in jobs:
        job_dict = job.to_dict()
        job_dict['progress_percentage'] = job.progress_percentage
        job_dict['can_retry'] = job.can_retry
        result.append(job_dict)
    
    return result


@router.post("/{job_id}/retry")
async def retry_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retry a failed job
    
    Only works if job status is 'failed' and retry_count < max_retries
    """
    # Get job
    job = db.query(BookProcessingJob).filter(BookProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check permissions
    book = db.query(StudentBook).filter(StudentBook.id == job.book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if current_user.role == "teacher" and book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only retry jobs for your own books"
        )
    
    # Check if can retry
    if not job.can_retry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job cannot be retried. Status: {job.status}, Retries: {job.retry_count}/{job.max_retries}"
        )
    
    # Reset job status
    job.status = "queued"
    job.error_message = None
    job.started_at = None
    job.completed_at = None
    db.commit()
    
    # Dispatch to appropriate task
    if job.job_type == "text_extraction":
        task = process_text_extraction.delay(job.id)
    elif job.job_type in ["ocr_tesseract", "ocr_cloud"]:
        task = process_ocr.delay(job.id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown job type: {job.job_type}"
        )
    
    # Update celery task ID
    job.celery_task_id = task.id
    db.commit()
    
    return {
        "message": "Job retry initiated",
        "job_id": job.id,
        "celery_task_id": task.id,
        "status": job.status
    }


@router.delete("/{job_id}")
async def cancel_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a queued or processing job
    
    Note: This marks the job as cancelled but doesn't stop the Celery task
    """
    # Get job
    job = db.query(BookProcessingJob).filter(BookProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check permissions
    book = db.query(StudentBook).filter(StudentBook.id == job.book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if current_user.role == "teacher" and book.assigned_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel jobs for your own books"
        )
    
    # Check if can cancel
    if job.status not in ["queued", "processing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status}"
        )
    
    # Mark as cancelled
    job.status = "cancelled"
    job.completed_at = datetime.utcnow()
    db.commit()
    
    # TODO: Revoke Celery task if still running
    # from app.core.celery_app import celery_app
    # celery_app.control.revoke(job.celery_task_id, terminate=True)
    
    return {
        "message": "Job cancelled",
        "job_id": job.id
    }
