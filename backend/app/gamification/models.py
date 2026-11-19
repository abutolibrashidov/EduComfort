"""
Gamification Domain — Core Models

New append-only XP ledger and materialized XP summary tables.
These REPLACE the xp/level/streak_days fields on the User model (removed in migration Rev 006).

Architecture:
    xp_ledger       → source of truth (immutable event log)
    user_xp_summary → materialized totals (fast queries, Redis cache-friendly)
"""
from sqlalchemy import (
    Column, Integer, String, BigInteger, Text,
    DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.models.base import Base


class XPLedger(Base):
    """
    Append-only XP transaction log.
    Every XP award or penalty is recorded here permanently.
    Never update or delete rows — only insert.

    engine values:
        'institution' — XP earned via classroom activities (attendance, exams, ratings)
        'individual'  — XP earned via self-study lessons (daily-limited, streak-driven)
    """
    __tablename__ = "xp_ledger"

    id              = Column(BigInteger, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Which gamification engine awarded this XP
    engine          = Column(String(20), nullable=False)      # 'institution' | 'individual'

    # What event triggered it
    event_type      = Column(String(50), nullable=False)
    # e.g. 'attendance_present', 'exam_pass', 'lesson_complete',
    #      'streak_bonus', 'achievement_unlock', 'teacher_rating'

    xp_amount       = Column(Integer, nullable=False)         # positive = reward, negative = penalty

    # What caused this entry (optional traceability)
    reference_id    = Column(Integer, nullable=True)          # FK value of the triggering entity
    reference_type  = Column(String(50), nullable=True)       # 'attendance', 'lesson', 'exam', 'achievement'

    # Institution scope (NULL for individual learners)
    institution_id  = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)

    note            = Column(Text, nullable=True)             # Optional human-readable reason
    awarded_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships (read-only, no cascade writes via these)
    user            = relationship("User", foreign_keys=[user_id])

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        # Fast per-user history (most recent first)
        Index("idx_xp_ledger_user_time", "user_id", "awarded_at"),
        # Fast institution-scoped analytics
        Index("idx_xp_ledger_institution_engine", "institution_id", "engine", "awarded_at"),
        # Daily cap check for individual engine
        Index("idx_xp_ledger_user_engine_date", "user_id", "engine", "awarded_at"),
    )

    def __repr__(self):
        return f"<XPLedger user={self.user_id} +{self.xp_amount}xp [{self.event_type}]>"


class UserXPSummary(Base):
    """
    Materialized XP totals per user per engine.

    Updated atomically (same DB transaction) on every XP ledger insert.
    Used for all leaderboard queries and rank calculations.
    Redis caches the rendered leaderboard JSON — this table is the DB source.

    One row per user per engine (institution users may have both engine rows
    if they also do self-study).
    """
    __tablename__ = "user_xp_summary"

    # Composite primary key: one row per (user, engine) pair
    user_id              = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    engine               = Column(String(20), primary_key=True, default="institution")
    # 'institution' | 'individual'

    total_xp             = Column(Integer, nullable=False, default=0)
    level                = Column(Integer, nullable=False, default=1)
    streak_days          = Column(Integer, nullable=False, default=0)
    last_activity_date   = Column(DateTime(timezone=True), nullable=True)
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # ── Indexes ──────────────────────────────────────────────────────────────
    __table_args__ = (
        # Primary leaderboard ranking index
        # Supports: ORDER BY total_xp DESC filtered by engine
        Index(
            "idx_xp_summary_engine_rank",
            "engine",
            "total_xp",
            postgresql_ops={"total_xp": "DESC"},
        ),
    )

    def __repr__(self):
        return f"<UserXPSummary user={self.user_id} engine={self.engine} xp={self.total_xp} lvl={self.level}>"
