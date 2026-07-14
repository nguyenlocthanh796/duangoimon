"""Membership + Loyalty API — tiers, points, auto-calc."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.membership import LoyaltyPoint, MembershipTier

router = APIRouter(prefix="/quan-ly/membership", tags=["quan-ly"])


class TierCreate(BaseModel):
    name: str = Field(..., max_length=100)
    min_spent: Decimal = Field(default=Decimal(0), ge=Decimal(0), max_digits=14, decimal_places=2)
    discount_rate: Decimal = Field(default=Decimal(0), ge=Decimal(0), le=Decimal(100), max_digits=5, decimal_places=2)
    multiplier: float = Field(default=1.0, ge=0)
    color: str | None = Field(None, max_length=20)


def _tier_dict(t: MembershipTier) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "min_spent": float(t.min_spent),
        "discount_rate": float(t.discount_rate),
        "multiplier": t.multiplier,
        "color": t.color,
        "created_at": t.created_at.isoformat(),
    }


@router.get("/tiers")
async def list_tiers(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(MembershipTier).order_by(MembershipTier.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_tier_dict(t) for t in page_result["items"]]
    return page_result


@router.post("/tiers", status_code=201)
async def create_tier(
    body: TierCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    t = MembershipTier(
        name=body.name,
        min_spent=body.min_spent,
        discount_rate=body.discount_rate,
        multiplier=body.multiplier,
        color=body.color,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _tier_dict(t)


@router.get("/points/{customer_id}")
async def get_points(
    customer_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    earn = await db.execute(
        select(func.coalesce(func.sum(LoyaltyPoint.points), 0)).where(
            LoyaltyPoint.customer_id == parse_uuid(customer_id), LoyaltyPoint.type == "earn"
        )
    )
    redeem = await db.execute(
        select(func.coalesce(func.sum(LoyaltyPoint.points), 0)).where(
            LoyaltyPoint.customer_id == parse_uuid(customer_id), LoyaltyPoint.type == "redeem"
        )
    )
    return {"customer_id": customer_id, "balance": (earn.scalar() or 0) - (redeem.scalar() or 0)}


@router.get("/tier/{customer_id}")
async def get_customer_tier(
    customer_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    """Determine customer's tier based on total_spent."""
    from app.models.crm import Customer

    result = await db.execute(select(Customer).where(Customer.id == parse_uuid(customer_id)))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404)
    result = await db.execute(
        select(MembershipTier)
        .where(MembershipTier.min_spent <= c.total_spent)
        .order_by(MembershipTier.min_spent.desc())
        .limit(1)
    )
    tier = result.scalar_one_or_none()
    return {"tier": _tier_dict(tier) if tier else None, "total_spent": float(c.total_spent)}
