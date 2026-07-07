import uuid
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.ke_toan import Invoice
from app.models.ban_hang import Order

router = APIRouter(prefix="/ke-toan/invoices", tags=["ke-toan"])


class InvoiceCreate(BaseModel):
    order_id: str
    buyer_name: str | None = None
    buyer_tax_code: str | None = None
    vat_rate: float = 10


def _gen_inv_num() -> str:
    today = date.today()
    return f"POS-{today.strftime('%y%m%d')}-{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"


def _inv_dict(inv: Invoice) -> dict:
    return {
        "id": str(inv.id),
        "order_id": str(inv.order_id) if inv.order_id else None,
        "invoice_number": inv.invoice_number,
        "buyer_name": inv.buyer_name,
        "buyer_tax_code": inv.buyer_tax_code,
        "total_amount": float(inv.total_amount or 0),
        "vat_rate": float(inv.vat_rate or 0),
        "vat_amount": float(inv.vat_amount or 0) if inv.vat_amount else None,
        "status": inv.status,
        "exported_at": inv.exported_at.isoformat() if inv.exported_at else None,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.get("")
async def list_invoices(db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Invoice).order_by(Invoice.created_at.desc()).limit(50))
    return [_inv_dict(inv) for inv in result.scalars()]


@router.post("", status_code=201)
async def create_invoice(body: InvoiceCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    # Verify order exists
    result = await db.execute(select(Order).where(Order.id == uuid.UUID(body.order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order not yet paid")

    # Check existing
    existing = await db.execute(select(Invoice).where(Invoice.order_id == uuid.UUID(body.order_id)).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invoice already exists for this order")

    vat_amount = round(float(order.total_amount) * body.vat_rate / 100, 2)
    inv = Invoice(
        order_id=order.id,
        invoice_number=_gen_inv_num(),
        buyer_name=body.buyer_name,
        buyer_tax_code=body.buyer_tax_code,
        total_amount=order.total_amount,
        vat_rate=body.vat_rate,
        vat_amount=vat_amount,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return _inv_dict(inv)


@router.post("/{invoice_id}/export")
async def export_invoice(invoice_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Invoice).where(Invoice.id == uuid.UUID(invoice_id)))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "da_xuat":
        raise HTTPException(status_code=400, detail="Invoice already exported")
    inv.status = "da_xuat"
    inv.exported_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(inv)
    return _inv_dict(inv)

