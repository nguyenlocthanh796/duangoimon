"""Marketing Automation API — campaigns + birthday/loyalty triggers."""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.crm import Customer
from app.models.marketing import Campaign, MessageLog

router = APIRouter(prefix="/quan-ly/marketing", tags=["quan-ly"])


class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=200)
    type: str = Field(default="sms", max_length=20)
    trigger: str = Field(default="scheduled", max_length=20)
    segment_filters: dict = {}
    template: dict = {}
    scheduled_at: str | None = Field(None, max_length=50)


def _campaign_dict(c: Campaign) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "type": c.type,
        "trigger": c.trigger,
        "segment_filters": c.segment_filters,
        "template": c.template,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "sent_count": c.sent_count,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat(),
    }


@router.get("/campaigns", response_model=list[dict])
async def list_campaigns(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Campaign).order_by(Campaign.created_at.desc())
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_campaign_dict(c) for c in page_result["items"]]
    return page_result


@router.post("/campaigns", status_code=201)
async def create_campaign(
    body: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    scheduled = datetime.fromisoformat(body.scheduled_at) if body.scheduled_at else None
    c = Campaign(
        name=body.name,
        type=body.type,
        trigger=body.trigger,
        segment_filters=body.segment_filters,
        template=body.template,
        scheduled_at=scheduled,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _campaign_dict(c)


@router.get("/segment-count")
async def segment_count(
    min_spent: float = 0,
    min_visits: int = 0,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Count customers matching segment criteria."""
    q = select(func.count(Customer.id))
    if min_spent:
        q = q.where(Customer.total_spent >= min_spent)
    if min_visits:
        q = q.where(Customer.visit_count >= min_visits)
    result = await db.execute(q)
    return {"customer_count": result.scalar() or 0}


@router.get("/logs", response_model=list[dict])
async def message_logs(db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(MessageLog).order_by(MessageLog.created_at.desc()).limit(100))
    return [
        {
            "id": str(l.id),
            "campaign_id": str(l.campaign_id),
            "customer_id": str(l.customer_id),
            "type": l.type,
            "status": l.status,
            "error": l.error,
            "sent_at": l.sent_at.isoformat() if l.sent_at else None,
            "created_at": l.created_at.isoformat(),
        }
        for l in result.scalars().all()
    ]
