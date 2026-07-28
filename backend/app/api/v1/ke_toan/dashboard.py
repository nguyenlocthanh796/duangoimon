"""Dashboard API for Kế Toán — returns all data in one call."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.ke_toan import Transaction, Invoice

router = APIRouter(prefix="/ke-toan", tags=["ke-toan"])


@router.get("/dashboard")
async def dashboard(
    branch_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    year = now.year
    current_month = now.month

    # ── 1. Summaries ─────────────────────────────────────────────────────
    tx_stmt = select(Transaction)
    if branch_id:
        tx_stmt = tx_stmt.where(Transaction.branch_id == branch_id)
    tx_result = await db.execute(tx_stmt.order_by(Transaction.created_at.desc()).limit(200))
    all_tx = tx_result.scalars().all()

    total_thu = sum(t.amount for t in all_tx if t.type == "thu")
    total_chi = sum(t.amount for t in all_tx if t.type == "chi")

    # This month only
    month_tx = [
        t for t in all_tx
        if t.created_at and t.created_at.year == year and t.created_at.month == current_month
    ]
    month_thu = sum(t.amount for t in month_tx if t.type == "thu")
    month_chi = sum(t.amount for t in month_tx if t.type == "chi")

    # Last month
    prev_month = current_month - 1 or 12
    prev_year = year - 1 if current_month == 1 else year
    prev_tx = [
        t for t in all_tx
        if t.created_at and t.created_at.year == prev_year and t.created_at.month == prev_month
    ]
    prev_thu = sum(t.amount for t in prev_tx if t.type == "thu")
    prev_chi = sum(t.amount for t in prev_tx if t.type == "chi")

    # ── 2. Monthly Revenue (last 12 months) ──────────────────────────────
    monthly = {}
    for t in all_tx:
        if t.created_at and t.type == "thu":
            key = f"{t.created_at.year}-{t.created_at.month:02d}"
            monthly[key] = monthly.get(key, 0) + t.amount

    months_labels = [
        "T1", "T2", "T3", "T4", "T5", "T6",
        "T7", "T8", "T9", "T10", "T11", "T12",
    ]
    monthly_revenue = []
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        monthly_revenue.append({
            "label": months_labels[m - 1],
            "value": float(monthly.get(key, 0)),
            "current": m == current_month,
        })

    # ── 3. Expense by Category ───────────────────────────────────────────
    expense_cats: dict[str, float] = {}
    for t in all_tx:
        if t.type == "chi" and t.amount:
            cat = t.category or "Khác"
            expense_cats[cat] = expense_cats.get(cat, 0) + t.amount

    expense_colors = {
        "Nguyên liệu": "#059669",
        "Điện nước": "#2563EB",
        "Thuê mặt bằng": "#D97706",
        "Lương": "#7C3AED",
        "Tiếp thị": "#DC2626",
        "Vật tư": "#0891B2",
        "Bảo trì": "#9333EA",
        "Khác": "#94A3B8",
    }
    expense_by_category = [
        {
            "category": cat,
            "value": round(val, 0),
            "color": expense_colors.get(cat, "#94A3B8"),
            "pct": round(val / max(total_chi, 1) * 100, 1),
        }
        for cat, val in sorted(expense_cats.items(), key=lambda x: -x[1])
    ]

    # ── 4. 14-day trend (thu) ────────────────────────────────────────────
    from datetime import timedelta
    trend: list[dict] = []
    for i in range(13, -1, -1):
        day = now - timedelta(days=i)
        day_key = f"{day.year}-{day.month:02d}-{day.day:02d}"
        day_val = sum(
            t.amount for t in all_tx
            if t.type == "thu" and t.created_at
            and t.created_at.strftime("%Y-%m-%d") == day_key
        )
        trend.append({
            "label": f"{day.day:02d}/{day.month:02d}",
            "value": float(day_val),
        })

    # ── 5. Invoices summary ──────────────────────────────────────────────
    inv_stmt = select(Invoice)
    if branch_id:
        inv_stmt = inv_stmt.where(Invoice.branch_id == branch_id)
    inv_result = await db.execute(inv_stmt.order_by(Invoice.created_at.desc()).limit(100))
    all_inv = inv_result.scalars().all()
    exported_count = sum(1 for i in all_inv if i.status == "da_xuat")
    inv_total = float(sum(i.total_amount or 0 for i in all_inv))

    # ── 6. Recent transactions (last 5) ──────────────────────────────────
    recent_transactions = [
        {
            "id": str(t.id),
            "type": t.type,
            "category": t.category,
            "amount": float(t.amount),
            "note": t.note,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in all_tx[:5]
    ]

    # ── 7. Recent invoices (last 4) ──────────────────────────────────────
    recent_invoices = [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "buyer_name": inv.buyer_name,
            "total_amount": float(inv.total_amount or 0),
            "status": inv.status,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        for inv in all_inv[:4]
    ]

    # ── 8. Revenue last month (for YoY / MoM) ────────────────────────────
    return {
        "summary": {
            "total_thu": float(total_thu),
            "total_chi": float(total_chi),
            "balance": float(total_thu - total_chi),
            "transaction_count": len(all_tx),
            "invoice_count": len(all_inv),
            "exported_count": exported_count,
            "invoice_total": inv_total,
        },
        "monthly_revenue": monthly_revenue,
        "expense_by_category": expense_by_category,
        "trend": trend,
        "recent_transactions": recent_transactions,
        "recent_invoices": recent_invoices,
        "this_month": {
            "thu": float(month_thu),
            "chi": float(month_chi),
            "thu_growth": round((month_thu / max(prev_thu, 1) - 1) * 100, 1),
            "chi_growth": round((month_chi / max(prev_chi, 1) - 1) * 100, 1),
        },
        "deadlines": [
            {"label": "Thuế GTGT tháng 6/2026", "due": "20/07/2026", "days_left": 7},
            {"label": "Thuế TNCN tháng 6/2026", "due": "20/07/2026", "days_left": 7},
            {"label": "Báo cáo thuế quý 2/2026", "due": "30/07/2026", "days_left": 17},
            {"label": "Quyết toán thuế năm 2026", "due": "31/03/2027", "days_left": 261},
        ],
    }
