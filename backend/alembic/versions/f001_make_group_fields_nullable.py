"""Make group fields nullable for school support

Revision ID: f001_make_group_fields_nullable
Revises: c2f17efa6280
Create Date: 2026-03-11

Schools create 'sinflar' (classes) that don't have a single subject,
branch, or english level — these fields should be optional.
Also adds max_students and academic_year_id columns.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'f001_make_group_fields_nullable'
down_revision = '913bc95ba161'
branch_labels = None
depends_on = None


def upgrade():
    # Make subject_id nullable
    op.alter_column('groups', 'subject_id',
                    existing_type=sa.Integer(),
                    nullable=True)

    # Make teacher_id nullable
    op.alter_column('groups', 'teacher_id',
                    existing_type=sa.Integer(),
                    nullable=True)

    # Make branch_id nullable
    op.alter_column('groups', 'branch_id',
                    existing_type=sa.Integer(),
                    nullable=True)

    # Make level nullable (schools don't use IELTS levels)
    op.alter_column('groups', 'level',
                    existing_type=sa.Enum(
                        'beginner', 'elementary', 'pre_intermediate',
                        'intermediate', 'upper_intermediate', 'advanced',
                        name='grouplevel'
                    ),
                    nullable=True)

    # Add max_students if not exists
    try:
        op.add_column('groups', sa.Column('max_students', sa.Integer(), nullable=True, server_default='30'))
    except Exception:
        pass  # Column may already exist

    # Add academic_year_id if not exists
    try:
        op.add_column('groups', sa.Column('academic_year_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_groups_academic_year_id',
            'groups', 'academic_years',
            ['academic_year_id'], ['id'],
            ondelete='SET NULL'
        )
    except Exception:
        pass  # Column may already exist


def downgrade():
    # Reverse: make fields required again
    op.alter_column('groups', 'subject_id',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('groups', 'teacher_id',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('groups', 'branch_id',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('groups', 'level',
                    existing_type=sa.Enum(
                        'beginner', 'elementary', 'pre_intermediate',
                        'intermediate', 'upper_intermediate', 'advanced',
                        name='grouplevel'
                    ),
                    nullable=False)
