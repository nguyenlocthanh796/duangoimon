"""Third-party integrations gateway.

Supports: GrabFood, ShopeeFood, Momo, ZaloPay, VietQR, e-invoice (Viettel/VNPT/MISA).

ponytail: stub implementations. Add real API calls when keys are provisioned.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# ────────────────────────────────────────────
# Delivery Aggregators
# ────────────────────────────────────────────


@dataclass
class DeliveryOrder:
    platform: str  # grab / shopeefood
    order_id: str
    items: list[dict]
    total: float
    customer_name: str
    customer_phone: str
    delivery_address: str
    note: str = ""


async def pull_grab_orders(api_key: str) -> list[DeliveryOrder]:
    """Pull new orders from GrabFood API."""
    raise NotImplementedError("Grab API key required")


async def pull_shopeefood_orders(api_key: str) -> list[DeliveryOrder]:
    """Pull new orders from ShopeeFood API."""
    raise NotImplementedError("ShopeeFood API key required")


# ────────────────────────────────────────────
# Payment Gateways
# ────────────────────────────────────────────


@dataclass
class PaymentResult:
    success: bool
    transaction_id: str | None
    error: str | None = None


async def momo_pay(amount: float, order_info: str, return_url: str) -> PaymentResult:
    """Create Momo payment request."""
    raise NotImplementedError("Momo partner code + secret key required")


async def zalopay_pay(amount: float, order_info: str, return_url: str) -> PaymentResult:
    """Create ZaloPay payment request."""
    raise NotImplementedError("ZaloPay app_id + key1 required")


def generate_vietqr(amount: float, bank_account: str, bank_name: str, note: str) -> str:
    """Generate VietQR image URL (static QR)."""
    import base64
    import json

    # Simplified QR content — in production use VietQR API
    data = json.dumps({"bank": bank_name, "acc": bank_account, "amount": amount, "note": note})
    return f"https://img.vietqr.io/image/{bank_name}-{bank_account}-compact.png?amount={int(amount)}&addInfo={note}"


# ────────────────────────────────────────────
# E-Invoice Gateways
# ────────────────────────────────────────────


@dataclass
class InvoiceResult:
    success: bool
    invoice_number: str | None = None
    error: str | None = None


async def publish_viettel_invoice(invoice_data: dict) -> InvoiceResult:
    """Publish invoice via Viettel E-invoice."""
    raise NotImplementedError("Viettel API credentials required")


async def publish_vnpt_invoice(invoice_data: dict) -> InvoiceResult:
    """Publish invoice via VNPT E-invoice."""
    raise NotImplementedError("VNPT API credentials required")
