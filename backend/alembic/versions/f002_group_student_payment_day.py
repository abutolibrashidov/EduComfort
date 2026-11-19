"""
Add payment_day, custom_monthly_fee to group_students
Add due_date, paid_at, payment_id, notes to monthly_fees

Revision ID: f002_group_student_payment_day
Revises: f001_make_group_fields_nullable
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa

revision = 'f002_group_student_payment_day'
down_revision = 'f001_make_group_fields_nullable'
branch_labels = None
depends_on = None


def upgrade():
    # ── group_students: add payment_day + custom_monthly_fee ──
    try:
        op.add_column('group_students',
            sa.Column('payment_day', sa.Integer(), nullable=True))
    except Exception:
        pass  # Already exists

    try:
        op.add_column('group_students',
            sa.Column('custom_monthly_fee', sa.Float(), nullable=True))
    except Exception:
        pass  # Already exists

    # ── monthly_fees: add due_date, paid_at, payment_id, notes ──
    try:
        op.add_column('monthly_fees',
            sa.Column('due_date', sa.Date(), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('monthly_fees',
            sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))
    except Exception:
        pass

    try:
        op.add_column('monthly_fees',
            sa.Column('payment_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_monthly_fees_payment_id',
            'monthly_fees', 'payments',
            ['payment_id'], ['id'],
            ondelete='SET NULL'
        )
    except Exception:
        pass

    try:
        op.add_column('monthly_fees',
            sa.Column('notes', sa.String(500), nullable=True))
    except Exception:
        pass


def downgrade():
    op.drop_column('group_students', 'payment_day')
    op.drop_column('group_students', 'custom_monthly_fee')
    op.drop_column('monthly_fees', 'due_date')
    op.drop_column('monthly_fees', 'paid_at')
    op.drop_column('monthly_fees', 'payment_id')
    op.drop_column('monthly_fees', 'notes')
