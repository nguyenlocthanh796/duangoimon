"""Service: issue a Cash-Register ('M') invoice for a paid order.

Extracted so both the API router and the payment hook can issue
without circular imports.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.einvoice import CashRegisterInvoiceClient
from app.models.ban_hang import Order
from app.models.ke_toan import CashRegisterInvoice

_crp = CashRegisterInvoiceClient()


async def issue_for_order(
    db: AsyncSession, order: Order, buyer_name: str | None = None,
    buyer_tax_code: str | None = None, buyer_personal_id: str | None = None,
) -> CashRegisterInvoice | None:
    """Issue an M-invoice for a paid order. Idempotent. Returns invoice."""
    if order.status not in ("da_thanh_toan", "paid"):
        return None
    existing = (
        await db.execute(
            select(CashRegisterInvoice).where(
                CashRegisterInvoice.order_id == order.id,
                CashRegisterInvoice.adjustment_of.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    inv = CashRegisterInvoice(
        branch_id=order.branch_id,
        order_id=order.id,
        buyer_name=buyer_name,
        buyer_tax_code=buyer_tax_code,
        buyer_personal_id=buyer_personal_id,
        total=float(order.total_amount),
        status="moi",
    )
    db.add(inv)
    await db.flush()

    result = await _crp.issue(inv.invoice_code, {"order_id": str(order.id)})
    inv.tax_auth_status = result.get("tax_auth_status", "da_tiep_nhan")
    inv.status = "da_phat_hanh"
    inv.qr_data = f"https://cashregister.gov.vn/lookup?c={inv.invoice_code}"
    return inv
