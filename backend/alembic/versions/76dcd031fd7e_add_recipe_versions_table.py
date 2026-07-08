"""add recipe_versions table

Revision ID: 76dcd031fd7e
Revises: add_invoice_token
Create Date: 2026-07-08 16:16:06.939876
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '76dcd031fd7e'
down_revision: Union[str, None] = 'add_invoice_token'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('recipe_versions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('recipe_id', sa.UUID(), nullable=False),
    sa.Column('version_number', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('cost_price', sa.Numeric(precision=14, scale=2), nullable=False),
    sa.Column('items_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('changed_by', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['recipe_id'], ['quan_ly.recipes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    schema='quan_ly'
    )


def downgrade() -> None:
    op.drop_table('recipe_versions', schema='quan_ly')
