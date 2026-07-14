"""Notified bank account API (Thông tư 18/2026/TT-BTC — Mẫu 01/BK-STK).

When an HKD opens a settlement account at a NHTM or uses an e-wallet to
receive customer payments, it must declare that account (Mẫu 01/BK-STK)
so the tax authority can reconcile via Open Banking.
"""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import ensure_branch_access, get_current_user
from app.core.database import get_db
from app.models.thue.bank_account import NotifiedBankAccount
from app.models.thue.hkd_profile import HKDProfile

router = APIRouter(prefix="/thue/bank-accounts", tags=["thue"])


class BankAccountCreate(BaseModel):
    tax_code: str | None = None
    bank_name: str
    account_number: str
    branch_id: str | None = None
    wallet_type: str = "bank"


class BankAccountPatch(BaseModel):
    bank_name: str | None = None
    account_number: str | None = None
    wallet_type: str | None = None


def _as_dict(b: NotifiedBankAccount) -> dict:
    return {
        "id": str(b.id),
        "branch_id": str(b.branch_id) if b.branch_id else None,
        "tax_code": b.tax_code,
        "bank_name": b.bank_name,
        "account_number": b.account_number,
        "wallet_type": b.wallet_type,
        "form_status": b.form_status,
        "notified_at": b.notified_at.isoformat() if b.notified_at else None,
    }


@router.post("", status_code=201)
async def create_bank_account(
    body: BankAccountCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    prof = None
    if body.tax_code:
        prof = (
            await db.execute(select(HKDProfile).where(HKDProfile.tax_code == body.tax_code))
        ).scalar_one_or_none()
    if not prof and body.branch_id:
        try:
            b_uuid = parse_uuid(body.branch_id)
            prof = (
                await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
            ).scalar_one_or_none()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid branch_id")
    if not prof:
        raise HTTPException(status_code=404, detail="HKD profile not found")
    ba = NotifiedBankAccount(
        branch_id=prof.branch_id or (parse_uuid(body.branch_id) if body.branch_id else None),
        tax_code=prof.tax_code,
        bank_name=body.bank_name,
        account_number=body.account_number,
        wallet_type=body.wallet_type,
    )
    db.add(ba)
    await db.commit()
    await db.refresh(ba)
    return _as_dict(ba)


@router.get("/{tax_code}")
async def list_by_tax_code(
    tax_code: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    rows = (
        (
            await db.execute(
                select(NotifiedBankAccount).where(NotifiedBankAccount.tax_code == tax_code)
            )
        )
        .scalars()
        .all()
    )
    return [_as_dict(b) for b in rows]


@router.get("/by-branch/{branch_id}")
async def list_by_branch(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    """List notified accounts for a branch (resolves tax_code via HKD profile)."""
    try:
        b_uuid = parse_uuid(branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch_id")
    prof = (
        await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
    ).scalar_one_or_none()
    if not prof:
        return []
    return await list_by_tax_code(prof.tax_code, db=db, _user=_user)


@router.patch("/{account_id}")
async def patch_bank_account(
    account_id: str,
    body: BankAccountPatch,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    ba = (
        await db.execute(
            select(NotifiedBankAccount).where(NotifiedBankAccount.id == parse_uuid(account_id))
        )
    ).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Account not found")
    if body.bank_name is not None:
        ba.bank_name = body.bank_name
    if body.account_number is not None:
        ba.account_number = body.account_number
    if body.wallet_type is not None:
        ba.wallet_type = body.wallet_type
    await db.commit()
    await db.refresh(ba)
    return _as_dict(ba)


@router.post("/{account_id}/notify")
async def notify_tax(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Mark Mẫu 01/BK-STK as notified to tax authority (stub — A2 no creds)."""
    ba = (
        await db.execute(
            select(NotifiedBankAccount).where(NotifiedBankAccount.id == parse_uuid(account_id))
        )
    ).scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Account not found")
    from datetime import datetime, timezone

    ba.form_status = "da_thong_bao"
    ba.notified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ba)
    return _as_dict(ba)
