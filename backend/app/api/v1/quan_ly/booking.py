"""Online Booking API."""

from app.core.uuid_utils import parse_uuid
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.booking import Booking

router = APIRouter(prefix="/quan-ly/bookings", tags=["quan-ly"])


class BookingCreate(BaseModel):
    customer_name: str = Field(..., max_length=200)
    customer_phone: str = Field(..., max_length=20, pattern="^[0-9\\-\\+]+$")
    guest_count: int = Field(default=1, ge=1, le=1000)
    booking_date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")  # YYYY-MM-DD
    booking_time: str = Field(..., pattern="^\\d{2}:\\d{2}$")  # HH:MM
    note: str | None = Field(None, max_length=500)


def _booking_dict(b: Booking) -> dict:
    return {
        "id": str(b.id),
        "customer_name": b.customer_name,
        "customer_phone": b.customer_phone,
        "guest_count": b.guest_count,
        "booking_date": b.booking_date.isoformat(),
        "booking_time": b.booking_time.strftime("%H:%M"),
        "note": b.note,
        "status": b.status,
        "confirmed_at": b.confirmed_at.isoformat() if b.confirmed_at else None,
        "created_at": b.created_at.isoformat(),
    }


@router.get("", response_model=list[dict])
async def list_bookings(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Booking).order_by(Booking.created_at.desc())
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_booking_dict(b) for b in page_result["items"]]
    return page_result


@router.post("", status_code=201)
async def create_booking(
    body: BookingCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    b = Booking(
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        guest_count=body.guest_count,
        booking_date=date.fromisoformat(body.booking_date),
        booking_time=time.fromisoformat(body.booking_time),
        note=body.note,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Booking).where(Booking.id == parse_uuid(booking_id)))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404)
    b.status = "confirmed"
    b.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Booking).where(Booking.id == parse_uuid(booking_id)))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404)
    b.status = "cancelled"
    await db.commit()
    await db.refresh(b)
    return _booking_dict(b)
