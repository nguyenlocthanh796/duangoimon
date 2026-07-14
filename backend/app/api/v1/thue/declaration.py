"""Declaration deadline API (kê khai thuế HKD)."""

from app.core.uuid_utils import parse_uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import ensure_branch_access, get_current_user
from app.core.database import get_db
from app.core.thue.escalation import ensure_deadlines, escalate
from app.models.thue.declaration_deadline import DeclarationDeadline
from app.models.thue.hkd_profile import HKDProfile

router = APIRouter(prefix="/thue/declarations", tags=["thue"])


class SubmitBody(BaseModel):
    note: str | None = None


class DeclarationSubmitBody(BaseModel):
    form: str
    branch_id: str
    period: str  # YYYY-MM


def _build_xml(form: str, branch_id: str, period: str, tax_code: str, legal_name: str) -> str:
    """Build a Tổng cục Thuế-style XML declaration (stub, schema 01/CNKD family)."""
    safe = lambda s: (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<TKhai xmlns="http://kekhaithue.gdt.gov.vn/2026" maTKhai="{safe(form)}">\n'
        f"  <KyKhai>{safe(period)}</KyKhai>\n"
        f"  <MST>{safe(tax_code)}</MST>\n"
        f"  <TenNNT>{safe(legal_name)}</TenNNT>\n"
        f"  <BranchId>{safe(branch_id)}</BranchId>\n"
        f'  <NgayTao>{__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}</NgayTao>\n'
        "</TKhai>"
    )


@router.get("/{branch_id}")
async def list_deadlines(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    rows = (
        (
            await db.execute(
                select(DeclarationDeadline)
                .where(DeclarationDeadline.branch_id == parse_uuid(branch_id))
                .order_by(DeclarationDeadline.due_date)
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": str(d.id),
            "form": d.form,
            "period_type": d.period_type,
            "due_date": d.due_date.isoformat(),
            "submitted": d.submitted,
            "submitted_at": d.submitted_at.isoformat() if d.submitted_at else None,
            "reminded_14": d.reminded_14,
            "reminded_7": d.reminded_7,
            "reminded_3": d.reminded_3,
            "reminded_1": d.reminded_1,
            "notified": d.notified,
        }
        for d in rows
    ]


@router.post("/{branch_id}/ensure")
async def ensure(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    from app.models.thue.hkd_profile import HKDProfile

    prof = (
        await db.execute(select(HKDProfile).where(HKDProfile.branch_id == parse_uuid(branch_id)))
    ).scalar_one_or_none()
    if not prof:
        raise HTTPException(status_code=404, detail="Profile not found")
    await ensure_deadlines(db, prof)
    return {"status": "ok"}


@router.post("/{deadline_id}/submit")
async def submit(
    deadline_id: str,
    body: SubmitBody,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    dl = (
        await db.execute(
            select(DeclarationDeadline).where(DeclarationDeadline.id == parse_uuid(deadline_id))
        )
    ).scalar_one_or_none()
    if not dl:
        raise HTTPException(status_code=404, detail="Deadline not found")
    from datetime import datetime, timezone

    dl.submitted = True
    dl.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(dl.id), "submitted": True}


@router.post("/escalate")
async def run_escalation(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    summary = await escalate(db)
    return summary


@router.get("/declaration/{form}/{branch_id}")
async def get_declaration_xml(
    form: str,
    branch_id: str,
    period: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    """Return a T-VAN-ready XML declaration for the given form/branch/period."""
    import re

    period_str = period or str(date.today().year)
    if period and not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", period):
        raise HTTPException(status_code=400, detail="Invalid period format, expected YYYY-MM")
    try:
        b_uuid = parse_uuid(branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch_id")
    prof = (
        await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
    ).scalar_one_or_none()
    tax_code = prof.tax_code if prof else ""
    legal_name = prof.legal_name if prof else "Chi nhánh"
    return _build_xml(form, branch_id, period_str, tax_code, legal_name)


@router.post("/declaration/submit")
async def submit_declaration(
    body: DeclarationSubmitBody,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Stub T-VAN submit: mark matching deadline (if any) as submitted."""
    try:
        b_uuid = parse_uuid(body.branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch_id")
    form_code = "01_TKN_CNKD" if body.form == "01-tkn-cnkd" else "01_CNKD"
    dl = (
        await db.execute(
            select(DeclarationDeadline).where(
                DeclarationDeadline.branch_id == b_uuid,
                DeclarationDeadline.form == form_code,
            )
        )
    ).scalar_one_or_none()
    if dl and not dl.submitted:
        dl.submitted = True
        dl.submitted_at = datetime.now(timezone.utc)
        await db.commit()
    return {"status": "ok", "form": body.form, "period": body.period}
