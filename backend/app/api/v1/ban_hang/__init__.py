"""Ban-hang (POS) API package — tables, products, orders, payments."""
from app.api.v1.ban_hang import kitchen, orders, payments, products, tables  # noqa: F401

__all__ = ["kitchen", "orders", "payments", "products", "tables"]
