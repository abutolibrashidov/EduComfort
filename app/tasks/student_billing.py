"""
Celery Task: Student Billing Scheduler
This Celery task runs once daily via Celery Beat.
"""
from loguru import logger
from app.core.celery_app import celery_app
from app.cron.student_billing_cron import check_student_subscriptions

@celery_app.task(
    name="app.tasks.student_billing.run_student_billing_cycle",
    bind=True,
    max_retries=2,
    default_retry_delay=300,   # 5 minutes between retries
    acks_late=True,
)
def run_student_billing_cycle(self):
    """
    Daily student billing cycle task.
    Checks student subscriptions for:
      - Upcoming expiry (send SMS reminder to parents)
      - Expired subscriptions (block student access and send SMS to parents)
    """
    logger.info("Student billing cycle task started")
    try:
        check_student_subscriptions()
        logger.info("Student billing cycle task completed successfully")
    except Exception as exc:
        logger.error(f"Student billing cycle task failed: {exc}")
        raise self.retry(exc=exc)
