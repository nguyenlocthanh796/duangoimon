"""add_pos_settings_table

Revision ID: 52640838058b
Revises: 8529c76ae78f
Create Date: 2026-07-30 13:35:42.090600
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '52640838058b'
down_revision: Union[str, None] = '8529c76ae78f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS public.pos_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default_store',
        settings_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.pos_settings CASCADE;")
