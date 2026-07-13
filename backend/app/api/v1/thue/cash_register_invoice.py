"""Cash-register e-invoice (M-invoice, Nghị định 70/2025) API.

Endpoints:
  POST /thue/cash-invoices/issue     issue an M-invoice from a paid order
  POST /thue/cash-invoices/{id}/adjust  replace/adjust (never cancel)
  GET  /thue/cash-invoices/{id}      retrieve + tax-authority status
  POST /thue/cash-invoices/{id}/deliver  push via QR/Zalo/Email channels
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.thue.cash_invoice_service import issue_for_order
from app.integrations.einvoice import CashRegisterInvoiceClient
from app.models.ban_hang import Order
from app.models.ke_toan import CashRegisterInvoice

router = APIRouter(prefix="/thue/cash-invoices", tags=["thue"])

_crp = CashRegisterInvoiceClient()


class DeliveryChannels(BaseModel):
    qr: bool = True
    zalo: bool = False
    email: str | None = None


@router.post("/issue", status_code=201)
async def issue_invoice(
    order_id: str,
    buyer_name: str | None = None,
    buyer_tax_code: str | None = None,
    buyer_personal_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    order = (
        await db.execute(select(Order).where(Order.id == uuid.UUID(order_id)))
    ).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("da_thanh_toan", "paid"):
        raise HTTPException(status_code=400, detail="Order not paid yet")

    # One M-invoice per order (idempotent).
    existing = (
        await db.execute(
            select(CashRegisterInvoice).where(
                CashRegisterInvoice.order_id == order.id,
                CashRegisterInvoice.adjustment_of.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing:
        return {
            "id": str(existing.id),
            "invoice_code": existing.invoice_code,
            "status": existing.status,
        }

    inv = await issue_for_order(
        db,
        order,
        buyer_name=buyer_name,
        buyer_tax_code=buyer_tax_code,
        buyer_personal_id=buyer_personal_id,
    )
    await db.commit()
    return {"id": str(inv.id), "invoice_code": inv.invoice_code, "status": inv.status}


@router.post("/{invoice_id}/adjust", status_code=201)
async def adjust_invoice(
    invoice_id: str,
    adjustment_type: str,  # "thay_the" | "dieu_chinh"
    buyer_name: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    original = (
        await db.execute(
            select(CashRegisterInvoice).where(CashRegisterInvoice.id == uuid.UUID(invoice_id))
        )
    ).scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if adjustment_type not in ("thay_the", "dieu_chinh"):
        raise HTTPException(status_code=400, detail="Invalid adjustment type")

    new_inv = CashRegisterInvoice(
        branch_id=original.branch_id,
        order_id=original.order_id,
        adjustment_of=original.id,
        adjustment_type=adjustment_type,
        buyer_name=buyer_name if buyer_name else original.buyer_name,
        total=original.total,
        status="moi",
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)

    result = await _crp.adjust(new_inv.invoice_code, original.invoice_code, {})
    new_inv.tax_auth_status = result.get("tax_auth_status")
    new_inv.status = "da_phat_hanh"
    new_inv.qr_data = f"https://cashregister.gov.vn/lookup?c={new_inv.invoice_code}"
    # NĐ70: original stays valid — NEVER cancel it.
    await db.commit()
    await db.refresh(new_inv)
    return {
        "id": str(new_inv.id),
        "invoice_code": new_inv.invoice_code,
        "adjustment_of": str(original.id),
    }


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    inv = (
        await db.execute(
            select(CashRegisterInvoice).where(CashRegisterInvoice.id == uuid.UUID(invoice_id))
        )
    ).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "id": str(inv.id),
        "invoice_code": inv.invoice_code,
        "order_id": str(inv.order_id),
        "total": float(inv.total),
        "status": inv.status,
        "tax_auth_status": inv.tax_auth_status,
        "qr_data": inv.qr_data,
        "adjustment_of": str(inv.adjustment_of) if inv.adjustment_of else None,
        "adjustment_type": inv.adjustment_type,
    }


@router.post("/{invoice_id}/deliver")
async def deliver_invoice(
    invoice_id: str,
    channels: DeliveryChannels,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    inv = (
        await db.execute(
            select(CashRegisterInvoice).where(CashRegisterInvoice.id == uuid.UUID(invoice_id))
        )
    ).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.delivery_channels = channels.model_dump()
    await db.commit()
    # Stub: push via selected channels (A2: no creds).
    return {"delivered": channels.model_dump(), "status": "queued_stub"}
