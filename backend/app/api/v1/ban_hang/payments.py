"""Ban-hang Payments API router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.uuid_utils import parse_uuid
from app.models.ban_hang import Order, Table
from app.models.ke_toan import Invoice, Transaction


router = APIRouter(prefix="/ban-hang/payments", tags=["ban-hang"])


class SplitItem(BaseModel):
    method: str = "tien_mat"
    amount: float | None = None


class PaymentCreate(BaseModel):
    order_id: str
    payment_method: str = "tien_mat"
    amount_received: float | None = None
    splits: list[SplitItem] | None = None


@router.post("")
async def process_payment(
    body: PaymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Order).where(Order.id == parse_uuid(body.order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order already paid")

    old_status = order.status
    if body.splits:
        methods = [s.method for s in body.splits]
        order.payment_method = "+".join(methods)
    else:
        order.payment_method = body.payment_method

    # ── Anti-fraud: validate payment amount ──────────────────────────────────
    order_total = float(order.total_amount) if order.total_amount else 0
    if body.amount_received is not None and body.amount_received < order_total:
        raise HTTPException(
            status_code=400,
            detail=f"Số tiền nhận ({body.amount_received:,.0f}đ) nhỏ hơn tổng đơn ({order_total:,.0f}đ)",
        )
    if body.splits:
        split_total = sum((s.amount or 0) for s in body.splits)
        if split_total < order_total:
            raise HTTPException(
                status_code=400,
                detail=f"Tổng tiền split ({split_total:,.0f}đ) nhỏ hơn tổng đơn ({order_total:,.0f}đ)",
            )

    order.status = "da_thanh_toan"
    order.paid_at = datetime.now(timezone.utc)

    if order.table_id:
        await db.execute(update(Table).where(Table.id == order.table_id).values(status="trong"))

    # Auto-generate Invoice and Transaction
    from datetime import date as _date

    # 1. Create Invoice (with retry on token collision)
    existing_inv = await db.execute(select(Invoice).where(Invoice.order_id == order.id).limit(1))
    if not existing_inv.scalar_one_or_none():
        today = _date.today()
        vat_rate = 8.0
        vat_amount = (
            float(order.tax_amount)
            if order.tax_amount
            else round(float(order.total_amount) * vat_rate / 100, 2)
        )
        for attempt in range(3):
            import secrets as _secrets

            inv_num = f"POS-{today.strftime('%y%m%d')}-{_secrets.randbelow(90000) + 10000}"
            try:
                invoice = Invoice(
                    order_id=order.id,
                    branch_id=order.branch_id,
                    invoice_number=inv_num,
                    token="inv_" + _secrets.token_urlsafe(12),
                    buyer_name="Khách vãng lai",
                    total_amount=order.total_amount,
                    vat_rate=vat_rate,
                    vat_amount=vat_amount,
                    status="da_xuat",
                    exported_at=datetime.now(timezone.utc),
                )
                db.add(invoice)
                await db.flush()
                break
            except IntegrityError:
                if attempt == 2:
                    raise
                # Rollback to clean session state, then retry with new token
                await db.rollback()
                continue

    # 2. Create Transaction for general ledger
    transaction = Transaction(
        type="thu",
        category="ban_hang",
        amount=order.total_amount,
        ref_id=order.id,
        note=f"Thanh toán đơn #{str(order.id)[:8].upper()} - {order.payment_method}",
        created_by=parse_uuid(_user["sub"]),
    )
    db.add(transaction)

    # H3: auto-issue Cash-Register ('M') e-invoice for the paid order (NĐ70/2025).
    from app.core.thue.cash_invoice_service import issue_for_order

    await issue_for_order(db, order)

    # H2: Deduct inventory BEFORE commit (atomic)
    from app.core.inventory import deduct_inventory

    await deduct_inventory(str(order.id), db)

    await db.refresh(order)

    # Audit log
    await log_action(
        db,
        str(_user["sub"]),
        _user.get("username"),
        "update",
        "order",
        str(order.id),
        old_value={"status": old_status},
        new_value={"status": "da_thanh_toan", "payment_method": order.payment_method},
        request=request,
    )

    from app.core.fast_cache import invalidate_fast_cache
    invalidate_fast_cache()

    from app.core.ws_manager import ws_manager

    await ws_manager.broadcast(
        "kitchen",
        {
            "event": "order_updated",
            "order": {"id": str(order.id), "status": "da_thanh_toan"},
        },
    )

    if order.table_id:
        await ws_manager.broadcast(
            "kitchen",
            {
                "event": "table_updated",
                "table": {"id": str(order.table_id), "status": "trong"},
            },
        )

    return {"status": "ok", "order_id": str(order.id)}
