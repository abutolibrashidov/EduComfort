"""
Celery Task: Gamification Scheduler
Replaces: app/services/rating_cycle_scheduler.py + start_scheduler() in main.py

Periodic tasks for gamification maintenance.
All tasks run via Celery Beat — exactly once regardless of worker count.
"""
from loguru import logger
from app.core.celery_app import celery_app
from app.core.database import SessionLocal


@celery_app.task(
    name="app.tasks.gamification.reset_rating_cycles",
    bind=True,
    max_retries=2,
    default_retry_delay=600,
    acks_late=True,
)
def reset_rating_cycles(self):
    """
    Weekly rating cycle reset.
    Closes expired LeaderboardEvents and archives winners.
    Schedule: every Monday at 00:00 (configured in celery_beat_schedule.py).
    """
    logger.info("Rating cycle reset task started")
    db = SessionLocal()
    try:
        from app.services.rating_cycle_scheduler import _run_rating_cycle_logic
        _run_rating_cycle_logic(db)
        logger.info("Rating cycle reset completed")
    except Exception as exc:
        logger.error(f"Rating cycle reset failed: {exc}")
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    name="app.tasks.gamification.snapshot_leaderboards",
    bind=True,
    max_retries=1,
    acks_late=True,
)
def snapshot_leaderboards(self):
    """
    Warm up the Redis leaderboard cache every 10 minutes.
    Queries all active institutions and pre-builds their leaderboard JSON
    so the first user request after cache expiry hits a warm cache.

    Schedule: every 10 minutes (configured in celery_beat_schedule.py).
    """
    logger.debug("Leaderboard snapshot task started")
    db = SessionLocal()
    try:
        from app.models.institution import Institution
        from app.gamification.service import GamificationService

        active_institutions = db.query(Institution.id).filter(
            Institution.is_active == True  # noqa: E712
        ).all()

        svc = GamificationService(db)
        count = 0
        for (inst_id,) in active_institutions:
            try:
                svc.get_leaderboard(engine="institution", institution_id=inst_id, limit=50)
                count += 1
            except Exception as e:
                logger.warning(f"Could not snapshot leaderboard for inst {inst_id}: {e}")

        # Also warm the global individual leaderboard
        try:
            svc.get_leaderboard(engine="individual", institution_id=None, limit=100)
        except Exception as e:
            logger.warning(f"Could not snapshot individual leaderboard: {e}")

        logger.debug(f"Leaderboard snapshot: warmed {count} institution caches")
    except Exception as exc:
        logger.error(f"Leaderboard snapshot task failed: {exc}")
        raise self.retry(exc=exc)
    finally:
        db.close()
