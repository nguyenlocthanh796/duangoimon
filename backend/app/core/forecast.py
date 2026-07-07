"""Forecasting engine — demand prediction using simple moving average.

ponytail: uses naive historical avg. Replace with prophet/sklearn when data volume > 6 months.
"""
from datetime import datetime, timezone, timedelta, date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ban_hang import Order, OrderItem


async def predict_demand(
    db: AsyncSession,
    days_ahead: int = 7,
    lookback_days: int = 90,
) -> dict:
    """Predict order count + top items for next N days based on historical avg."""
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    # Average orders per day
    order_stats = await db.execute(
        select(
            func.date(Order.paid_at).label("day"),
            func.count(Order.id).label("cnt"),
        )
        .where(Order.paid_at >= since, Order.status == "da_thanh_toan")
        .group_by(func.date(Order.paid_at))
    )
    rows = order_stats.all()
    avg_daily = sum(r.cnt for r in rows) / max(len(rows), 1)

    # Top items avg daily qty
    item_stats = await db.execute(
        select(
            OrderItem.product_name,
            func.avg(OrderItem.quantity).label("avg_qty"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.paid_at >= since, Order.status == "da_thanh_toan")
        .group_by(OrderItem.product_name)
        .order_by(func.avg(OrderItem.quantity).desc())
        .limit(20)
    )

    predictions = []
    for i in range(1, days_ahead + 1):
        d = date.today() + timedelta(days=i)
        predictions.append({
            "date": d.isoformat(),
            "predicted_orders": round(avg_daily, 1),
            "weekday": d.strftime("%A"),
        })

    return {
        "lookback_days": lookback_days,
        "historical_avg_daily_orders": round(avg_daily, 1),
        "predictions": predictions,
        "top_items": [
            {"name": r.product_name, "avg_daily_qty": round(float(r.avg_qty), 1)}
            for r in item_stats.all()
        ],
    }
