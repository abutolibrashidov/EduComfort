"""add_user_type_and_scoped_columns — Rev 001 (ADDITIVE ONLY)

Revision ID: a001_add_user_type
Revises: e1a2b3c4d5e6
Create Date: 2026-03-03

SAFE: Only adds nullable columns and a column with a DEFAULT.
No existing data is modified. No constraints added.
Can be applied with zero downtime.

Next: Rev 002 (backfill), Rev 003 (new tables)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a001_add_user_type"
down_revision: Union[str, Sequence[str], None] = "e1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users: add user_type discriminator ──────────────────────────────────
    # Default 'institution' covers all existing users correctly.
    # Platform admins will be backfilled to 'platform' in Rev 002.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_type",
                sa.String(20),
                nullable=False,
                server_default="institution",
            )
        )

    # ── payments: add institution_id (nullable — backfilled in Rev 002) ─────
    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(
            sa.Column(
                "institution_id",
                sa.Integer(),
                sa.ForeignKey("institutions.id", ondelete="SET NULL"),
                nullable=True,
            )
        )

    # ── online_courses: add institution_id (nullable — backfilled in Rev 002)
    # NULL = globally available course; set = institution-private course.
    with op.batch_alter_table("online_courses") as batch_op:
        batch_op.add_column(
            sa.Column(
                "institution_id",
                sa.Integer(),
                sa.ForeignKey("institutions.id", ondelete="SET NULL"),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("online_courses") as batch_op:
        batch_op.drop_column("institution_id")

    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_column("institution_id")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("user_type")
