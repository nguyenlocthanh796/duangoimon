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
    try:
        result = await db.execute(
            select(Order).where(Order.id == parse_uuid(body.order_id)).with_for_update()
        )
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
            # Cancel any lingering draft/moi orders on this table to prevent ghost orders
            await db.execute(
                update(Order)
                .where(Order.table_id == order.table_id)
                .where(Order.status == "moi")
                .where(Order.id != order.id)
                .values(status="da_huy")
            )

        # 1. Create Invoice (with retry on token collision via savepoints)
        from datetime import date as _date
        existing_inv = await db.execute(select(Invoice).where(Invoice.order_id == order.id).limit(1))
        if not existing_inv.scalar_one_or_none():
            today = _date.today()
            vat_rate = 8.0
            vat_amount = (
                float(order.tax_amount)
                if order.tax_amount is not None
                else round(float(order.total_amount or 0) * vat_rate / 100, 2)
            )
            for attempt in range(3):
                import secrets as _secrets

                inv_num = f"POS-{today.strftime('%y%m%d')}-{_secrets.randbelow(90000) + 10000}"
                try:
                    async with db.begin_nested():
                        invoice = Invoice(
                            order_id=order.id,
                            branch_id=order.branch_id,
                            invoice_number=inv_num,
                            token="inv_" + _secrets.token_urlsafe(12),
                            buyer_name="Khách vãng lai",
                            total_amount=order.total_amount or 0,
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
                    continue

        # 2. Create Transaction for general ledger
        user_sub_uuid = None
        user_sub = _user.get("sub") if isinstance(_user, dict) else None
        if user_sub:
            try:
                user_sub_uuid = parse_uuid(str(user_sub))
            except Exception:
                user_sub_uuid = None

        transaction = Transaction(
            branch_id=order.branch_id,
            type="thu",
            category="ban_hang",
            amount=order.total_amount or 0,
            ref_id=order.id,
            note=f"Thanh toán đơn #{str(order.id)[:8].upper()} - {order.payment_method}",
            created_by=user_sub_uuid,
        )
        db.add(transaction)

        # H3: auto-issue Cash-Register ('M') e-invoice — non-critical, must not fail payment
        try:
            from app.core.thue.cash_invoice_service import issue_for_order
            await issue_for_order(db, order)
        except Exception as _e:
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "M-invoice issue failed (non-fatal), order=%s: %s", order.id, _e
            )

        # H2: Deduct inventory BEFORE commit (atomic)
        from app.core.inventory import deduct_inventory
        await deduct_inventory(str(order.id), db)

        # 3. Update HKD Profile revenue_ytd automatically
        from app.models.thue.hkd_profile import HKDProfile
        from decimal import Decimal
        if order.branch_id:
            profile_result = await db.execute(select(HKDProfile).where(HKDProfile.branch_id == order.branch_id))
            hkd_profile = profile_result.scalar_one_or_none()
            if hkd_profile:
                hkd_profile.revenue_ytd = Decimal(str(hkd_profile.revenue_ytd or 0)) + Decimal(str(order.total_amount or 0))
                db.add(hkd_profile)

        # Audit log
        user_id_str = str(user_sub) if user_sub else "system"
        username_str = _user.get("username") if isinstance(_user, dict) else None
        await log_action(
            db,
            user_id_str,
            username_str,
            "update",
            "order",
            str(order.id),
            old_value={"status": old_status},
            new_value={"status": "da_thanh_toan", "payment_method": order.payment_method},
            request=request,
        )

        # Commit all changes atomically before refresh
        from app.core.fast_cache import invalidate_fast_cache
        await db.commit()
        await db.refresh(order)

        invalidate_fast_cache()

        from app.core.ws_manager import ws_manager

        order_evt = {
            "event": "order_updated",
            "order": {"id": str(order.id), "status": "da_thanh_toan"},
        }
        await ws_manager.broadcast("kitchen", order_evt)
        await ws_manager.broadcast("pos", order_evt)

        if order.table_id:
            tbl_evt = {
                "event": "table_updated",
                "table": {"id": str(order.table_id), "status": "trong"},
            }
            await ws_manager.broadcast("kitchen", tbl_evt)
            await ws_manager.broadcast("pos", tbl_evt)

        return {"status": "ok", "order_id": str(order.id)}

    except HTTPException:
        raise  # re-raise expected HTTP errors as-is
    except Exception as e:
        await db.rollback()
        import logging
        logging.getLogger(__name__).exception("process_payment failed")
        raise HTTPException(status_code=500, detail=f"Payment failed: {e}")
