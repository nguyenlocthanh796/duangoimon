"""Tax report (Sổ kế toán / Báo cáo thuế) API.

GET /thue/report/{branch_id}?year=2026
  Builds a 12-month revenue report for an HKD branch from paid Orders
  (canonical revenue source, per approved flow), then runs the TT152
  tax engine (core/thue/report_export + tax_calc) to produce VAT/TNCN/Total.
  Response shape matches frontend lib/api/thue.ts::TaxReport.

GET /thue/report/{branch_id}/export?year=2026&fmt=csv|pdf
  Export the 12-month tax report as CSV or PDF (P4.1).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import ensure_branch_access
from app.core.database import get_db
from app.core.thue import report_export as exporter
from app.core.thue.report_export import RevenueRow, build_report
from app.core.thue.tier import TIER_META, classify_tier
from app.models.ban_hang import Order
from app.models.thue.hkd_profile import HKDProfile

router = APIRouter(prefix="/thue/report", tags=["thue"])


class ReportRowModel(BaseModel):
    period_month: str
    revenue: str
    cost: str
    vat: str
    tncn: str
    total: str
    group: int


class TaxReportModel(BaseModel):
    hkd_name: str
    tax_code: str
    tier: str
    tier_label: str
    rows: list[ReportRowModel]
    totals: dict


def _to_uuid(branch_id: str):
    try:
        return __import__("uuid").UUID(branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch_id")


async def _build_rows(db: AsyncSession, b_uuid, y: int):
    prof = (
        await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
    ).scalar_one_or_none()
    month_expr = func.to_char(Order.paid_at, "YYYY-MM")
    result = await db.execute(
        select(
            month_expr.label("month"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
        )
        .where(
            Order.branch_id == b_uuid,
            Order.status.in_(["da_thanh_toan", "paid"]),
            Order.total_amount > 0,
            func.extract("year", Order.paid_at) == y,
        )
        .group_by(month_expr)
        .order_by(month_expr)
    )
    rows_by_month = {r.month: float(r.revenue) for r in result.all()}
    revenue_rows = []
    for m in range(1, 13):
        key = f"{y}-{m:02d}"
        revenue_rows.append(RevenueRow(month=key, revenue=rows_by_month.get(key, 0)))
    hkd_name = prof.legal_name if prof else "Chi nhanh chua co ho so HKD"
    tax_code = prof.tax_code if prof else ""
    tier = classify_tier(prof.revenue_ytd) if prof else "N1"
    return hkd_name, tax_code, tier, revenue_rows


@router.get("/{branch_id}")
async def get_report(
    branch_id: str,
    year: int | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    y = year or date.today().year
    b_uuid = _to_uuid(branch_id)
    hkd_name, tax_code, tier, revenue_rows = await _build_rows(db, b_uuid, y)
    built = build_report(hkd_name, tax_code, revenue_rows)
    out_rows = [
        ReportRowModel(
            period_month=r.month,
            revenue=r.revenue,
            cost=r.cost,
            vat=r.vat,
            tncn=r.pit,
            total=r.total,
            group=r.group,
        )
        for r in built.rows
    ]
    return TaxReportModel(
        hkd_name=hkd_name,
        tax_code=tax_code,
        tier=tier,
        tier_label=TIER_META[tier]["label"],
        rows=out_rows,
        totals=built.totals,
    )


@router.get("/{branch_id}/export")
async def export_report(
    branch_id: str,
    year: int | None = None,
    fmt: str = "csv",
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    """Export the 12-month tax report as CSV or PDF (P4.1)."""
    y = year or date.today().year
    b_uuid = _to_uuid(branch_id)
    hkd_name, tax_code, tier, revenue_rows = await _build_rows(db, b_uuid, y)
    built = build_report(hkd_name, tax_code, revenue_rows)

    if fmt == "pdf":
        pdf_bytes = exporter.build_report_pdf(built, hkd_name, tax_code, tier)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="BaoCaoThue_{branch_id[:8]}_{y}.pdf"'
            },
        )
    csv_text = exporter.build_report_csv(built, hkd_name, tax_code, tier)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="BaoCaoThue_{branch_id[:8]}_{y}.csv"'
        },
    )
