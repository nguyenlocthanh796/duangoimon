"""Export API — Excel/PDF reports."""
import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.ban_hang import Order

router = APIRouter(prefix="/quan-ly/export", tags=["quan-ly"])


@router.get("/revenue-csv")
async def export_revenue_csv(
    from_date: str = Query("", alias="from"),
    to_date: str = Query("", alias="to"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Export revenue report as CSV."""
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

    q = q.group_by(func.date(Order.paid_at)).order_by(func.date(Order.paid_at).desc())
    result = await db.execute(q)

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["Date", "Orders", "Revenue", "Discount"])
    for r in result.all():
        w.writerow([str(r.day), r.order_count, float(r.total or 0), float(r.discount or 0)])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=revenue_report.csv"},
    )
