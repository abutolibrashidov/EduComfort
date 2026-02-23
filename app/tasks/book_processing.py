"""
Celery Tasks for Book Processing
Handles async text extraction and OCR processing
"""
import logging
from datetime import datetime
from typing import Dict, Any

from celery import Task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.book_processing_job import BookProcessingJob
from app.models.student_book import StudentBook
from app.models.book_content import BookContent
from app.utils.book_content_extractor import extract_book_content

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """
    Base task class that provides database session management
    """
    _db: Session = None
    
    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, *args, **kwargs):
        """Close database session after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.tasks.book_processing.process_text_extraction",
    max_retries=3,
    default_retry_delay=60
)
def process_text_extraction(self, job_id: int) -> Dict[str, Any]:
    """
    Process text-based book extraction (PDF/DOCX with selectable text)
    
    Args:
        job_id: BookProcessingJob ID
        
    Returns:
        Dictionary with processing results
    """
    db = self.db
    job = None
    
    try:
        # Get job from database
        job = db.query(BookProcessingJob).filter(BookProcessingJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return {"status": "error", "message": "Job not found"}
        
        # Update job status
        job.status = "processing"
        job.started_at = datetime.utcnow()
        job.celery_task_id = self.request.id
        db.commit()
        
        logger.info(f"Starting text extraction for job {job_id}, book {job.book_id}")
        
        # Get book
        book = db.query(StudentBook).filter(StudentBook.id == job.book_id).first()
        if not book:
            raise Exception(f"Book {job.book_id} not found")
        
        # Extract content using existing extractor
        logger.info(f"Extracting content from {book.file_path}")
        content_data = extract_book_content(book.file_path)
        
        # Save extracted content to database
        total_pages = content_data.get('total_pages', 0)
        chapters = content_data.get('chapters', [])
        is_scanned = content_data.get('is_scanned', False)
        
        logger.info(f"Extracted {total_pages} pages, {len(chapters)} chapters")
        
        # Save chapters and pages
        pages_saved = 0
        for chapter in chapters:
            chapter_num = chapter.get('chapter_number', 1)
            chapter_title = chapter.get('title', 'Untitled')
            
            for page_data in chapter.get('pages', []):
                page_num = page_data.get('page_number')
                page_content = page_data.get('content', '')
                exercises = page_data.get('exercises', [])
                
                # Check if page already exists
                existing_page = db.query(BookContent).filter(
                    BookContent.book_id == book.id,
                    BookContent.page_number == page_num
                ).first()
                
                if existing_page:
                    # Update existing
                    existing_page.page_content = page_content
                    existing_page.chapter_number = chapter_num
                    existing_page.chapter_title = chapter_title
                    existing_page.exercises = str(exercises) if exercises else None
                    existing_page.processing_method = 'text_extraction'
                    existing_page.ocr_confidence = 100.0  # Text extraction has 100% confidence
                else:
                    # Create new
                    new_page = BookContent(
                        book_id=book.id,
                        page_number=page_num,
                        chapter_number=chapter_num,
                        chapter_title=chapter_title,
                        page_content=page_content,
                        exercises=str(exercises) if exercises else None,
                        processing_method='text_extraction',
                        ocr_confidence=100.0
                    )
                    db.add(new_page)
                
                pages_saved += 1
                
                # Update job progress
                job.job_metadata = job.job_metadata or {}
                job.job_metadata['pages_processed'] = pages_saved
                job.job_metadata['total_pages'] = total_pages
                db.commit()
        
        # Mark job as completed
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.job_metadata = job.job_metadata or {}
        job.job_metadata.update({
            'total_pages': total_pages,
            'pages_processed': pages_saved,
            'chapters_found': len(chapters),
            'is_scanned': is_scanned,
            'processing_method': 'text_extraction'
        })
        db.commit()
        
        logger.info(f"Text extraction completed for job {job_id}")
        
        return {
            "status": "completed",
            "job_id": job_id,
            "book_id": job.book_id,
            "pages_processed": pages_saved,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.retry_count += 1
            db.commit()
            
            # Retry if under max retries
            if job.retry_count < job.max_retries:
                logger.info(f"Retrying job {job_id} (attempt {job.retry_count + 1}/{job.max_retries})")
                raise self.retry(exc=e, countdown=60 * job.retry_count)  # Exponential backoff
        
        return {
            "status": "error",
            "job_id": job_id,
            "error": str(e)
        }


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.tasks.book_processing.process_ocr",
    max_retries=3,
    default_retry_delay=60
)
def process_ocr(self, job_id: int) -> Dict[str, Any]:
    """
    Process OCR for scanned books using Tesseract
    
    Args:
        job_id: BookProcessingJob ID
        
    Returns:
        Dictionary with processing results
    """
    import os
    from app.utils.ocr_processor import OCRProcessor
    from app.utils.advanced_content_analyzer import AdvancedContentAnalyzer
    
    db = self.db
    job = None
    
    try:
        # Get job from database
        job = db.query(BookProcessingJob).filter(BookProcessingJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return {"status": "error", "message": "Job not found"}
        
        # Update job status
        job.status = "processing"
        job.started_at = datetime.utcnow()
        job.celery_task_id = self.request.id
        db.commit()
        
        logger.info(f"Starting OCR processing for job {job_id}, book {job.book_id}")
        
        # Get book
        book = db.query(StudentBook).filter(StudentBook.id == job.book_id).first()
        if not book:
            raise Exception(f"Book {job.book_id} not found")
        
        # Initialize OCR processor
        ocr_processor = OCRProcessor()
        
        # Create output directory for OCR results
        ocr_output_dir = os.path.join("uploads", "books", str(book.id), "ocr")
        os.makedirs(ocr_output_dir, exist_ok=True)
        
        # Process PDF with OCR (parallel processing)
        logger.info(f"Processing PDF with OCR: {book.file_path}")
        ocr_results = ocr_processor.process_pdf_parallel(
            book.file_path,
            max_workers=4  # Process 4 pages in parallel
        )
        
        # Save OCR results to files
        ocr_processor.save_ocr_results(ocr_results, ocr_output_dir)
        
        # Initialize content analyzer for exercise extraction
        analyzer = AdvancedContentAnalyzer()
        
        # Process each page and save to database
        total_pages = len(ocr_results)
        pages_saved = 0
        total_confidence = 0
        low_confidence_pages = 0
        
        for result in ocr_results:
            page_num = result['page_number']
            cleaned_text = result['cleaned_text']
            confidence = result['confidence']
            needs_review = result['needs_review']
            
            # Extract exercises from cleaned text using full document analysis
            exercises = []
            if cleaned_text and len(cleaned_text) > 50:
                try:
                    # Use analyzer to detect ALL exercises/questions on the page
                    analyzed_content = analyzer.analyze_document(cleaned_text, filename=f"page_{page_num}")
                    
                    # Convert detected questions to exercise format
                    for question in analyzed_content.questions:
                        exercise_data = {
                            "exercise_number": question.id,
                            "exercise_type": question.type.value if hasattr(question.type, 'value') else str(question.type),
                            "text": question.question_text,
                            "correct_answer": question.correct_answer,
                            "page_number": page_num
                        }
                        
                        # Add type-specific data
                        if question.options:
                            exercise_data["options"] = {chr(65 + i): opt for i, opt in enumerate(question.options)}
                        if question.gaps:
                            exercise_data["gaps"] = question.gaps
                        if question.explanation:
                            exercise_data["explanation"] = question.explanation
                            
                        exercises.append(exercise_data)
                    
                    if exercises:
                        logger.info(f"Detected {len(exercises)} exercises on page {page_num}")
                except Exception as e:
                    logger.warning(f"Failed to analyze exercises on page {page_num}: {e}")
            
            # Check if page already exists
            existing_page = db.query(BookContent).filter(
                BookContent.book_id == book.id,
                BookContent.page_number == page_num
            ).first()
            
            if existing_page:
                # Update existing
                existing_page.page_content = cleaned_text
                existing_page.exercises = str(exercises) if exercises else None
                existing_page.processing_method = 'ocr_tesseract'
                existing_page.ocr_confidence = confidence
                existing_page.needs_review = needs_review
            else:
                # Create new
                new_page = BookContent(
                    book_id=book.id,
                    page_number=page_num,
                    chapter_number=1,  # Default chapter (can be improved)
                    chapter_title="Chapter 1",
                    page_content=cleaned_text,
                    exercises=str(exercises) if exercises else None,
                    processing_method='ocr_tesseract',
                    ocr_confidence=confidence,
                    needs_review=needs_review
                )
                db.add(new_page)
            
            pages_saved += 1
            total_confidence += confidence
            if needs_review:
                low_confidence_pages += 1
            
            # Update job progress
            job.job_metadata = job.job_metadata or {}
            job.job_metadata['pages_processed'] = pages_saved
            job.job_metadata['total_pages'] = total_pages
            job.job_metadata['avg_confidence'] = round(total_confidence / pages_saved, 2)
            job.job_metadata['low_confidence_pages'] = low_confidence_pages
            db.commit()
            
            logger.info(f"Processed page {page_num}/{total_pages} (confidence: {confidence:.1f}%)")
        
        # Calculate final statistics
        avg_confidence = total_confidence / total_pages if total_pages > 0 else 0
        
        # Mark job as completed
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.job_metadata = job.job_metadata or {}
        job.job_metadata.update({
            'total_pages': total_pages,
            'pages_processed': pages_saved,
            'avg_confidence': round(avg_confidence, 2),
            'low_confidence_pages': low_confidence_pages,
            'processing_method': 'ocr_tesseract',
            'ocr_output_dir': ocr_output_dir
        })
        db.commit()
        
        logger.info(f"OCR processing completed for job {job_id}")
        logger.info(f"Average confidence: {avg_confidence:.1f}%, Low confidence pages: {low_confidence_pages}/{total_pages}")
        
        return {
            "status": "completed",
            "job_id": job_id,
            "book_id": job.book_id,
            "pages_processed": pages_saved,
            "total_pages": total_pages,
            "avg_confidence": round(avg_confidence, 2),
            "low_confidence_pages": low_confidence_pages
        }
        
    except Exception as e:
        logger.error(f"Error in OCR processing job {job_id}: {e}", exc_info=True)
        
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.retry_count += 1
            db.commit()
            
            # Retry if under max retries
            if job.retry_count < job.max_retries:
                logger.info(f"Retrying OCR job {job_id} (attempt {job.retry_count + 1}/{job.max_retries})")
                raise self.retry(exc=e, countdown=60 * job.retry_count)  # Exponential backoff
        
        return {
            "status": "error",
            "job_id": job_id,
            "error": str(e)
        }



@celery_app.task(name="app.tasks.book_processing.cleanup_old_jobs")
def cleanup_old_jobs(days: int = 7) -> Dict[str, Any]:
    """
    Cleanup completed/failed jobs older than N days
    
    Args:
        days: Number of days to keep jobs
        
    Returns:
        Dictionary with cleanup results
    """
    db = SessionLocal()
    
    try:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Delete old completed/failed jobs
        deleted = db.query(BookProcessingJob).filter(
            BookProcessingJob.status.in_(['completed', 'failed']),
            BookProcessingJob.completed_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Cleaned up {deleted} old jobs")
        
        return {
            "status": "success",
            "jobs_deleted": deleted,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up jobs: {e}")
        db.rollback()
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()
