"""Quan-ly Dashboard API router."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ban_hang import Order, OrderItem, Product, Table
from app.models.ke_toan import Transaction
from app.models.quan_ly import Inventory

router = APIRouter(prefix="/quan-ly/dashboard", tags=["quan-ly"])


@router.get("")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # 1. Revenue today
    rev_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.paid_at >= today_start, Order.status == "da_thanh_toan"
        )
    )
    today_revenue = float(rev_result.scalar() or 0)

    # 2. Revenue yesterday (for growth)
    rev_yest = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.paid_at >= yesterday_start,
            Order.paid_at < today_start,
            Order.status == "da_thanh_toan",
        )
    )
    yesterday_revenue = float(rev_yest.scalar() or 0)
    revenue_growth = (
        round(((today_revenue - yesterday_revenue) / yesterday_revenue) * 100, 1)
        if yesterday_revenue > 0
        else None
    )

    # 3. Order counts
    total_orders = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders.scalar() or 0

    orders_today = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )
    orders_today = orders_today.scalar() or 0
    orders_yest = await db.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= yesterday_start,
            Order.created_at < today_start,
        )
    )
    orders_yest = orders_yest.scalar() or 0
    orders_growth = (
        round(((orders_today - orders_yest) / orders_yest) * 100, 1)
        if orders_yest > 0
        else (100 if orders_today > 0 else 0)
    )

    # 4. Table counts
    table_counts = await db.execute(
        select(Table.status, func.count(Table.id)).group_by(Table.status)
    )
    table_stats = {row.status: row.count for row in table_counts}

    # 5. Top products today
    top = await db.execute(
        select(Product.name, func.sum(OrderItem.quantity).label("qty"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.paid_at >= today_start)
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )

    # 6. Revenue by hour (last 12 hours from 7h to 18h)
    hour_slots = []
    for h in range(7, 19):
        slot_start = today_start.replace(hour=h)
        slot_end = slot_start + timedelta(hours=1)
        row = await db.execute(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(
                Order.paid_at >= slot_start,
                Order.paid_at < slot_end,
                Order.status == "da_thanh_toan",
            )
        )
        val = float(row.scalar() or 0)
        hour_slots.append({"hour": h, "value": val})

    # 7. Low stock items
    low_stock = await db.execute(
        select(Inventory).where(
            Inventory.quantity < Inventory.min_alert,
            Inventory.min_alert > 0,
        ).limit(5)
    )
    low_stock_items = [
        {
            "name": f"Nguyên liệu #{row.id.hex[:6]}",
            "unit": row.unit,
            "current": float(row.quantity),
            "min": float(row.min_alert),
        }
        for row in low_stock.scalars()
    ]
    if not low_stock_items:
        low_stock_items = []

    # 8. Recent activities
    recent_orders = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(3)
    )
    activities = []
    for o in recent_orders.scalars():
        status_label = {
            "moi": "Tạo đơn mới",
            "dang_nau": "Đang chế biến",
            "da_thanh_toan": "Đã thanh toán",
            "huy": "Đã hủy",
        }
        activities.append({
            "icon": "receipt" if o.status == "da_thanh_toan" else "clock-outline" if o.status == "dang_nau" else "close-circle" if o.status == "huy" else "plus-circle",
            "text": f"Đơn hàng #{str(o.id)[:8]} — {status_label.get(o.status, o.status)}",
            "time": o.created_at.strftime("%H:%M"),
            "color": "#10B981" if o.status == "da_thanh_toan" else "#F97316" if o.status == "dang_nau" else "#EF4444" if o.status == "huy" else "#6366F1",
        })

    recent_tx = await db.execute(
        select(Transaction).where(Transaction.created_at >= today_start).order_by(Transaction.created_at.desc()).limit(2)
    )
    for t in recent_tx.scalars():
        activities.append({
            "icon": "swap-vertical",
            "text": f"Giao dịch {t.type}: {t.note or t.category or '—'}",
            "time": t.created_at.strftime("%H:%M") if t.created_at else "",
            "color": "#059669" if t.type == "thu" else "#DC2626",
        })

    activities.sort(key=lambda a: a["time"] if a["time"] else "", reverse=True)
    activities = activities[:5]

    return {
        "today_revenue": today_revenue,
        "total_orders": total_orders,
        "revenue_growth": revenue_growth,
        "orders_growth": orders_growth,
        "table_stats": {
            "trong": table_stats.get("trong", 0),
            "co_khach": table_stats.get("co_khach", 0),
            "da_dat": table_stats.get("da_dat", 0),
        },
        "top_products": [{"name": row.name, "quantity": row.qty} for row in top],
        "revenue_by_hour": hour_slots,
        "low_stock_items": low_stock_items,
        "recent_activities": activities,
    }
