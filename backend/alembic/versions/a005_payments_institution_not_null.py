"""enforce_payments_institution_not_null — Rev 005 (CONSTRAINT)

Revision ID: a005_payments_institution_not_null
Revises: a004_add_composite_indexes
Create Date: 2026-03-03

Enforces NOT NULL on payments.institution_id ONLY after:
  1. Rev 002 backfill has run
  2. Manual integrity check confirms no orphaned NULL rows remain:

     -- Run before applying this revision:
     SELECT COUNT(*) FROM payments WHERE institution_id IS NULL;
     -- Expected: 0 or only rows where student was deleted (orphaned)
     -- Handle orphaned rows manually before applying this revision.

If orphaned rows still exist, assign them to a default institution
or mark them before running this migration.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a005_payments_institution_not_null"
down_revision: Union[str, Sequence[str], None] = "a004_add_composite_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enforce NOT NULL on payments.institution_id
    # Only safe after Rev 002 backfill + integrity verification.
    with op.batch_alter_table("payments") as batch_op:
        batch_op.alter_column(
            "institution_id",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade() -> None:
    # Revert to nullable
    with op.batch_alter_table("payments") as batch_op:
        batch_op.alter_column(
            "institution_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
