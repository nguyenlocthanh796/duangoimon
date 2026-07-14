"""Shift management API - start/end shift, get active shift, history."""

from app.core.uuid_utils import parse_uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.quan_ly import ShiftLog

router = APIRouter(prefix="/quan-ly/shifts", tags=["quan-ly"])


class ShiftStart(BaseModel):
    opening_balance: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)


class ShiftEnd(BaseModel):
    cash_end: Decimal = Field(..., max_digits=14, decimal_places=2)
    expense_total: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)
    note: str | None = Field(None, max_length=500)


def _shift_dict(s: ShiftLog) -> dict:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id) if s.user_id else None,
        "shift_code": s.shift_code,
        "start_at": s.start_at.isoformat() if s.start_at else None,
        "end_at": s.end_at.isoformat() if s.end_at else None,
        "opening_balance": float(s.opening_balance or 0),
        "closing_balance": float(s.closing_balance or 0),
        "cash_end": float(s.cash_end or 0),
        "card_total": float(s.card_total or 0),
        "transfer_total": float(s.transfer_total or 0),
        "total_revenue": float(s.total_revenue or 0),
        "expense_total": float(s.expense_total or 0),
        "difference": float(s.difference or 0) if s.difference else None,
        "status": s.status or "dang_lam",
        "note": s.note,
    }


@router.get("/active")
async def get_active_shift(
    db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)
):
    """Get current active shift for this user."""
    result = await db.execute(
        select(ShiftLog)
        .where(
            ShiftLog.user_id == parse_uuid(user["sub"]),
            ShiftLog.status == "dang_lam",
        )
        .order_by(ShiftLog.start_at.desc())
        .limit(1)
    )
    shift = result.scalar_one_or_none()
    if not shift:
        return None
    return _shift_dict(shift)


@router.post("/start")
async def start_shift(
    body: ShiftStart, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)
):
    """Start a new shift."""
    uid = parse_uuid(user["sub"])
    # Check no active shift
    result = await db.execute(
        select(ShiftLog)
        .where(
            ShiftLog.user_id == uid,
            ShiftLog.status == "dang_lam",
        )
        .limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already have an active shift")

    shift = ShiftLog(
        user_id=uid,
        shift_code=f"CA-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
        opening_balance=body.opening_balance,
        status="dang_lam",
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return _shift_dict(shift)


@router.post("/{shift_id}/end")
async def end_shift(
    shift_id: str,
    body: ShiftEnd,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """End shift, calculate summary."""
    result = await db.execute(select(ShiftLog).where(ShiftLog.id == parse_uuid(shift_id)))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == "da_ket_thuc":
        raise HTTPException(status_code=400, detail="Shift already ended")

    uid = parse_uuid(user["sub"])
    # Calculate totals from paid orders in this shift
    from app.models.ban_hang import Order

    orders_result = await db.execute(
        select(Order).where(
            Order.cashier_id == uid,
            Order.paid_at >= shift.start_at,
            Order.status == "da_thanh_toan",
        )
    )
    orders = orders_result.scalars().all()
    total_revenue = sum(float(o.total_amount or 0) for o in orders)
    cash_total = sum(float(o.total_amount or 0) for o in orders if o.payment_method == "tien_mat")
    card_total = sum(float(o.total_amount or 0) for o in orders if o.payment_method == "card")
    transfer_total = sum(
        float(o.total_amount or 0)
        for o in orders
        if o.payment_method in ("chuyen_khoan", "momo", "zalopay")
    )

    shift.end_at = datetime.now(timezone.utc)
    shift.cash_end = body.cash_end
    shift.card_total = card_total
    shift.transfer_total = transfer_total
    shift.total_revenue = total_revenue
    shift.expense_total = body.expense_total
    shift.closing_balance = body.cash_end
    shift.difference = body.cash_end - shift.opening_balance - cash_total
    shift.status = "da_ket_thuc"
    shift.note = body.note or shift.note

    await db.commit()
    await db.refresh(shift)
    return _shift_dict(shift)


@router.get("")
async def list_shifts(
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(ShiftLog)
        .where(ShiftLog.user_id == parse_uuid(user["sub"]))
        .order_by(ShiftLog.start_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return [_shift_dict(s) for s in result.scalars()]
