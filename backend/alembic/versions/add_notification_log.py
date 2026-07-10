"""add notification_logs table

Revision ID: add_notification_log
Revises: 76dcd031fd7e
Create Date: 2026-07-09 14:44:00.000000

Creates the notification_logs table used by the tax-compliance alert
engine (P3.1) to persist every deadline/tier escalation as an auditable
record.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_notification_log'
down_revision: Union[str, None] = '76dcd031fd7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notification_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=True),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('channel', sa.String(length=16), nullable=False, server_default='in_app'),
        sa.Column('recipient', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('ref_type', sa.String(length=32), nullable=True),
        sa.Column('ref_id', sa.String(length=64), nullable=True),
        sa.Column('delivered', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_logs_branch_created',
                    'notification_logs', ['branch_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_notification_logs_branch_created', table_name='notification_logs')
    op.drop_table('notification_logs')
