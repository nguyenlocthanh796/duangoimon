"""Quan-ly Reports API router."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ban_hang import Order, OrderItem, Product
import logging


router = APIRouter(prefix="/quan-ly/reports", tags=["quan-ly"])


@router.get("/sales")
async def sales_report(
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Sales report summarized by day, for optional date range."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Base queries
    query_daily = select(
        func.date(Order.created_at).label("day"),
        func.count(Order.id).label("orders"),
        func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
    ).where(Order.status == "da_thanh_toan")

    query_top = (
        select(
            Product.name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.unit_price * OrderItem.quantity).label("total"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status == "da_thanh_toan")
    )

    # Date filters
    import datetime as dt_mod

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query_daily = query_daily.where(Order.created_at >= dt_from)
            query_top = query_top.where(Order.created_at >= dt_from)
        except ValueError as e:
            logging.warning("reports: invalid date_from=%r: %s", date_from, e)
    else:
        # Default: last 7 days
        default_from = today - dt_mod.timedelta(days=7)
        query_daily = query_daily.where(Order.created_at >= default_from)
        query_top = query_top.where(Order.created_at >= default_from)

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            # Make to_date inclusive of the day
            if len(date_to) <= 10:  # YYYY-MM-DD
                dt_to = dt_to.replace(hour=23, minute=59, second=59)
            query_daily = query_daily.where(Order.created_at <= dt_to)
            query_top = query_top.where(Order.created_at <= dt_to)
        except ValueError as e:
            logging.warning("reports: invalid date_to=%r: %s", date_to, e)

    # Execute
    res_daily = await db.execute(
        query_daily.group_by(func.date(Order.created_at)).order_by(
            func.date(Order.created_at).desc()
        )
    )
    daily = [
        {"date": str(row.day), "orders": row.orders, "revenue": float(row.revenue)}
        for row in res_daily
    ]

    res_top = await db.execute(
        query_top.group_by(Product.name).order_by(func.sum(OrderItem.quantity).desc()).limit(10)
    )
    top_products = [
        {"name": row.name, "quantity": row.qty, "total": float(row.total)} for row in res_top
    ]

    return {"daily": daily, "top_products": top_products}
