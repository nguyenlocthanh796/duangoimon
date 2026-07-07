"""add_soft_delete_to_tables

Revision ID: add_soft_delete
Revises: 07a8d1e94394
Create Date: 2026-07-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "add_soft_delete"
down_revision: Union[str, None] = "07a8d1e94394"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All tables that should support soft delete
TABLES = [
    "branches", "users", "tables", "products", "orders", "order_items",
    "inventory", "inventory_transactions", "shift_logs",
    "suppliers", "purchase_orders", "purchase_order_items",
    "raw_materials", "recipes", "recipe_items",
    "transactions", "invoices",
    "stations",
    "customers",
    "membership_tiers", "loyalty_points",
    "vouchers", "promo_rules",
    "campaigns", "message_logs",
    "bookings",
]


def upgrade() -> None:
    for table in TABLES:
        try:
            op.add_column(
                table,
                sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
                schema=None,
            )
        except Exception:
            pass  # might already exist


def downgrade() -> None:
    for table in TABLES:
        try:
            op.drop_column(table, "deleted_at")
        except Exception:
            pass
