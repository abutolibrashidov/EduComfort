"""
InstitutionGamificationEngine

Handles XP for users who are members of an institution (students in classrooms).

XP Sources:
    attendance_present  → +10 XP per lesson
    exam_pass           → +50 to +150 XP (scaled by score %)
    homework_submitted  → +20 XP
    teacher_rating      → +points (from StudentRatingLog)
    achievement_unlock  → +xp_reward from Achievement

Ranking scope:  institution-scoped (only vs peers in same institution)
Leaderboard:    Redis-cached, 5-minute TTL, keyed by institution_id
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.gamification.engine_base import GamificationEngine
from app.models.user import User


# ── Configurable XP constants ─────────────────────────────────────────────────
# These are intentionally kept as simple module-level constants so they can
# later be moved to a database-backed settings table per institution.

XP_ATTENDANCE_PRESENT   = 10
XP_HOMEWORK_SUBMITTED   = 20
XP_EXAM_PASS_BASE       = 50   # minimum XP for a passing exam score
XP_EXAM_PASS_MAX        = 150  # maximum XP for a perfect score
XP_EXAM_PASS_THRESHOLD  = 70   # minimum score % to earn XP


class InstitutionGamificationEngine(GamificationEngine):
    """
    XP engine for institution-enrolled students.
    XP is scoped per institution — rankings only compare within the same institution.
    """

    ENGINE_NAME = "institution"

    # ── Event hooks ────────────────────────────────────────────────────────────

    def on_lesson_complete(self, user: User, lesson_id: int, **kwargs) -> int:
        """
        Lessons in institution classrooms don't directly award XP.
        XP comes from attendance, exams, and teacher ratings.
        Override per-institution if needed.
        """
        return 0

    def on_attendance_marked(
        self,
        user: User,
        attendance_id: int,
        institution_id: int | None = None,
        **kwargs,
    ) -> int:
        """Award XP when a student is marked present at a lesson."""
        xp = XP_ATTENDANCE_PRESENT
        self._write_xp_ledger(
            user_id=user.id,
            event_type="attendance_present",
            xp_amount=xp,
            reference_id=attendance_id,
            reference_type="attendance",
            institution_id=institution_id or user.institution_id,
        )
        self._invalidate_leaderboard_cache(institution_id or user.institution_id)
        return xp

    def on_exam_completed(
        self,
        user: User,
        exam_id: int,
        score: float,
        institution_id: int | None = None,
        **kwargs,
    ) -> int:
        """
        Award XP for passing an exam.
        XP scales linearly from base→max based on score above threshold.
        Score below threshold = 0 XP.
        """
        if score < XP_EXAM_PASS_THRESHOLD:
            return 0

        # Linear scale: 70% → 50 XP, 100% → 150 XP
        ratio = (score - XP_EXAM_PASS_THRESHOLD) / (100 - XP_EXAM_PASS_THRESHOLD)
        xp = int(XP_EXAM_PASS_BASE + ratio * (XP_EXAM_PASS_MAX - XP_EXAM_PASS_BASE))

        self._write_xp_ledger(
            user_id=user.id,
            event_type="exam_pass",
            xp_amount=xp,
            reference_id=exam_id,
            reference_type="exam",
            institution_id=institution_id or user.institution_id,
            note=f"Score: {score:.1f}%",
        )
        self._invalidate_leaderboard_cache(institution_id or user.institution_id)
        return xp

    def on_streak_updated(self, user: User, streak_days: int, **kwargs) -> int:
        """Institution engine does not use streaks — return 0."""
        return 0

    def on_homework_submitted(
        self,
        user: User,
        reference_id: int,
        institution_id: int | None = None,
        **kwargs,
    ) -> int:
        """Award XP for submitting homework."""
        xp = XP_HOMEWORK_SUBMITTED
        self._write_xp_ledger(
            user_id=user.id,
            event_type="homework_submitted",
            xp_amount=xp,
            reference_id=reference_id,
            reference_type="homework",
            institution_id=institution_id or user.institution_id,
        )
        self._invalidate_leaderboard_cache(institution_id or user.institution_id)
        return xp

    def on_teacher_rating(
        self,
        user: User,
        rating_log_id: int,
        points: int,
        institution_id: int | None = None,
        **kwargs,
    ) -> int:
        """Award XP from a teacher's StudentRatingLog entry."""
        self._write_xp_ledger(
            user_id=user.id,
            event_type="teacher_rating",
            xp_amount=points,
            reference_id=rating_log_id,
            reference_type="student_rating_log",
            institution_id=institution_id or user.institution_id,
        )
        self._invalidate_leaderboard_cache(institution_id or user.institution_id)
        return points

    def on_achievement_unlock(
        self,
        user: User,
        achievement_id: int,
        xp_reward: int,
        institution_id: int | None = None,
        **kwargs,
    ) -> int:
        """Award XP for unlocking an achievement."""
        self._write_xp_ledger(
            user_id=user.id,
            event_type="achievement_unlock",
            xp_amount=xp_reward,
            reference_id=achievement_id,
            reference_type="achievement",
            institution_id=institution_id or user.institution_id,
        )
        self._invalidate_leaderboard_cache(institution_id or user.institution_id)
        return xp_reward
