import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.audit import log_action
from app.models.ban_hang import Order
from app.models.ban_hang import Table


def _uuid(val: str) -> uuid.UUID:
    try:
        return uuid.UUID(val)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {val}")


router = APIRouter(prefix="/ban-hang/payments", tags=["ban-hang"])


class PaymentCreate(BaseModel):
    order_id: str
    payment_method: str = "tien_mat"
    amount_received: float | None = None
    splits: list[dict] | None = None


@router.post("")
async def process_payment(body: PaymentCreate, request: Request, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Order).where(Order.id == _uuid(body.order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order already paid")

    old_status = order.status
    if body.splits:
        methods = [s["method"] for s in body.splits]
        order.payment_method = "+".join(methods)
    else:
        order.payment_method = body.payment_method

    order.status = "da_thanh_toan"
    order.paid_at = datetime.now(timezone.utc)

    if order.table_id:
        await db.execute(update(Table).where(Table.id == order.table_id).values(status="trong"))

    # Auto-generate Invoice and Transaction
    from app.models.ke_toan import Invoice, Transaction
    from datetime import date
    import random

    # 1. Create Invoice (with retry on token collision)
    from sqlalchemy.exc import IntegrityError

    existing_inv = await db.execute(
        select(Invoice).where(Invoice.order_id == order.id).limit(1)
    )
    if not existing_inv.scalar_one_or_none():
        today = date.today()
        vat_rate = 8.0
        vat_amount = float(order.tax_amount) if order.tax_amount else round(float(order.total_amount) * vat_rate / 100, 2)
        for attempt in range(3):
            import secrets
            inv_num = f"POS-{today.strftime('%y%m%d')}-{random.randint(10000, 99999)}"
            try:
                invoice = Invoice(
                    order_id=order.id,
                    branch_id=order.branch_id,
                    invoice_number=inv_num,
                    token="inv_" + secrets.token_urlsafe(12),
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
                await db.rollback()
                if attempt == 2:
                    raise
                continue

    # 2. Create Transaction for general ledger
    transaction = Transaction(
        type="thu",
        category="ban_hang",
        amount=order.total_amount,
        ref_id=order.id,
        note=f"Thanh toán đơn #{str(order.id)[:8].upper()} - {order.payment_method}",
        created_by=uuid.UUID(_user["sub"]),
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
        db, str(_user["sub"]), _user.get("username"),
        "update", "order", str(order.id),
        old_value={"status": old_status},
        new_value={"status": "da_thanh_toan", "payment_method": order.payment_method},
        request=request,
    )

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "order_updated",
        "order": {"id": str(order.id), "status": "da_thanh_toan"},
    })

    return {"status": "ok", "order_id": str(order.id)}
