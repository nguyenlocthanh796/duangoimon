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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check users
    columns_users = [c["name"] for c in inspector.get_columns("users", schema="public")]
    if "branch_id" not in columns_users:
        op.add_column("users", sa.Column("branch_id", sa.UUID(), nullable=True), schema="public")
        
    # Check audit_logs
    columns_audit = [c["name"] for c in inspector.get_columns("audit_logs", schema="public")]
    if "branch_id" not in columns_audit:
        op.add_column("audit_logs", sa.Column("branch_id", sa.UUID(), nullable=True), schema="public")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Check users
    columns_users = [c["name"] for c in inspector.get_columns("users", schema="public")]
    if "branch_id" in columns_users:
        op.drop_column("users", "branch_id", schema="public")
        
    # Check audit_logs
    columns_audit = [c["name"] for c in inspector.get_columns("audit_logs", schema="public")]
    if "branch_id" in columns_audit:
        op.drop_column("audit_logs", "branch_id", schema="public")
