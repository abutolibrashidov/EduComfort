"""add_composite_indexes — Rev 004 (PERFORMANCE INDEXES)

Revision ID: a004_add_composite_indexes
Revises: a003_create_domain_tables
Create Date: 2026-03-03

Adds all performance-critical indexes using CREATE INDEX CONCURRENTLY
so they do not lock any tables during creation.

IMPORTANT: These indexes must be created CONCURRENTLY to avoid locking.
Alembic does not support CONCURRENTLY natively via create_index(),
so we use raw SQL via conn.execute(). Run this in a production migration
window where each index may take 1–10 minutes to build.
"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy.sql import text

revision: str = "a004_add_composite_indexes"
down_revision: Union[str, Sequence[str], None] = "a003_create_domain_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
    # We use engine.connect() with AUTOCOMMIT isolation level per index.
    # Each index is created only if the underlying table exists.
    bind = op.get_bind()
    engine = bind.engine

    indexes = [
        # ── xp_ledger ─────────────────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xp_ledger_user_time "
        "ON xp_ledger(user_id, awarded_at DESC)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xp_ledger_institution_engine "
        "ON xp_ledger(institution_id, engine, awarded_at DESC)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xp_ledger_user_engine_date "
        "ON xp_ledger(user_id, engine, awarded_at)",

        # ── user_xp_summary ───────────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xp_summary_institution_rank "
        "ON user_xp_summary(total_xp DESC) WHERE engine = 'institution'",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_xp_summary_individual_rank "
        "ON user_xp_summary(total_xp DESC) WHERE engine = 'individual'",

        # ── users ─────────────────────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_inst_role "
        "ON users(institution_id, role) WHERE is_active = true",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_user_type "
        "ON users(user_type) WHERE is_active = true",

        # ── payments ──────────────────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_institution "
        "ON payments(institution_id, payment_date DESC)",

        # ── marketplace ───────────────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_scope_active "
        "ON marketplace_listings(scope, is_active)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_institution "
        "ON marketplace_listings(institution_id, is_active)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_orders_buyer "
        "ON marketplace_orders(buyer_id, status)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_orders_institution "
        "ON marketplace_orders(institution_id, status)",

        # ── individual learning ───────────────────────────────────────────────
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_individual_enrollment_user_status "
        "ON individual_enrollments(user_id, status)",

        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ind_lesson_progress_user "
        "ON individual_lesson_progress(user_id, is_completed)",
    ]

    # Each CONCURRENTLY statement needs its own autocommit connection.
    # Silently skip if the referenced table doesn't exist yet.
    for sql in indexes:
        try:
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as autoconn:
                autoconn.execute(text(sql))
        except Exception as e:
            import logging
            logging.getLogger("alembic.env").warning(f"Skipped index (table may not exist yet): {e}")


def downgrade() -> None:
    conn = op.get_bind()
    index_names = [
        "idx_xp_ledger_user_time",
        "idx_xp_ledger_institution_engine",
        "idx_xp_ledger_user_engine_date",
        "idx_xp_summary_institution_rank",
        "idx_xp_summary_individual_rank",
        "idx_users_inst_role",
        "idx_users_user_type",
        "idx_payments_institution",
        "idx_marketplace_listings_scope_active",
        "idx_marketplace_listings_institution",
        "idx_marketplace_orders_buyer",
        "idx_marketplace_orders_institution",
        "idx_individual_enrollment_user_status",
        "idx_ind_lesson_progress_user",
    ]
    for name in index_names:
        conn.execute(text(f"DROP INDEX CONCURRENTLY IF EXISTS {name}"))
