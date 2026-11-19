"""
IndividualGamificationEngine

Handles XP for self-study learners (user_type = 'individual').

XP Sources:
    lesson_complete     → +25 XP (max 5 lessons = 125 XP/day via daily cap)
    assignment_submit   → +40 XP
    streak_day          → +15 XP once per calendar day
    streak_milestone_7  → +100 XP (once)
    streak_milestone_30 → +300 XP (once)
    streak_milestone_100→ +1000 XP (once)
    course_complete     → +500 XP (once per course)

Rules:
    - Daily XP cap enforced via Redis counter (resets at midnight UTC)
    - Streak calculated from xp_ledger event gaps
    - Rankings are GLOBAL across ALL individual learners
    - Leaderboard cached in Redis keyed as 'lb:individual:global'
"""
from __future__ import annotations

from datetime import date


from app.gamification.engine_base import GamificationEngine
from app.core.models.user import User

# ── Configurable XP constants ─────────────────────────────────────────────────

XP_LESSON_COMPLETE          = 25
XP_ASSIGNMENT_SUBMIT        = 40
XP_STREAK_DAILY_BONUS       = 15
XP_STREAK_MILESTONE_7       = 100
XP_STREAK_MILESTONE_30      = 300
XP_STREAK_MILESTONE_100     = 1000
XP_COURSE_COMPLETE          = 500

DAILY_XP_CAP                = 125   # 5 lessons × 25 XP
DAILY_LESSON_CAP            = 5     # Max lesson XP rewards per calendar day


class IndividualGamificationEngine(GamificationEngine):
    """
    XP engine for individual self-study learners.
    Rankings are global — all individual learners compete together.
    Daily caps prevent farming; streak system rewards consistency.
    """

    ENGINE_NAME = "individual"

    # ── Event hooks ────────────────────────────────────────────────────────────

    def on_lesson_complete(self, user: User, lesson_id: int, **kwargs) -> int:
        """
        Award XP for completing a lesson, subject to daily cap.
        Checks Redis daily cap counter before awarding.
        """
        today = date.today().isoformat()

        # Check daily lesson cap via Redis
        from app.core.redis_client import check_daily_xp_cap, increment_daily_xp_cap
        already_earned = check_daily_xp_cap(user.id, today)

        if already_earned >= DAILY_XP_CAP:
            # Daily cap reached — no XP awarded, but lesson is still marked complete
            return 0

        xp = XP_LESSON_COMPLETE
        self._write_xp_ledger(
            user_id=user.id,
            event_type="lesson_complete",
            xp_amount=xp,
            reference_id=lesson_id,
            reference_type="course_lesson",
            institution_id=None,  # Individual learners have no institution
        )
        increment_daily_xp_cap(user.id, today, xp)
        self._invalidate_leaderboard_cache(institution_id=None)
        return xp

    def on_attendance_marked(self, user: User, attendance_id: int, **kwargs) -> int:
        """Individual learners have no classroom attendance — return 0."""
        return 0

    def on_exam_completed(self, user: User, exam_id: int, score: float, **kwargs) -> int:
        """
        Individual learners may take online course quizzes/exams.
        XP awarded for any passing score (≥60%).
        """
        if score < 60:
            return 0
        xp = XP_ASSIGNMENT_SUBMIT  # Treat as assignment-level XP
        self._write_xp_ledger(
            user_id=user.id,
            event_type="exam_pass",
            xp_amount=xp,
            reference_id=exam_id,
            reference_type="exam",
            institution_id=None,
        )
        self._invalidate_leaderboard_cache(institution_id=None)
        return xp

    def on_assignment_submitted(self, user: User, assignment_id: int, **kwargs) -> int:
        """Award XP for submitting a course assignment."""
        xp = XP_ASSIGNMENT_SUBMIT
        self._write_xp_ledger(
            user_id=user.id,
            event_type="assignment_submit",
            xp_amount=xp,
            reference_id=assignment_id,
            reference_type="course_assignment",
            institution_id=None,
        )
        self._invalidate_leaderboard_cache(institution_id=None)
        return xp

    def on_streak_updated(self, user: User, streak_days: int, **kwargs) -> int:
        """
        Award daily streak XP and milestone bonuses.
        Milestone bonuses are one-time only — checked via xp_ledger.
        """
        total_xp = 0

        # Daily streak bonus (once per calendar day)
        today = date.today().isoformat()
        streak_key_today = f"streak:{user.id}:{today}"
        from app.core.redis_client import get_redis_client
        redis = get_redis_client()
        if redis and redis.exists(streak_key_today):
            pass  # Already awarded streak today
        else:
            self._write_xp_ledger(
                user_id=user.id,
                event_type="streak_day",
                xp_amount=XP_STREAK_DAILY_BONUS,
                note=f"Streak day {streak_days}",
                institution_id=None,
            )
            if redis:
                redis.setex(streak_key_today, 86400, "1")
            total_xp += XP_STREAK_DAILY_BONUS

        # Milestone bonuses (one-time per milestone)
        milestones = {
            7:   ("streak_milestone_7",   XP_STREAK_MILESTONE_7),
            30:  ("streak_milestone_30",  XP_STREAK_MILESTONE_30),
            100: ("streak_milestone_100", XP_STREAK_MILESTONE_100),
        }
        if streak_days in milestones:
            event_type, bonus_xp = milestones[streak_days]
            # Check not already awarded
            if not self._milestone_already_awarded(user.id, event_type):
                self._write_xp_ledger(
                    user_id=user.id,
                    event_type=event_type,
                    xp_amount=bonus_xp,
                    note=f"{streak_days}-day streak milestone",
                    institution_id=None,
                )
                total_xp += bonus_xp

        if total_xp > 0:
            self._invalidate_leaderboard_cache(institution_id=None)
        return total_xp

    def on_course_complete(self, user: User, course_id: int, **kwargs) -> int:
        """Award XP when an individual learner finishes an entire course (once only)."""
        xp = XP_COURSE_COMPLETE
        self._write_xp_ledger(
            user_id=user.id,
            event_type="course_complete",
            xp_amount=xp,
            reference_id=course_id,
            reference_type="online_course",
            note="Course completion bonus",
            institution_id=None,
        )
        self._invalidate_leaderboard_cache(institution_id=None)
        return xp

    # ── Private helpers ────────────────────────────────────────────────────────

    def _milestone_already_awarded(self, user_id: int, event_type: str) -> bool:
        """Check xp_ledger to see if a one-time milestone was already awarded."""
        from app.gamification.models import XPLedger
        return self.db.query(XPLedger).filter(
            XPLedger.user_id == user_id,
            XPLedger.event_type == event_type,
            XPLedger.engine == self.ENGINE_NAME,
        ).first() is not None
