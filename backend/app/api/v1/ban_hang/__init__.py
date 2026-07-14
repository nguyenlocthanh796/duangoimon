"""Ban-hang (POS) API package — tables, products, orders, payments."""
from app.api.v1.ban_hang import orders, payments, products, tables  # noqa: F401

__all__ = ["orders", "payments", "products", "tables"]
