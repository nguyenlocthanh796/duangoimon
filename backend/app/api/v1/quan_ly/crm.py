"""CRM API - customers CRUD + purchase history."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Order
from app.models.crm import Customer

router = APIRouter(prefix="/quan-ly/customers", tags=["quan-ly"])


class CustomerCreate(BaseModel):
    name: str = Field(..., max_length=200)
    phone: str = Field(..., max_length=20, pattern="^[0-9\\-\\+]+$")
    email: str | None = Field(None, max_length=100)
    address: str | None = Field(None, max_length=500)


def _customer_dict(c: Customer) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "address": c.address,
        "total_spent": float(c.total_spent),
        "visit_count": c.visit_count,
        "last_visit": c.last_visit.isoformat() if c.last_visit else None,
        "created_at": c.created_at.isoformat(),
        "is_active": c.is_active,
    }


@router.get("", response_model=list[dict])
async def list_customers(
    search: str = Query("", max_length=50),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    q = select(Customer).order_by(Customer.created_at.desc())
    if search.strip():
        like = f"%{search.strip()}%"
        q = q.where(Customer.name.ilike(like) | Customer.phone.ilike(like))
    result = await db.execute(q.limit(100))
    return [_customer_dict(c) for c in result.scalars().all()]


@router.get("/{customer_id}")
async def get_customer(
    customer_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Customer).where(Customer.id == uuid.UUID(customer_id)))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_dict(c)


@router.post("", status_code=201)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    existing = await db.execute(select(Customer).where(Customer.phone == body.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone already exists")
    c = Customer(name=body.name, phone=body.phone, email=body.email, address=body.address)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _customer_dict(c)


@router.get("/{customer_id}/orders")
async def customer_orders(
    customer_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    """Get purchase history for a customer."""
    # Simple approach: orders are linked via note field or cashier_id
    # In practice, Order would have a customer_id FK â€” return empty for now
    return []
