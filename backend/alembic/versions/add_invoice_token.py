"""add_invoice_token

Revision ID: add_invoice_token
Revises: ca6d85a79a51
Create Date: 2026-07-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "add_invoice_token"
down_revision: Union[str, None] = "ca6d85a79a51"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("token", sa.String(24), nullable=False, server_default=""),
        schema="ke_toan",
    )
    # backfill existing rows, then drop default
    op.execute(
        "UPDATE ke_toan.invoices SET token = 'inv_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) WHERE token = ''"
    )
    op.alter_column("invoices", "token", server_default=None, schema="ke_toan")
    op.create_unique_constraint("uq_invoices_token", "invoices", ["token"], schema="ke_toan")


def downgrade() -> None:
    op.drop_constraint("uq_invoices_token", "invoices", schema="ke_toan")
    op.drop_column("invoices", "token", schema="ke_toan")
