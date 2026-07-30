"""Online Booking API - Fully fixed & compatible with frontend requirements."""

import uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.uuid_utils import parse_uuid
from app.models.booking import Booking

router = APIRouter(prefix="/quan-ly/bookings", tags=["quan-ly"])


class BookingCreate(BaseModel):
    customer_name: str = Field(..., max_length=200)
    customer_phone: str | None = Field(None, max_length=50)
    phone: str | None = Field(None, max_length=50, description="[Deprecated] use customer_phone")
    guest_count: int | None = Field(default=1, ge=1, le=1000)
    booking_date: str | None = None  # YYYY-MM-DD
    booking_time: str | None = None  # HH:MM
    table_number: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=500)
    status: str | None = Field(default="pending", max_length=20)


class BookingUpdate(BaseModel):
    customer_name: str | None = Field(None, max_length=200)
    customer_phone: str | None = Field(None, max_length=50)
    phone: str | None = Field(None, max_length=50, description="[Deprecated] use customer_phone")
    guest_count: int | None = Field(None, ge=1, le=1000)
    booking_date: str | None = None
    booking_time: str | None = None
    table_number: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=500)
    status: str | None = Field(None, max_length=20)


def _booking_dict(b: Booking) -> dict:
    phone_val = b.customer_phone or ""
    time_str = b.booking_time.strftime("%H:%M") if b.booking_time else "--:--"
    date_str = b.booking_date.isoformat() if b.booking_date else date.today().isoformat()
    table_num = getattr(b, "table_number", None) or ""

    return {
        "id": str(b.id),
        "customer_name": b.customer_name,
        "phone": phone_val,
        "customer_phone": phone_val,
        "guest_count": b.guest_count or 1,
        "booking_date": date_str,
        "booking_time": time_str,
        "table_number": table_num,
        "note": b.note or "",
        "status": b.status or "pending",
        "confirmed_at": b.confirmed_at.isoformat() if b.confirmed_at else None,
        "created_at": b.created_at.isoformat() if b.created_at else datetime.now(timezone.utc).isoformat(),
    }


def _parse_time(time_str: str | None) -> time:
    if not time_str:
        now = datetime.now()
        return time(hour=now.hour, minute=now.minute)
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return time(hour=h, minute=m)
    except Exception:
        now = datetime.now()
        return time(hour=now.hour, minute=now.minute)


def _parse_date(date_str: str | None) -> date:
    if not date_str:
        return date.today()
    try:
        return date.fromisoformat(date_str.strip())
    except Exception:
        return date.today()


@router.get("", response_model=list[dict])
async def list_bookings(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Booking).order_by(Booking.created_at.desc())
    result = await db.execute(query)
    bookings = result.scalars().all()
    return [_booking_dict(b) for b in bookings]


@router.post("", status_code=201)
async def create_booking(
    body: BookingCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    phone_val = body.phone or body.customer_phone or ""
    b_date = _parse_date(body.booking_date)
    b_time = _parse_time(body.booking_time)

    b = Booking(
        customer_name=body.customer_name,
        customer_phone=phone_val,
        guest_count=body.guest_count or 1,
        booking_date=b_date,
        booking_time=b_time,
        table_number=body.table_number,
        note=body.note,
        status=body.status or "pending",
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)


@router.put("/{booking_id}")
async def update_booking(
    booking_id: str,
    body: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    uid = parse_uuid(booking_id)
    result = await db.execute(select(Booking).where(Booking.id == uid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    if body.customer_name is not None:
        b.customer_name = body.customer_name
    if body.phone is not None or body.customer_phone is not None:
        b.customer_phone = body.phone or body.customer_phone or b.customer_phone
    if body.guest_count is not None:
        b.guest_count = body.guest_count
    if body.booking_date is not None:
        b.booking_date = _parse_date(body.booking_date)
    if body.booking_time is not None:
        b.booking_time = _parse_time(body.booking_time)
    if body.table_number is not None:
        b.table_number = body.table_number
    if body.note is not None:
        b.note = body.note
    if body.status is not None:
        b.status = body.status
        if body.status == "confirmed" and not b.confirmed_at:
            b.confirmed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)


@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    uid = parse_uuid(booking_id)
    result = await db.execute(select(Booking).where(Booking.id == uid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")

    await db.delete(b)
    await db.commit()
    return {"message": "Đã xóa đặt bàn thành công"}


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    uid = parse_uuid(booking_id)
    result = await db.execute(select(Booking).where(Booking.id == uid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")
    b.status = "confirmed"
    b.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    uid = parse_uuid(booking_id)
    result = await db.execute(select(Booking).where(Booking.id == uid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt bàn")
    b.status = "cancelled"
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)
