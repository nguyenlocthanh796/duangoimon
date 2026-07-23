"""Kitchen feed — real-time order item status for bar/kitchen display."""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ban_hang import Order, OrderItem, Table

router = APIRouter(prefix="/ban-hang/kitchen-feed", tags=["ban-hang"])

THRESHOLD_MINUTES = 15


@router.get("")
async def get_kitchen_feed(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return recent order items grouped by status."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=THRESHOLD_MINUTES)

    # Fetch items with status in active states, joined with Order + Table
    stmt = (
        select(OrderItem, Order, Table.name)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Table, Order.table_id == Table.id)
        .where(OrderItem.status.in_(["moi", "dang_lam", "hoan_thanh"]))
        .order_by(Order.created_at.desc())
        .limit(50)
    )
    rows = (await db.execute(stmt)).all()

    items = []
    seen = set()
    for row in rows:
        oi, order, table_name = row
        if oi.id in seen:
            continue
        seen.add(oi.id)
        age_min = (datetime.now(timezone.utc) - order.created_at).total_seconds() / 60
        items.append({
            "id": str(oi.id),
            "tableName": table_name,
            "productName": oi.product_name,
            "quantity": oi.quantity,
            "status": oi.status,
            "note": oi.note or "",
            "orderCreatedAt": order.created_at.isoformat(),
            "ageMinutes": round(age_min, 1),
            "isDelayed": oi.status in ("moi", "dang_lam") and age_min > THRESHOLD_MINUTES,
        })

    return {"items": items, "thresholdMinutes": THRESHOLD_MINUTES}
