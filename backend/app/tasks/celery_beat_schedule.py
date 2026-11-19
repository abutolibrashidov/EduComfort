"""
Celery Beat Schedule — EduComfort Periodic Tasks

This file defines ALL scheduled jobs in one place.
Celery Beat process reads this config and fires tasks at the right times.

Deploy ONE Celery Beat instance only:
    celery -A app.core.celery_app beat --loglevel=info

Deploy Celery workers (multiple OK):
    celery -A app.core.celery_app worker --loglevel=info -Q default,gamification,billing

NEVER import start_scheduler() or start_billing_scheduler() in main.py anymore.
"""
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # ── Finance: Daily billing cycle at 09:00 UTC ────────────────────────────
    # Checks subscription expirations, sends SMS reminders, blocks expired institutions.
    "billing-cycle-daily": {
        "task": "app.tasks.billing.run_billing_cycle",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "billing"},
    },

    # ── Finance: Daily student billing cycle at 10:00 UTC ────────────────────
    # Checks student payment expirations, sends SMS to parents, blocks expired students.
    "student-billing-cycle-daily": {
        "task": "app.tasks.student_billing.run_student_billing_cycle",
        "schedule": crontab(hour=10, minute=0),
        "options": {"queue": "billing"},
    },

    # ── Gamification: Weekly rating cycle reset (Monday 00:00 UTC) ───────────
    # Closes expired LeaderboardEvents, archives winners, resets active states.
    "rating-cycle-weekly-reset": {
        "task": "app.tasks.gamification.reset_rating_cycles",
        "schedule": crontab(day_of_week="monday", hour=0, minute=0),
        "options": {"queue": "gamification"},
    },

    # ── Gamification: Warm Redis leaderboard cache every 10 minutes ──────────
    # Prevents cold-cache spikes on leaderboard reads.
    "leaderboard-cache-warmup": {
        "task": "app.tasks.gamification.snapshot_leaderboards",
        "schedule": crontab(minute="*/10"),
        "options": {"queue": "gamification"},
    },
}
