"""Ke-toan Invoices API router."""

from app.core.uuid_utils import parse_uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.database import get_db
from app.models.ban_hang import Order
from app.models.ke_toan import Invoice

router = APIRouter(prefix="/ke-toan/invoices", tags=["ke-toan"])


ALLOWED_VAT = {0, 5, 8, 10}


class InvoiceCreate(BaseModel):
    order_id: str = Field(..., pattern="^[a-f0-9-]{36}$", description="UUID")
    buyer_name: str | None = Field(None, max_length=200)
    buyer_tax_code: str | None = Field(None, max_length=50, pattern="^[0-9]{10}[A-Z]{3}$")
    vat_rate: float = Field(default=10, ge=0, le=100, description="Thuế suất GTGT (0, 5, 8, 10)")

    @field_validator("vat_rate")
    @classmethod
    def _check_vat(cls, v: float) -> float:
        if v not in ALLOWED_VAT:
            raise ValueError(f"VAT rate phải thuộc {ALLOWED_VAT}")
        return v


def _gen_inv_num() -> str:
    today = date.today()
    return (
        f"POS-{today.strftime('%y%m%d')}-{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
    )


def _inv_dict(inv: Invoice) -> dict:
    return {
        "id": str(inv.id),
        "order_id": str(inv.order_id) if inv.order_id else None,
        "invoice_number": inv.invoice_number,
        "token": inv.token,
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
async def list_invoices(
    db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Invoice).order_by(Invoice.created_at.desc()).limit(50))
    rows = result.scalars().all()
    exported = sum(1 for inv in rows if inv.status == "da_xuat")
    return {
        "items": [_inv_dict(inv) for inv in rows],
        "total": len(rows),
        "exported_count": exported,
    }


@router.post("", status_code=201)
async def create_invoice(
    body: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role("admin", "ke_toan")),
):
    # Verify order exists
    result = await db.execute(select(Order).where(Order.id == parse_uuid(body.order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order not yet paid")

    # Check existing
    existing = await db.execute(
        select(Invoice).where(Invoice.order_id == parse_uuid(body.order_id)).limit(1)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invoice already exists for this order")

    # Anti-fraud: use order's actual tax_amount (computed from DB prices, not client)
    # The client-supplied vat_rate is validated to be one of {0,5,8,10} but we
    # cross-check against the order's real aggregated tax (Order.tax_amount).
    if order.tax_amount is not None and order.tax_amount > 0:
        vat_amount = float(order.tax_amount)
        # Warn if client-supplied rate doesn't match (log only, don't block)
        _implied_rate = round(vat_amount / float(order.total_amount) * 100, 1) if order.total_amount else 0
        _db_vat = body.vat_rate
        if _implied_rate > 0 and abs(_db_vat - _implied_rate) > 1:
            import logging
            logging.getLogger("ke_toan").warning(
                "VAT rate mismatch: client=%s, implied_by_order=%s, order=%s",
                _db_vat, _implied_rate, order.id,
            )
    else:
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


class InvoiceBulkExport(BaseModel):
    ids: list[str]


@router.post("/bulk-export")
async def bulk_export_invoices(
    body: InvoiceBulkExport,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role("admin", "ke_toan")),
):
    try:
        uuids = [parse_uuid(i) for i in body.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice id")
    rows = (
        (
            await db.execute(
                select(Invoice).where(Invoice.id.in_(uuids), Invoice.status != "da_xuat")
            )
        )
        .scalars()
        .all()
    )
    now = datetime.now(timezone.utc)
    for inv in rows:
        inv.status = "da_xuat"
        inv.exported_at = now
    await db.commit()
    return {"exported": len(rows), "status": "ok"}


@router.post("/{invoice_id}/export")
async def export_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role("admin", "ke_toan")),
):
    result = await db.execute(select(Invoice).where(Invoice.id == parse_uuid(invoice_id)))
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


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_role("admin", "ke_toan")),
):
    result = await db.execute(select(Invoice).where(Invoice.id == parse_uuid(invoice_id)))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == "da_xuat":
        raise HTTPException(status_code=400, detail="Không thể xóa hóa đơn đã phát hành VAT")
    await db.delete(inv)
    await db.commit()
    return {"status": "ok", "deleted": invoice_id}
