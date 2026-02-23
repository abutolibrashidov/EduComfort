"""
Background Tasks for AI-Powered Book Processing
Orchestrates the full AI processing pipeline: text extraction → unit segmentation → exercise generation
"""
import logging
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.interactive_book import (
    Book, Unit, Exercise, AIProcessingLog
)
from app.services.ai_service import create_ai_service
from app.utils.book_content_extractor import BookContentExtractor
# from app.utils.ocr_processor import OCRProcessor

logger = logging.getLogger(__name__)


def process_book_with_ai(book_id: int) -> dict:
    """
    Main orchestration function for AI-powered book processing.
    
    This function:
    1. Extracts text from the book file (PDF/DOCX or OCR)
    2. Uses AI to segment the book into units
    3. Uses AI to generate exercises for each unit
    4. Saves everything to the database
    5. Updates processing status and logs
    
    Args:
        book_id: ID of the book to process
    
    Returns:
        dict with processing results and statistics
    """
    db = SessionLocal()
    
    try:
        # Get book record
        book = db.query(Book).filter(Book.id == book_id).first()
        
        if not book:
            logger.error(f"Book {book_id} not found")
            return {"error": "Book not found"}

        # CHECK CREDITS
        if not _check_and_deduct_credits(db, book.institution_id):
             logger.error(f"Institution {book.institution_id} has insufficient AI credits.")
             book.processing_status = 'failed'
             book.needs_manual_review = True
             # Log failure
             ai_log = AIProcessingLog(
                book_id=book_id,
                job_id=f"ai_book_{book_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                operation_type='check_credits',
                ai_model='system',
                status='failed',
                error_message="Insufficient AI credits. Please top up your balance.",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
             db.add(ai_log)
             db.commit()
             return {"error": "Insufficient AI credits"}
        
        logger.info(f"Starting AI processing for book: {book.title} (ID: {book_id})")
        
        # Update status
        book.processing_status = 'processing'
        db.commit()
        
        # Create initial AI log
        ai_log = AIProcessingLog(
            book_id=book_id,
            job_id=f"ai_book_{book_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            operation_type='full_extraction',
            ai_model='gpt-4',
            status='processing',
            started_at=datetime.utcnow()
        )
        db.add(ai_log)
        db.commit()
        
        # Step 1: Extract text from book
        logger.info("Step 1: Extracting text from book file")
        book_text, total_pages = _extract_book_text(book, db)
        
        if not book_text:
            _handle_processing_failure(
                db, book, ai_log,
                "Failed to extract text from book",
                needs_review=True
            )
            return {"error": "Text extraction failed"}
        
        logger.info(f"Text extracted: {len(book_text)} characters, {total_pages} pages")
        
        # Update book metadata
        book.total_pages = total_pages
        db.commit()
        
        # Step 2: Segment book into units using AI
        logger.info("Step 2: Segmenting book into units with AI")
        ai_service = create_ai_service()
        
        unit_result, unit_metadata = ai_service.segment_book_into_units(
            book_text=book_text,
            total_pages=total_pages,
            book_title=book.title
        )
        
        if not unit_result:
            _handle_processing_failure(
                db, book, ai_log,
                f"Unit segmentation failed: {unit_metadata.get('error', 'Unknown error')}",
                needs_review=True
            )
            return {"error": "Unit segmentation failed", "details": unit_metadata}
        
        logger.info(f"Units detected: {unit_result.total_units}")
        
        # Track tokens and cost
        total_tokens = unit_metadata.get('tokens_used', 0)
        total_cost = unit_metadata.get('cost_usd', 0.0)
        
        # Step 3: Create unit records
        logger.info("Step 3: Creating unit records in database")
        created_units = []
        
        for detected_unit in unit_result.units:
            # Extract unit text from book text (approximate)
            unit_text = _extract_unit_text(
                book_text, 
                detected_unit.start_page, 
                detected_unit.end_page,
                total_pages
            )
            
            # Create unit record
            unit = Unit(
                book_id=book_id,
                unit_number=detected_unit.unit_number,
                title=detected_unit.title,
                description=detected_unit.description,
                start_page=detected_unit.start_page,
                end_page=detected_unit.end_page,
                learning_objectives=detected_unit.learning_objectives,
                content_text=unit_text[:50000],  # Limit storage
                ai_confidence=unit_result.confidence,
                ai_generated=True,
                extraction_method='ai_detected',
                needs_review=(unit_result.confidence < 70)  # Flag low confidence
            )
            
            db.add(unit)
            db.flush()  # Get unit.id
            created_units.append(unit)
            
            logger.info(f"Created unit {unit.unit_number}: {unit.title}")
        
        db.commit()
        
        # Step 4: Generate exercises for each unit
        logger.info("Step 4: Generating exercises for each unit")
        total_exercises = 0
        
        for unit in created_units:
            logger.info(f"Generating exercises for unit {unit.unit_number}: {unit.title}")
            
            exercise_result, exercise_metadata = ai_service.generate_exercises_for_unit(
                unit_text=unit.content_text or "",
                unit_title=unit.title,
                unit_number=unit.unit_number,
                target_count=8
            )
            
            if not exercise_result:
                logger.warning(f"Exercise generation failed for unit {unit.unit_number}: {exercise_metadata}")
                unit.needs_review = True
                continue
            
            # Track tokens and cost
            total_tokens += exercise_metadata.get('tokens_used', 0)
            total_cost += exercise_metadata.get('cost_usd', 0.0)
            
            # Create exercise records
            for idx, generated_ex in enumerate(exercise_result.exercises):
                exercise = Exercise(
                    unit_id=unit.id,
                    book_id=book_id,
                    exercise_number=generated_ex.exercise_number,
                    sequence_order=idx + 1,
                    exercise_type=generated_ex.exercise_type,
                    question_text=generated_ex.question_text,
                    instructions=generated_ex.instructions,
                    options=generated_ex.options,
                    correct_answer=generated_ex.correct_answer,
                    explanation=generated_ex.explanation,
                    hints=generated_ex.hints,
                    difficulty_level=generated_ex.difficulty_level,
                    estimated_time_seconds=generated_ex.estimated_time_seconds,
                    points=1.0,
                    auto_gradable=(generated_ex.exercise_type in ['multiple_choice', 'true_false']),
                    requires_teacher_grading=(generated_ex.exercise_type in ['short_answer', 'essay']),
                    ai_confidence=exercise_result.confidence,
                    ai_generated=True,
                    extraction_source='ai_generated',
                    needs_review=True,  # Always flag AI exercises for teacher review
                    source_page_number=unit.start_page
                )
                
                db.add(exercise)
                total_exercises += 1
            
            logger.info(f"Created {len(exercise_result.exercises)} exercises for unit {unit.unit_number}")
        
        db.commit()
        
        # Step 5: Update book and AI log with final status
        logger.info("Step 5: Finalizing processing")
        
        book.processing_status = 'completed'
        book.ai_model_used = ai_service.model
        book.ai_processing_cost = total_cost
        book.overall_confidence = unit_result.confidence
        book.ai_processed_at = datetime.utcnow()
        book.needs_manual_review = True  # Always require teacher review
        
        ai_log.status = 'success'
        ai_log.tokens_used = total_tokens
        ai_log.cost_usd = total_cost
        ai_log.confidence_score = unit_result.confidence
        ai_log.completed_at = datetime.utcnow()
        ai_log.output_data = {
            "units_created": len(created_units),
            "exercises_created": total_exercises,
            "average_confidence": unit_result.confidence
        }
        
        db.commit()
        
        logger.info(f"✅ AI processing completed successfully for book {book_id}")
        logger.info(f"   - Units created: {len(created_units)}")
        logger.info(f"   - Exercises created: {total_exercises}")
        logger.info(f"   - Tokens used: {total_tokens}")
        logger.info(f"   - Cost: ${total_cost:.4f}")
        
        # DEDUCT CREDITS
        _deduct_final_cost(db, book.institution_id, total_cost)
        
        return {
            "success": True,
            "book_id": book_id,
            "units_created": len(created_units),
            "exercises_created": total_exercises,
            "tokens_used": total_tokens,
            "cost_usd": total_cost,
            "confidence": unit_result.confidence
        }
        
    except Exception as e:
        logger.error(f"❌ AI processing failed for book {book_id}: {e}", exc_info=True)
        
        # Update book and log with error
        if 'book' in locals() and book:
            _handle_processing_failure(
                db, book, ai_log if 'ai_log' in locals() else None,
                str(e),
                needs_review=True
            )
        
        return {"error": str(e)}
    
    finally:
        # Finalize transaction to ensure balance updates are saved
        try:
            # Re-fetch institution to deduct credits if successful
            if 'book' in locals() and book and 'total_cost' in locals() and total_cost > 0:
                 # We need to use a fresh transaction or ensure the current one is valid
                 # Since we might have committed/closed, let's reopen for the deduction if needed
                 # However, in this function structure, db is closed in finally.
                 # Let's do the deduction right before the final commit in the main block.
                 pass 
        except Exception:
            pass
        db.close()

def _check_and_deduct_credits(db: Session, institution_id: int, estimated_cost: float = 0.0) -> bool:
    """
    Check if institution has enough credits. 
    Note: Real deduction happens after processing to be accurate.
    """
    from app.models.institution import Institution
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        return False
    
    # Simple check: must have positive balance
    return inst.ai_credits_balance > 0

def _deduct_final_cost(db: Session, institution_id: int, cost: float):
    """Deduct final cost from institution balance."""
    from app.models.institution import Institution
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if inst and cost > 0:
        inst.ai_credits_balance -= cost
        db.add(inst)
        db.commit()
        logger.info(f"Deducted ${cost:.4f} from Institution {institution_id}. New Balance: ${inst.ai_credits_balance:.4f}")



# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _extract_book_text(book: Book, db: Session) -> tuple[Optional[str], int]:
    """
    Extract text from book file (PDF/DOCX or OCR).
    
    Returns:
        Tuple of (text, total_pages)
    """
    try:
        # Try direct text extraction first
        extractor = BookContentExtractor(book.file_path)
        content = extractor.extract()
        
        # Check if scanned (needs OCR)
        if content.get('is_scanned', False):
            # logger.info("Book is scanned, using OCR")
            # from app.utils.ocr_processor import OCRProcessor
            # ocr_processor = OCRProcessor()
            # ocr_result = ocr_processor.process_pdf(book.file_path)
            
            # if ocr_result and ocr_result.get('success'):
            #     # Combine all page text
            #     full_text = "\n\n".join([
            #         page.get('cleaned_text', '') 
            #         for page in ocr_result.get('pages', [])
            #     ])
            #     return full_text, ocr_result.get('total_pages', 0)
            logger.warning("Book detected as scanned, but OCR is disabled in this environment to prevent memory errors.")
        
        # Use direct extraction
        return content.get('full_text', ''), content.get('total_pages', 0)
        
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        return None, 0


def _extract_unit_text(
    full_text: str, 
    start_page: int, 
    end_page: int,
    total_pages: int
) -> str:
    """
    Extract text for a specific unit based on page range.
    This is an approximation since we don't have exact page boundaries.
    """
    # Calculate approximate character positions
    chars_per_page = len(full_text) / total_pages if total_pages > 0 else 0
    
    start_char = int((start_page - 1) * chars_per_page)
    end_char = int(end_page * chars_per_page)
    
    # Extract text slice
    unit_text = full_text[start_char:end_char]
    
    return unit_text


def _handle_processing_failure(
    db: Session,
    book: Book,
    ai_log: Optional[AIProcessingLog],
    error_message: str,
    needs_review: bool = True
):
    """Handle processing failure by updating book and log status."""
    try:
        book.processing_status = 'failed' if not needs_review else 'needs_review'
        book.needs_manual_review = needs_review
        
        if ai_log:
            ai_log.status = 'failed'
            ai_log.error_message = error_message
            ai_log.completed_at = datetime.utcnow()
        
        db.commit()
        logger.error(f"Processing failed: {error_message}")
        
    except Exception as e:
        logger.error(f"Failed to update error status: {e}")
        db.rollback()


# ============================================================================
# FASTAPI BACKGROUND TASK WRAPPER
# ============================================================================

def process_book_with_ai_background(book_id: int):
    """
    Wrapper for FastAPI BackgroundTasks.
    Can also be used as a Celery task by adding @celery_app.task decorator.
    
    Usage in FastAPI:
        background_tasks.add_task(process_book_with_ai_background, book_id)
    """
    try:
        result = process_book_with_ai(book_id)
        logger.info(f"Background task completed for book {book_id}: {result}")
    except Exception as e:
        logger.error(f"Background task failed for book {book_id}: {e}", exc_info=True)
