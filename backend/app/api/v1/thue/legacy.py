"""Legacy inventory checklist (01/BK-HTK) API.

POST /thue/legacy-inventory/checklist/{branch_id}
  Builds an opening-balance inventory checklist (Bảng kê tồn kho đầu kỳ)
  from the branch's Products using weighted-average cost (cost_price).
  Response matches frontend lib/api/thue.ts::LegacyChecklist.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import ensure_branch_access, get_current_user
from app.core.database import get_db
from app.models.ban_hang import Product
from app.models.quan_ly import Inventory

router = APIRouter(prefix="/thue/legacy-inventory", tags=["thue"])


class LegacyItem(BaseModel):
    product: str
    opening_qty: float
    avg_cost: float
    value: float


class LegacyChecklist(BaseModel):
    branch_id: str
    generated_at: str
    items: list[LegacyItem]


@router.post("/checklist/{branch_id}", status_code=200)
async def get_checklist(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(ensure_branch_access),
):
    try:
        b_uuid = uuid.UUID(branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch_id")

    # Opening qty from inventory (fallback 0); avg_cost from product.cost_price.
    inv_qty = (
        await db.execute(
            select(Inventory.product_id, func.coalesce(func.sum(Inventory.quantity), 0))
            .where(Inventory.branch_id == b_uuid)
            .group_by(Inventory.product_id)
        )
    ).all()
    qty_map = {row.product_id: float(row[1]) for row in inv_qty}

    products = (
        (await db.execute(select(Product).where(Product.branch_id == b_uuid))).scalars().all()
    )

    items: list[LegacyItem] = []
    for p in products:
        qty = qty_map.get(p.id, 0.0)
        avg = float(p.cost_price or 0)
        items.append(
            LegacyItem(
                product=p.name,
                opening_qty=qty,
                avg_cost=avg,
                value=round(qty * avg, 2),
            )
        )

    return LegacyChecklist(
        branch_id=branch_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        items=items,
    )
