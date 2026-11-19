"""
Gamification Domain — Abstract Engine Base

All gamification engines must implement this interface.
The GamificationService factory selects the correct engine
based on User.user_type at runtime.
"""
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from app.models.user import User


class GamificationEngine(ABC):
    """
    Abstract base class for gamification engines.

    Subclasses:
        InstitutionGamificationEngine  — group/event-based, teacher-driven
        IndividualGamificationEngine   — lesson-based, daily-limited, streak-driven
    """

    ENGINE_NAME: str = ""  # 'institution' or 'individual'

    def __init__(self, db: Session):
        self.db = db

    # ── Core XP event hooks ───────────────────────────────────────────────────

    @abstractmethod
    def on_lesson_complete(self, user: User, lesson_id: int, **kwargs) -> int:
        """
        Called when a user completes a lesson.
        Returns XP awarded (0 if capped or not applicable).
        """
        ...

    @abstractmethod
    def on_attendance_marked(self, user: User, attendance_id: int, **kwargs) -> int:
        """
        Called when attendance is marked as 'present'.
        Returns XP awarded.
        """
        ...

    @abstractmethod
    def on_exam_completed(self, user: User, exam_id: int, score: float, **kwargs) -> int:
        """
        Called when an exam is submitted and scored.
        Returns XP awarded (0 if failed threshold).
        """
        ...

    @abstractmethod
    def on_streak_updated(self, user: User, streak_days: int, **kwargs) -> int:
        """
        Called when the user's streak is updated.
        Returns bonus XP for milestone streaks (7, 30, 100 days).
        """
        ...

    # ── Shared internal utility ───────────────────────────────────────────────

    def _write_xp_ledger(
        self,
        user_id: int,
        event_type: str,
        xp_amount: int,
        reference_id: int | None = None,
        reference_type: str | None = None,
        institution_id: int | None = None,
        note: str | None = None,
    ) -> None:
        """
        Insert one XP ledger row and update the materialized summary.
        Called internally by all engine event hooks.
        Caller is responsible for db.commit().
        """
        from app.gamification.models import XPLedger, UserXPSummary
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        # 1. Append to ledger (immutable)
        ledger_entry = XPLedger(
            user_id=user_id,
            engine=self.ENGINE_NAME,
            event_type=event_type,
            xp_amount=xp_amount,
            reference_id=reference_id,
            reference_type=reference_type,
            institution_id=institution_id,
            note=note,
        )
        self.db.add(ledger_entry)
        self.db.flush()  # get id without committing

        # 2. Upsert materialized summary
        stmt = pg_insert(UserXPSummary).values(
            user_id=user_id,
            engine=self.ENGINE_NAME,
            total_xp=xp_amount,
            level=1,
            streak_days=0,
        ).on_conflict_do_update(
            index_elements=["user_id", "engine"],
            set_={
                "total_xp": UserXPSummary.total_xp + xp_amount,
                "level": (UserXPSummary.total_xp + xp_amount) / 1000 + 1,
                "updated_at": __import__("sqlalchemy").func.now(),
            }
        )
        self.db.execute(stmt)

    def _invalidate_leaderboard_cache(self, institution_id: int | None = None) -> None:
        """
        Delete the Redis leaderboard cache for this engine.
        Called after every XP award so the next read rebuilds from DB.
        """
        try:
            from app.core.redis_client import get_redis_client
            redis = get_redis_client()
            if redis is None:
                return
            scope = str(institution_id) if institution_id else "global"
            key = f"lb:{self.ENGINE_NAME}:{scope}"
            redis.delete(key)
        except Exception:
            pass  # Redis unavailable → degrade gracefully, DB still correct
