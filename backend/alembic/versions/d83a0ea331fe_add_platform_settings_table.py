"""Add platform_settings table

Revision ID: d83a0ea331fe
Revises: c2f17efa6280
Create Date: 2026-03-04 19:14:13.884890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd83a0ea331fe'
down_revision: Union[str, Sequence[str], None] = 'c2f17efa6280'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create platform_settings table for dynamic platform configuration."""
    op.create_table(
        'platform_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_platform_settings_id'), 'platform_settings', ['id'], unique=False)
    op.create_index(op.f('ix_platform_settings_key'), 'platform_settings', ['key'], unique=True)


def downgrade() -> None:
    """Drop platform_settings table."""
    op.drop_index(op.f('ix_platform_settings_key'), table_name='platform_settings')
    op.drop_index(op.f('ix_platform_settings_id'), table_name='platform_settings')
    op.drop_table('platform_settings')
