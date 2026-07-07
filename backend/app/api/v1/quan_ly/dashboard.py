from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.ban_hang import Order, OrderItem, Product, Table
from app.models.ke_toan import Transaction

router = APIRouter(prefix="/quan-ly/dashboard", tags=["quan-ly"])


@router.get("")
async def dashboard_stats(db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Total revenue today
    rev_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0))
        .where(Order.paid_at >= today, Order.status == "da_thanh_toan")
    )
    today_revenue = float(rev_result.scalar() or 0)

    # Order counts
    total_orders = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders.scalar() or 0

    # Table counts
    table_counts = await db.execute(
        select(Table.status, func.count(Table.id)).group_by(Table.status)
    )
    table_stats = {row.status: row.count for row in table_counts}

    # Top products
    top = await db.execute(
        select(Product.name, func.sum(OrderItem.quantity).label("qty"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= today)
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )

    return {
        "today_revenue": today_revenue,
        "total_orders": total_orders,
        "table_stats": {
            "trong": table_stats.get("trong", 0),
            "co_khach": table_stats.get("co_khach", 0),
            "da_dat": table_stats.get("da_dat", 0),
        },
        "top_products": [{"name": row.name, "quantity": row.qty} for row in top],
    }
