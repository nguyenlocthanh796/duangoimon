"""Executive Dashboard API — real-time chain-wide CEO view."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.ban_hang import Order, OrderItem
from app.models.branch import Branch

router = APIRouter(prefix="/quan-ly/exec-dashboard", tags=["quan-ly"])


@router.get("")
async def exec_dashboard(
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real-time executive dashboard data."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Today revenue
    today_rev = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.paid_at >= today, Order.status == "da_thanh_toan"
        )
    )

    # Today order count
    today_orders = await db.execute(
        select(func.count(Order.id)).where(Order.paid_at >= today, Order.status == "da_thanh_toan")
    )

    # Active orders (in kitchen)
    active = await db.execute(
        select(func.count(Order.id)).where(Order.status.in_(["moi", "dang_lam"]))
    )

    # Branch count
    branch_count = await db.execute(select(func.count(Branch.id)))

    # Top products today
    top = await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.total).label("rev"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.paid_at >= today, Order.status == "da_thanh_toan")
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    )

    return {
        "today_revenue": float(today_rev.scalar() or 0),
        "today_orders": today_orders.scalar() or 0,
        "active_orders": active.scalar() or 0,
        "total_branches": branch_count.scalar() or 0,
        "top_products": [
            {"name": r.product_name, "qty": r.qty or 0, "revenue": float(r.rev or 0)}
            for r in top.all()
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
