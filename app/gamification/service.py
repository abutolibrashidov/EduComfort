"""
GamificationService — Public API for the Gamification Domain

This is the single entry point for all XP-awarding events.
Callers (routers, other services) should ONLY interact with this module,
never with the engines directly.

Usage:
    from app.gamification.service import GamificationService

    svc = GamificationService(db)
    svc.award_attendance_xp(user, attendance_id)
    svc.award_lesson_xp(user, lesson_id)
    svc.get_leaderboard(engine="institution", institution_id=42)
"""
from __future__ import annotations

import json
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.models.user import User
from app.gamification.engine_base import GamificationEngine
from app.gamification.institution_engine import InstitutionGamificationEngine
from app.gamification.individual_engine import IndividualGamificationEngine


class GamificationService:
    """
    Factory + orchestrator for gamification engines.
    Selects the correct engine based on User.user_type.
    Falls back to InstitutionEngine if user_type is not set.
    """

    def __init__(self, db: Session):
        self.db = db

    def _get_engine(self, user: User) -> GamificationEngine:
        """Return the correct engine for this user's type."""
        user_type = getattr(user, "user_type", "institution") or "institution"
        if user_type == "individual":
            return IndividualGamificationEngine(self.db)
        return InstitutionGamificationEngine(self.db)

    # ── Public event methods ──────────────────────────────────────────────────

    def award_attendance_xp(self, user: User, attendance_id: int) -> int:
        """Award XP for marked-present attendance. Commits to DB."""
        engine = self._get_engine(user)
        xp = engine.on_attendance_marked(
            user, attendance_id, institution_id=user.institution_id
        )
        if xp > 0:
            self.db.commit()
        return xp

    def award_lesson_xp(self, user: User, lesson_id: int) -> int:
        """Award XP for completing a lesson. Commits to DB."""
        engine = self._get_engine(user)
        xp = engine.on_lesson_complete(user, lesson_id)
        if xp > 0:
            self.db.commit()
        return xp

    def award_exam_xp(self, user: User, exam_id: int, score: float) -> int:
        """Award XP for completing an exam. Commits to DB."""
        engine = self._get_engine(user)
        xp = engine.on_exam_completed(
            user, exam_id, score, institution_id=user.institution_id
        )
        if xp > 0:
            self.db.commit()
        return xp

    def award_homework_xp(self, user: User, reference_id: int) -> int:
        """Award XP for submitting homework (institution engine only)."""
        engine = self._get_engine(user)
        if isinstance(engine, InstitutionGamificationEngine):
            xp = engine.on_homework_submitted(
                user, reference_id, institution_id=user.institution_id
            )
            if xp > 0:
                self.db.commit()
            return xp
        return 0

    def award_teacher_rating_xp(
        self, user: User, rating_log_id: int, points: int
    ) -> int:
        """Award XP from a teacher's rating entry (institution engine only)."""
        engine = self._get_engine(user)
        if isinstance(engine, InstitutionGamificationEngine):
            xp = engine.on_teacher_rating(
                user, rating_log_id, points, institution_id=user.institution_id
            )
            if xp > 0:
                self.db.commit()
            return xp
        return 0

    def award_achievement_xp(
        self, user: User, achievement_id: int, xp_reward: int
    ) -> int:
        """Award XP for unlocking an achievement."""
        engine = self._get_engine(user)
        xp = engine.on_achievement_unlock(
            user, achievement_id, xp_reward, institution_id=user.institution_id
        )
        if xp > 0:
            self.db.commit()
        return xp

    def award_course_complete_xp(self, user: User, course_id: int) -> int:
        """Award XP for completing an entire course (individual engine only)."""
        engine = self._get_engine(user)
        if isinstance(engine, IndividualGamificationEngine):
            xp = engine.on_course_complete(user, course_id)
            if xp > 0:
                self.db.commit()
            return xp
        return 0

    # ── Leaderboard ───────────────────────────────────────────────────────────

    def get_leaderboard(
        self,
        engine: str,
        institution_id: Optional[int] = None,
        limit: int = 50,
    ) -> list[dict]:
        """
        Return the top-N users ranked by XP for the given engine.

        Uses Redis cache (TTL 5 min for institution, 2 min for individual).
        Falls back to DB query if Redis is unavailable.
        """
        from app.core.redis_client import get_leaderboard_cache, set_leaderboard_cache

        # 1. Try Redis cache
        cached = get_leaderboard_cache(engine, institution_id)
        if cached:
            return json.loads(cached)

        # 2. DB query using RANK() window function
        if engine == "institution" and institution_id:
            rows = self.db.execute(text("""
                SELECT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.avatar,
                    s.total_xp,
                    s.level,
                    RANK() OVER (ORDER BY s.total_xp DESC) AS rank
                FROM user_xp_summary s
                JOIN users u ON u.id = s.user_id
                WHERE s.engine = :engine
                  AND u.institution_id = :inst_id
                  AND u.role = 'student'
                  AND u.is_active = true
                ORDER BY s.total_xp DESC
                LIMIT :lim
            """), {"engine": engine, "inst_id": institution_id, "lim": limit}).fetchall()
            ttl = 300  # 5 min for institution leaderboard
        else:
            rows = self.db.execute(text("""
                SELECT
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.avatar,
                    s.total_xp,
                    s.level,
                    RANK() OVER (ORDER BY s.total_xp DESC) AS rank
                FROM user_xp_summary s
                JOIN users u ON u.id = s.user_id
                WHERE s.engine = :engine
                  AND u.is_active = true
                ORDER BY s.total_xp DESC
                LIMIT :lim
            """), {"engine": engine, "lim": limit}).fetchall()
            ttl = 120  # 2 min for global individual leaderboard

        result = [
            {
                "rank": r.rank,
                "id": r.id,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "avatar": r.avatar,
                "xp": r.total_xp,
                "level": r.level,
            }
            for r in rows
        ]

        # 3. Write to Redis
        set_leaderboard_cache(engine, institution_id, json.dumps(result), ttl)
        return result

    def get_user_rank(
        self, user: User, engine: Optional[str] = None
    ) -> dict:
        """
        Return user's current XP summary and rank within their scope.
        Uses RANK() window function — no full-table-scan COUNT().
        """
        from app.gamification.models import UserXPSummary

        effective_engine = engine or (
            "individual" if getattr(user, "user_type", "institution") == "individual"
            else "institution"
        )

        summary = self.db.query(UserXPSummary).filter(
            UserXPSummary.user_id == user.id,
            UserXPSummary.engine == effective_engine,
        ).first()

        if not summary:
            return {
                "xp": 0, "level": 1, "streak_days": 0,
                "rank": None, "engine": effective_engine,
            }

        # Rank via subquery
        if effective_engine == "institution" and user.institution_id:
            rank_row = self.db.execute(text("""
                SELECT rank FROM (
                    SELECT s.user_id,
                           RANK() OVER (ORDER BY s.total_xp DESC) AS rank
                    FROM user_xp_summary s
                    JOIN users u ON u.id = s.user_id
                    WHERE s.engine = :engine AND u.institution_id = :inst_id
                ) ranked
                WHERE user_id = :uid
            """), {
                "engine": effective_engine,
                "inst_id": user.institution_id,
                "uid": user.id,
            }).fetchone()
        else:
            rank_row = self.db.execute(text("""
                SELECT rank FROM (
                    SELECT user_id,
                           RANK() OVER (ORDER BY total_xp DESC) AS rank
                    FROM user_xp_summary
                    WHERE engine = :engine
                ) ranked
                WHERE user_id = :uid
            """), {"engine": effective_engine, "uid": user.id}).fetchone()

        return {
            "xp": summary.total_xp,
            "level": summary.level,
            "streak_days": summary.streak_days,
            "last_activity_date": summary.last_activity_date,
            "rank": rank_row.rank if rank_row else None,
            "engine": effective_engine,
        }
