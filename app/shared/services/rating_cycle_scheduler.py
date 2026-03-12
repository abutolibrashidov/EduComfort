import logging
from datetime import datetime, timedelta
from pytz import utc
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import func
from app.core.database import SessionLocal
from app.engagement.models.rating import TeacherRating, RatingCycle, TeacherAward
from app.core.models.user import User

logger = logging.getLogger(__name__)

# Constants for cycle duration
CYCLE_DAYS = 14

def process_teacher_ratings():
    """
    Function that runs periodically to evaluate teacher ratings,
    create a new RatingCycle, and award the top teacher(s).
    """
    logger.info("Starting teacher rating cycle process...")
    db = SessionLocal()
    try:
        now = datetime.now(utc)
        
        # Determine the start date of this cycle
        # E.g., looking at the last 14 days
        start_date = now - timedelta(days=CYCLE_DAYS)
        
        # Check if we already processed a cycle very recently to avoid duplicates if restarted
        last_cycle = db.query(RatingCycle).order_by(RatingCycle.end_date.desc()).first()
        if last_cycle and (now - last_cycle.end_date).days < (CYCLE_DAYS - 1):
            logger.info("A rating cycle was already processed recently. Skipping.")
            return

        # Create new rating cycle record
        new_cycle = RatingCycle(
            start_date=start_date,
            end_date=now,
            is_processed=1
        )
        db.add(new_cycle)
        db.flush() # To get the cycle ID

        # Find the top teacher(s) in this period
        # Calculate average rating for each teacher within the cycle period
        ratings = db.query(
            TeacherRating.teacher_id,
            func.avg(TeacherRating.rating).label('average_rating'),
            func.count(TeacherRating.id).label('rating_count')
        ).filter(
            TeacherRating.created_at >= start_date,
            TeacherRating.created_at <= now
        ).group_by(TeacherRating.teacher_id).all()

        if not ratings:
            logger.info("No ratings found during this cycle. Skipping awards.")
            db.commit()
            return

        # Find the highest average rating (with at least a minimum number of ratings, e.g., 3)
        # For this implementation, we just take the max average rating.
        best_avg = max(r.average_rating for r in ratings)
        
        top_teachers = [r for r in ratings if r.average_rating == best_avg]

        # Award the top teachers
        for top_t in top_teachers:
            teacher = db.query(User).filter(User.id == top_t.teacher_id).first()
            if teacher:
                logger.info(f"Awarding teacher: {teacher.first_name} {teacher.last_name} with avg score {top_t.average_rating}")
                
                # Generate a dummy certificate URL or build an actual generation routine
                cert_url = f"/uploads/certificates/teacher_{teacher.id}_cycle_{new_cycle.id}.pdf"
                
                award = TeacherAward(
                    teacher_id=teacher.id,
                    cycle_id=new_cycle.id,
                    award_title="Top Rated Teacher of the Cycle",
                    certificate_url=cert_url
                )
                db.add(award)
                
                # TODO: Implement actual PDF generation and save to cert_url here
                # generate_certificate(teacher, new_cycle, cert_url)

        db.commit()
        logger.info("Teacher rating cycle processed successfully.")

    except Exception as e:
        logger.error(f"Error processing teacher ratings: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler(timezone=utc)
    # Schedule to run every 14 days. 
    # For testing, you might want to change this to an interval of minutes or trigger manually.
    scheduler.add_job(process_teacher_ratings, 'interval', days=CYCLE_DAYS)
    scheduler.start()
    logger.info(f"Started rating cycle scheduler. Running every {CYCLE_DAYS} days.")
