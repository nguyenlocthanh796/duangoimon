"""Thue (tax) API router — HKD profile + tier dashboard."""

from app.core.uuid_utils import parse_uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import ensure_branch_access, get_current_user
from app.core.database import get_db
from app.core.thue.tier import TIER_META, classify_tier
from app.models.thue.hkd_profile import HKDProfile

router = APIRouter(prefix="/thue/profiles", tags=["thue"])


class ProfileCreate(BaseModel):
    branch_id: str | None = None
    tax_code: str
    legal_name: str
    opened_in_first_half: bool = True
    tax_method: str = "mien_thue"


class ProfilePatch(BaseModel):
    tax_method: str | None = None
    legal_name: str | None = None


def _profile_dict(p: HKDProfile) -> dict:
    tier = classify_tier(p.revenue_ytd)
    ytd = Decimal(str(p.revenue_ytd))
    pct = (ytd / Decimal("1000000000") * Decimal("100")).quantize(Decimal("0.1"))
    return {
        "id": str(p.id),
        "branch_id": str(p.branch_id) if p.branch_id else None,
        "tax_code": p.tax_code,
        "legal_name": p.legal_name,
        "registration_status": p.registration_status,
        "tax_method": p.tax_method,
        "revenue_ytd": float(ytd),
        "tier": tier,
        "tier_label": TIER_META[tier]["label"],
        "pct_of_1ty": float(pct),
        "threshold_alert_sent": p.threshold_alert_sent,
    }


@router.post("", status_code=201)
async def create_profile(
    body: ProfileCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    existing = await db.execute(select(HKDProfile).where(HKDProfile.tax_code == body.tax_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tax code already registered")
    profile = HKDProfile(
        branch_id=parse_uuid(body.branch_id) if body.branch_id else None,
        tax_code=body.tax_code,
        legal_name=body.legal_name,
        opened_in_first_half=body.opened_in_first_half,
        tax_method=body.tax_method,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _profile_dict(profile)


@router.get("/{branch_id}")
async def get_profile(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    """Get tax profile for a branch (protected by branch access check)."""
    try:
        b_uuid = parse_uuid(branch_id)
        result = await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
    except Exception:
        result = await db.execute(select(HKDProfile).order_by(HKDProfile.created_at).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        return {
            "id": "default",
            "branch_id": None,
            "tax_code": "0312345678",
            "legal_name": "NHÀ HÀNG POS F&B",
            "registration_status": "da_dang_ky",
            "tax_method": "mien_thue",
            "revenue_ytd": 0.0,
            "tier": "DUOI_100M",
            "tier_label": "Dưới 100tr (Miễn thuế)",
            "pct_of_1ty": 0.0,
            "threshold_alert_sent": False,
        }
    return _profile_dict(profile)


@router.patch("/{profile_id}")
async def patch_profile(
    profile_id: str,
    body: ProfilePatch,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    from datetime import datetime, timezone

    result = await db.execute(select(HKDProfile).where(HKDProfile.id == parse_uuid(profile_id)))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if body.tax_method is not None:
        profile.tax_method = body.tax_method
    if body.legal_name is not None:
        profile.legal_name = body.legal_name
    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    return _profile_dict(profile)


@router.get("/{branch_id}/status")
async def profile_status(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    try:
        b_uuid = parse_uuid(branch_id)
        result = await db.execute(select(HKDProfile).where(HKDProfile.branch_id == b_uuid))
    except Exception:
        result = await db.execute(select(HKDProfile).order_by(HKDProfile.created_at).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        return {
            "id": "default",
            "branch_id": None,
            "tax_code": "0312345678",
            "legal_name": "NHÀ HÀNG POS F&B",
            "registration_status": "da_dang_ky",
            "tax_method": "mien_thue",
            "revenue_ytd": 0.0,
            "tier": "DUOI_100M",
            "tier_label": "Dưới 100tr (Miễn thuế)",
            "pct_of_1ty": 0.0,
            "threshold_alert_sent": False,
        }
    return _profile_dict(profile)
