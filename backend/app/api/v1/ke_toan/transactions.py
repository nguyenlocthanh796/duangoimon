import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.ke_toan import Transaction

router = APIRouter(prefix="/ke-toan/transactions", tags=["ke-toan"])


class TransactionCreate(BaseModel):
    type: str  # thu, chi
    category: str | None = None
    amount: float
    ref_id: str | None = None
    note: str | None = None


@router.get("")
async def list_transactions(
    type_filter: str | None = Query(None, alias="type"),
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Transaction).order_by(Transaction.created_at.desc())
    if type_filter:
        query = query.where(Transaction.type == type_filter)
    if category:
        query = query.where(Transaction.category == category)
    result = await db.execute(query.limit(100))
    return [
        {
            "id": str(t.id),
            "type": t.type,
            "category": t.category,
            "amount": float(t.amount),
            "ref_id": str(t.ref_id) if t.ref_id else None,
            "note": t.note,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in result.scalars()
    ]


class TransactionBulkDelete(BaseModel):
    ids: list[str]


@router.post("/bulk-delete")
async def bulk_delete_transactions(
    body: TransactionBulkDelete,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from sqlalchemy import delete as sa_delete

    try:
        uuids = [uuid.UUID(i) for i in body.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid transaction id")
    await db.execute(sa_delete(Transaction).where(Transaction.id.in_(uuids)))
    await db.commit()
    return {"deleted": len(uuids), "status": "ok"}


@router.post("", status_code=201)
async def create_transaction(body: TransactionCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if body.type not in ("thu", "chi"):
        raise HTTPException(status_code=400, detail="Type must be 'thu' or 'chi'")
    tx = Transaction(
        type=body.type,
        category=body.category,
        amount=body.amount,
        ref_id=uuid.UUID(body.ref_id) if body.ref_id else None,
        note=body.note,
        created_by=uuid.UUID(current_user["sub"]),
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return {"id": str(tx.id), "status": "ok"}

