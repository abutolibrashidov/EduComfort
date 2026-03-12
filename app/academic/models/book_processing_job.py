"""
Book Processing Job Model
Tracks async processing jobs for book uploads (text extraction, OCR, etc.)
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.models.base import Base


class BookProcessingJob(Base):
    """
    Tracks async processing jobs for book content extraction
    
    Status values:
    - 'queued': Job created, waiting for worker
    - 'processing': Worker is processing the job
    - 'completed': Successfully completed
    - 'failed': Failed after max retries
    - 'cancelled': Manually cancelled
    
    Job types:
    - 'text_extraction': Direct text extraction from PDF/DOCX
    - 'ocr_tesseract': OCR using Tesseract (Phase 2)
    - 'ocr_cloud': OCR using Cloud API (Phase 6)
    """
    __tablename__ = "book_processing_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("student_books.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Job configuration
    status = Column(String(50), nullable=False, default="queued", index=True)
    job_type = Column(String(50), nullable=False)  # 'text_extraction', 'ocr_tesseract', 'ocr_cloud'
    priority = Column(Integer, default=5)  # 1=highest, 10=lowest
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Error handling
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    
    # Metadata (JSON)
    # Example: {
    #   "total_pages": 129,
    #   "pages_processed": 45,
    #   "avg_confidence": 87.5,
    #   "file_size": 49921034,
    #   "detected_type": "scanned",
    #   "text_density": 12.3
    # }
    job_metadata = Column(JSON, nullable=True, default=dict)
    
    # Celery task ID (for tracking)
    celery_task_id = Column(String(255), nullable=True, index=True)
    
    # Relationships
    book = relationship("StudentBook", back_populates="processing_jobs")
    
    def __repr__(self):
        return f"<BookProcessingJob(id={self.id}, book_id={self.book_id}, status={self.status}, type={self.job_type})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "book_id": self.book_id,
            "status": self.status,
            "job_type": self.job_type,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "error_message": self.error_message,
            "metadata": self.job_metadata or {},
            "celery_task_id": self.celery_task_id
        }
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage from metadata"""
        if not self.job_metadata:
            return 0
        
        total = self.job_metadata.get("total_pages", 0)
        processed = self.job_metadata.get("pages_processed", 0)
        
        if total == 0:
            return 0
        
        return int((processed / total) * 100)
    
    @property
    def can_retry(self):
        """Check if job can be retried"""
        return self.status == "failed" and self.retry_count < self.max_retries
