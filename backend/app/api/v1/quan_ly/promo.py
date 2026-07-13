"""Voucher + Promo Engine API."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.promo import PromoRule, Voucher

router = APIRouter(prefix="/quan-ly/promo", tags=["quan-ly"])


# ---- Vouchers ----
class VoucherCreate(BaseModel):
    code: str = Field(..., max_length=50, pattern="^[A-Z0-9]+$")
    name: str = Field(..., max_length=200)
    type: str = Field(..., pattern="^(percent|fixed)$")
    value: Decimal = Field(..., gt=Decimal(0), max_digits=10, decimal_places=2)
    min_order: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)
    max_discount: Decimal | None = Field(None, max_digits=14, decimal_places=2)
    usage_limit: int = Field(default=0, ge=0)
    valid_from: str | None = Field(None, max_length=50)
    valid_until: str | None = Field(None, max_length=50)


def _voucher_dict(v: Voucher) -> dict:
    return {
        "id": str(v.id),
        "code": v.code,
        "name": v.name,
        "type": v.type,
        "value": float(v.value),
        "min_order": float(v.min_order),
        "max_discount": float(v.max_discount) if v.max_discount else None,
        "usage_limit": v.usage_limit,
        "used_count": v.used_count,
        "valid_from": v.valid_from.isoformat() if v.valid_from else None,
        "valid_until": v.valid_until.isoformat() if v.valid_until else None,
        "is_active": v.is_active,
        "created_at": v.created_at.isoformat(),
    }


@router.get("/vouchers", response_model=list[dict])
async def list_vouchers(
    db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Voucher).order_by(Voucher.created_at.desc()))
    return [_voucher_dict(v) for v in result.scalars().all()]


@router.post("/vouchers", status_code=201)
async def create_voucher(
    body: VoucherCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    def _parse_dt(s):
        return datetime.fromisoformat(s) if s else None

    v = Voucher(
        code=body.code.upper(),
        name=body.name,
        type=body.type,
        value=body.value,
        min_order=body.min_order,
        max_discount=body.max_discount,
        usage_limit=body.usage_limit,
        valid_from=_parse_dt(body.valid_from),
        valid_until=_parse_dt(body.valid_until),
    )
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return _voucher_dict(v)


@router.post("/validate")
async def validate_voucher(
    code: str = Query(""),
    order_total: float = Query(0),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Voucher).where(Voucher.code == code.upper()).with_for_update())
    v = result.scalar_one_or_none()
    if not v or not v.is_active:
        raise HTTPException(status_code=400, detail="Invalid or inactive voucher")
    now = datetime.now(timezone.utc)
    if v.valid_from and now < v.valid_from:
        raise HTTPException(status_code=400, detail="Voucher not yet valid")
    if v.valid_until and now > v.valid_until:
        raise HTTPException(status_code=400, detail="Voucher expired")
    if v.usage_limit and v.used_count >= v.usage_limit:
        raise HTTPException(status_code=400, detail="Voucher usage limit reached")
    if order_total < v.min_order:
        raise HTTPException(status_code=400, detail=f"Min order {v.min_order}")
    discount = (v.value / 100 * order_total) if v.type == "percent" else v.value
    if v.max_discount:
        discount = min(discount, v.max_discount)
    return {"valid": True, "voucher": _voucher_dict(v), "discount": round(discount, 2)}


# ---- Promo Rules ----
def _promo_dict(p: PromoRule) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "type": p.type,
        "conditions": p.conditions,
        "benefits": p.benefits,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat(),
    }


@router.get("/rules", response_model=list[dict])
async def list_rules(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(PromoRule).order_by(PromoRule.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_rule_dict(r) for r in page_result["items"]]
    return page_result
