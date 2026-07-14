"""BI Reports API - revenue, food cost, labor cost, profit."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ban_hang import Order, OrderItem, Product

router = APIRouter(prefix="/quan-ly/reports/bi", tags=["quan-ly"])


@router.get("/revenue")
async def revenue_report(
    from_date: str = Query("", alias="from"),
    to_date: str = Query("", alias="to"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Revenue report with daily breakdown."""
    q = select(
        func.date(Order.paid_at).label("day"),
        func.count(Order.id).label("order_count"),
        func.sum(Order.total_amount).label("total"),
        func.sum(Order.discount).label("discount"),
    ).where(Order.status == "da_thanh_toan", Order.paid_at.isnot(None))

    if from_date:
        q = q.where(Order.paid_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.where(Order.paid_at <= datetime.fromisoformat(to_date) + timedelta(days=1))

    q = q.group_by(func.date(Order.paid_at)).order_by(func.date(Order.paid_at).desc()).limit(90)
    result = await db.execute(q)

    rows = []
    total_rev = 0
    total_orders = 0
    for r in result.all():
        rows.append(
            {
                "date": str(r.day),
                "orders": r.order_count,
                "revenue": float(r.total or 0),
                "discount": float(r.discount or 0),
            }
        )
        total_rev += float(r.total or 0)
        total_orders += r.order_count

    return {
        "rows": rows,
        "summary": {"total_revenue": round(total_rev, 2), "total_orders": total_orders},
    }


@router.get("/food-cost")
async def food_cost_report(
    from_date: str = Query("", alias="from"),
    to_date: str = Query("", alias="to"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Food cost = total cost of ingredients vs revenue."""
    rev = await db.execute(
        select(func.sum(Order.total_amount)).where(Order.status == "da_thanh_toan")
    )
    total_rev = float(rev.scalar() or 1)  # avoid div by zero

    # Total cost from recipe costs

    # Simple approach: sum cost_price from products that were sold
    cost_result = await db.execute(
        select(func.sum(OrderItem.quantity * Product.cost_price)).join(
            Product, OrderItem.product_id == Product.id
        )
    )
    # ponytail: uses basic product cost_price, not exact BOM cost - upgrade when BOM is complete
    total_cost = float(cost_result.scalar() or 0)

    return {
        "total_revenue": round(total_rev, 2),
        "total_food_cost": round(total_cost, 2),
        "food_cost_pct": round(total_cost / total_rev * 100, 1),
    }
