"""
Celery Task: Billing Scheduler
Replaces: app/services/billing_scheduler.py + start_billing_scheduler() in main.py

This Celery task runs once daily via Celery Beat.
ONLY ONE instance runs regardless of how many Gunicorn workers are deployed.
"""
from loguru import logger
from app.core.celery_app import celery_app
from app.core.database import SessionLocal


@celery_app.task(
    name="app.tasks.billing.run_billing_cycle",
    bind=True,
    max_retries=2,
    default_retry_delay=300,   # 5 minutes between retries
    acks_late=True,
)
def run_billing_cycle(self):
    """
    Daily billing cycle task.
    Checks institution subscriptions for:
      - Upcoming expiry (send SMS reminder)
      - Expired subscriptions (set status → expired, block access)
      - Auto-renewal processing

    Replaces the APScheduler-based billing_scheduler.py.
    Schedule: daily at 09:00 (configured in celery_beat_schedule.py).
    """
    logger.info("Billing cycle task started")
    db = SessionLocal()
    try:
        # Import here to avoid circular imports at module load time
        from app.services.billing_scheduler import _run_billing_logic
        _run_billing_logic(db)
        logger.info("Billing cycle task completed successfully")
    except Exception as exc:
        logger.error(f"Billing cycle task failed: {exc}")
        raise self.retry(exc=exc)
    finally:
        db.close()
