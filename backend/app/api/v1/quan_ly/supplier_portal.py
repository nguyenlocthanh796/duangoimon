"""Supplier portal API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.supplier import PurchaseOrder, PurchaseOrderItem, Supplier

router = APIRouter(prefix="/quan-ly/suppliers", tags=["quan-ly"])


@router.get("/me")
async def supplier_profile(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get supplier profile of logged-in user."""
    # In production: link supplier_accounts table
    # For MVP: return first supplier
    result = await db.execute(select(Supplier).limit(1))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404)
    return {"id": str(s.id), "name": s.name, "code": s.code, "phone": s.phone, "email": s.email}


@router.get("/purchase-orders", response_model=list[dict])
async def portal_pos(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List POs visible to this supplier."""
    # Get first supplier's POs
    sup = await db.execute(select(Supplier).limit(1))
    s = sup.scalar_one_or_none()
    if not s:
        return []
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.supplier_id == s.id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    return [
        {
            "id": str(po.id),
            "po_number": po.po_number,
            "status": po.status,
            "total_amount": float(po.total_amount),
            "created_at": po.created_at.isoformat() if po.created_at else None,
        }
        for po in result.scalars().all()
    ]


@router.post("/purchase-orders/{po_id}/confirm")
async def portal_confirm_po(
    po_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == uuid.UUID(po_id)))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404)
    po.status = "confirmed"
    await db.commit()
    await db.refresh(po)
    return {"status": "confirmed", "po_number": po.po_number}
