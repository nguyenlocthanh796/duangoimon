"""Menu Engineering Dashboard — Boston matrix, top/bottom sellers."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ban_hang import Order, OrderItem, Product

router = APIRouter(prefix="/quan-ly/menu-eng", tags=["quan-ly"])


@router.get("/matrix")
async def boston_matrix(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Boston Consulting Group matrix for menu items.

    Stars: high popularity, high profit margin
    Plowhorses: high popularity, low profit margin
    Puzzles: low popularity, high profit margin
    Dogs: low popularity, low profit margin
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Get all products with order stats
    products = await db.execute(select(Product).where(Product.is_active == True))
    product_map = {}
    for p in products.scalars().all():
        margin = 0
        if p.price > 0:
            margin = (p.price - p.cost_price) / p.price * 100
        product_map[str(p.id)] = {
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price),
            "cost_price": float(p.cost_price),
            "margin_pct": round(margin, 1),
            "qty_sold": 0,
            "revenue": 0.0,
        }

    # Get order items in period
    items = await db.execute(
        select(OrderItem.product_id, func.sum(OrderItem.quantity), func.sum(OrderItem.total))
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.paid_at >= since, Order.status == "da_thanh_toan")
        .group_by(OrderItem.product_id)
    )
    for pid, qty, rev in items.all():
        if pid and str(pid) in product_map:
            product_map[str(pid)]["qty_sold"] = qty or 0
            product_map[str(pid)]["revenue"] = float(rev or 0)

    # Classify
    all_items = list(product_map.values())
    if not all_items:
        return {"stars": [], "plowhorses": [], "puzzles": [], "dogs": [], "summary": {}}

    avg_qty = sum(i["qty_sold"] for i in all_items) / len(all_items)
    avg_margin = sum(i["margin_pct"] for i in all_items) / len(all_items)

    result = {"stars": [], "plowhorses": [], "puzzles": [], "dogs": []}
    for item in all_items:
        if item["qty_sold"] >= avg_qty and item["margin_pct"] >= avg_margin:
            result["stars"].append(item)
        elif item["qty_sold"] >= avg_qty:
            result["plowhorses"].append(item)
        elif item["margin_pct"] >= avg_margin:
            result["puzzles"].append(item)
        else:
            result["dogs"].append(item)

    result["summary"] = {
        "total_items": len(all_items),
        "avg_qty_sold": round(avg_qty, 1),
        "avg_margin_pct": round(avg_margin, 1),
        "period_days": days,
    }
    return result


@router.get("/top-bottom")
async def top_bottom_sellers(
    days: int = Query(30, ge=1, le=365),
    top_n: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    items = await db.execute(
        select(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_qty"),
            func.sum(OrderItem.total).label("total_rev"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.paid_at >= since, Order.status == "da_thanh_toan")
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
    )
    rows = items.all()
    top = [
        {"name": r.product_name, "qty": r.total_qty or 0, "revenue": float(r.total_rev or 0)}
        for r in rows[:top_n]
    ]
    bottom = [
        {"name": r.product_name, "qty": r.total_qty or 0, "revenue": float(r.total_rev or 0)}
        for r in rows[-top_n:]
    ]
    bottom.reverse()
    return {"top": top, "bottom": bottom}
