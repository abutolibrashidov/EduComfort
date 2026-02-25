"""add billing fields to subscription

Revision ID: e1a2b3c4d5e6
Revises: d63e2971e347
Create Date: 2026-02-23 22:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd63e2971e347'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Oylik hisob-kitob uchun yangi ustunlar qo'shish"""
    # Add billing fields to institution_subscriptions table
    # Using batch_alter_table for SQLite compatibility
    with op.batch_alter_table('institution_subscriptions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('monthly_price', sa.Float(), nullable=True, server_default='0.0'))
        batch_op.add_column(sa.Column('contact_phone', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('last_notified_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('payment_received_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('blocked_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Billing ustunlarini o'chirish"""
    with op.batch_alter_table('institution_subscriptions', schema=None) as batch_op:
        batch_op.drop_column('blocked_at')
        batch_op.drop_column('payment_received_at')
        batch_op.drop_column('last_notified_at')
        batch_op.drop_column('contact_phone')
        batch_op.drop_column('monthly_price')
