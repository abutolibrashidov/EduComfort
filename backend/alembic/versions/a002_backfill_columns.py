"""backfill_new_columns — Rev 002 (DATA MIGRATION)

Revision ID: a002_backfill_columns
Revises: a001_add_user_type
Create Date: 2026-03-03

Backfills:
    users.user_type = 'platform' WHERE is_platform_admin = true
    payments.institution_id from users.institution_id JOIN
    online_courses.institution_id from users.institution_id JOIN (on instructor)

SAFE: Uses UPDATE with JOINs. No schema changes. Idempotent if run twice.
After this migration, run data integrity checks before proceeding to Rev 003.

Integrity check (run manually before Rev 003):
    SELECT COUNT(*) FROM payments WHERE institution_id IS NULL;
    -- Should only be 0 or orphaned payments (student deleted).
    -- Orphaned rows: student_id not in users table.
"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy.sql import text

revision: str = "a002_backfill_columns"
down_revision: Union[str, Sequence[str], None] = "a001_add_user_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Backfill user_type for platform admins
    conn.execute(text("""
        UPDATE users
        SET user_type = 'platform'
        WHERE is_platform_admin = true
          AND user_type = 'institution'
    """))

    # 2. Backfill payments.institution_id from the student's institution
    conn.execute(text("""
        UPDATE payments p
        SET institution_id = u.institution_id
        FROM users u
        WHERE p.student_id = u.id
          AND p.institution_id IS NULL
          AND u.institution_id IS NOT NULL
    """))

    # 3. Backfill online_courses.institution_id from the instructor's institution
    conn.execute(text("""
        UPDATE online_courses oc
        SET institution_id = u.institution_id
        FROM users u
        WHERE oc.instructor_id = u.id
          AND oc.institution_id IS NULL
          AND u.institution_id IS NOT NULL
    """))


def downgrade() -> None:
    # Reverting a backfill is destructive — set columns back to NULL
    conn = op.get_bind()

    conn.execute(text("""
        UPDATE users SET user_type = 'institution'
        WHERE user_type = 'platform' AND is_platform_admin = true
    """))

    conn.execute(text("UPDATE payments SET institution_id = NULL"))
    conn.execute(text("UPDATE online_courses SET institution_id = NULL"))
