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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    schemas = ["public", "ban_hang", "quan_ly", "ke_toan", "thue"]
    
    for schema in schemas:
        try:
            tables = inspector.get_table_names(schema=schema)
        except Exception:
            continue
        for table in TABLES:
            if table in tables:
                columns = [c["name"] for c in inspector.get_columns(table, schema=schema)]
                if "deleted_at" not in columns:
                    op.add_column(
                        table,
                        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
                        schema=schema,
                    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    schemas = ["public", "ban_hang", "quan_ly", "ke_toan", "thue"]
    
    for schema in schemas:
        try:
            tables = inspector.get_table_names(schema=schema)
        except Exception:
            continue
        for table in TABLES:
            if table in tables:
                columns = [c["name"] for c in inspector.get_columns(table, schema=schema)]
                if "deleted_at" in columns:
                    op.drop_column(table, "deleted_at", schema=schema)
