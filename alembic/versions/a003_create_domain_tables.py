"""create_new_domain_tables — Rev 003 (NEW TABLES)

Revision ID: a003_create_domain_tables
Revises: a002_backfill_columns
Create Date: 2026-03-03

Creates:
    xp_ledger               — append-only XP transaction log
    user_xp_summary         — materialized XP totals (per user per engine)
    marketplace_listings    — saleable content catalog
    marketplace_orders      — purchase transactions
    marketplace_commissions — platform commission audit log
    individual_enrollments  — individual learner course access
    individual_lesson_progress  — per-lesson tracking for individual learners
    individual_course_progress  — per-course aggregate for individual learners

Also backfills user_xp_summary from existing User.xp values (best-effort snapshot).
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "a003_create_domain_tables"
down_revision: Union[str, Sequence[str], None] = "a002_backfill_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── xp_ledger ─────────────────────────────────────────────────────────────
    op.create_table(
        "xp_ledger",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("engine", sa.String(20), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("xp_amount", sa.Integer(), nullable=False),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── user_xp_summary ───────────────────────────────────────────────────────
    op.create_table(
        "user_xp_summary",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("engine", sa.String(20), primary_key=True),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Backfill summary from existing User.xp for institution engine
    conn.execute(text("""
        INSERT INTO user_xp_summary (user_id, engine, total_xp, level, streak_days, last_activity_date)
        SELECT
            id,
            'institution',
            COALESCE(xp, 0),
            COALESCE(level, 1),
            COALESCE(streak_days, 0),
            last_activity_date
        FROM users
        WHERE user_type != 'platform'
        ON CONFLICT (user_id, engine) DO NOTHING
    """))

    # ── marketplace_listings ──────────────────────────────────────────────────
    op.create_table(
        "marketplace_listings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("listing_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("is_free", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scope", sa.String(20), nullable=False, server_default="public"),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resource_type", sa.String(30), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── marketplace_orders ────────────────────────────────────────────────────
    op.create_table(
        "marketplace_orders",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("marketplace_listings.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("buyer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("payment_method", sa.String(30), nullable=True),
        sa.Column("gateway_ref", sa.String(255), nullable=True),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── marketplace_commissions ───────────────────────────────────────────────
    op.create_table(
        "marketplace_commissions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("marketplace_orders.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("seller_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("gross_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission_rate", sa.Numeric(5, 4), nullable=False),
        sa.Column("commission_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("net_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("settled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── individual_enrollments ────────────────────────────────────────────────
    op.create_table(
        "individual_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("online_courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", sa.BigInteger(), sa.ForeignKey("marketplace_orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("completion_percentage", sa.Float(), server_default="0.0"),
        sa.Column("lessons_completed", sa.Integer(), server_default="0"),
        sa.Column("total_lessons", sa.Integer(), server_default="0"),
        sa.Column("certificate_earned", sa.Boolean(), server_default="false"),
        sa.Column("certificate_issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "course_id", name="uq_individual_enrollment_user_course"),
    )

    # ── individual_lesson_progress ────────────────────────────────────────────
    op.create_table(
        "individual_lesson_progress",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("enrollment_id", sa.Integer(), sa.ForeignKey("individual_enrollments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("course_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("completion_percentage", sa.Float(), server_default="0.0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_spent_minutes", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("enrollment_id", "lesson_id", name="uq_individual_lesson_progress"),
    )

    # ── individual_course_progress ────────────────────────────────────────────
    op.create_table(
        "individual_course_progress",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("enrollment_id", sa.Integer(), sa.ForeignKey("individual_enrollments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("modules_completed", sa.Integer(), server_default="0"),
        sa.Column("total_modules", sa.Integer(), server_default="0"),
        sa.Column("lessons_completed", sa.Integer(), server_default="0"),
        sa.Column("total_lessons", sa.Integer(), server_default="0"),
        sa.Column("assignments_submitted", sa.Integer(), server_default="0"),
        sa.Column("total_assignments", sa.Integer(), server_default="0"),
        sa.Column("average_assignment_score", sa.Float(), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("xp_earned_in_course", sa.Integer(), server_default="0"),
        sa.Column("last_updated", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("individual_course_progress")
    op.drop_table("individual_lesson_progress")
    op.drop_table("individual_enrollments")
    op.drop_table("marketplace_commissions")
    op.drop_table("marketplace_orders")
    op.drop_table("marketplace_listings")
    op.drop_table("user_xp_summary")
    op.drop_table("xp_ledger")
