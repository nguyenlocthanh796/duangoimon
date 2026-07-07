"""add_missing_columns

Revision ID: ca6d85a79a51
Revises: add_soft_delete
Create Date: 2026-07-07 18:07:41.577570
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'ca6d85a79a51'
down_revision: Union[str, None] = 'add_soft_delete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns that exist in models but not in initial migration
    op.add_column('users', sa.Column('branch_id', sa.UUID(), nullable=True))
    op.add_column('audit_logs', sa.Column('branch_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'branch_id')
    op.drop_column('audit_logs', 'branch_id')
