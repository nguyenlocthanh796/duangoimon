"""Ke-toan Transactions API router."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.database import get_db
from app.models.ke_toan import Transaction

router = APIRouter(prefix="/ke-toan/transactions", tags=["ke-toan"])


class TransactionCreate(BaseModel):
    type: str = Field(..., pattern="^(thu|chi)$")
    category: str | None = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=Decimal(0), max_digits=14, decimal_places=2, description="Amount in VND")
    ref_id: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=500)


@router.get("")
async def list_transactions(
    type_filter: str | None = Query(None, alias="type"),
    category: str | None = None,
    branch_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return transactions list + computed totals (thu, chi, balance)."""
    from sqlalchemy import func as _func
    base = select(Transaction)
    if type_filter:
        base = base.where(Transaction.type == type_filter)
    if category:
        base = base.where(Transaction.category == category)
    if branch_id:
        try:
            b_uuid = parse_uuid(branch_id)
            base = base.where(Transaction.branch_id == b_uuid)
        except ValueError:
            pass

    total_count = await db.scalar(select(_func.count()).select_from(base.subquery()))
    offset = (page - 1) * page_size
    result = await db.execute(base.order_by(Transaction.created_at.desc()).offset(offset).limit(page_size))
    rows = result.scalars().all()

    total_thu = sum(t.amount for t in rows if t.type == "thu")
    total_chi = sum(t.amount for t in rows if t.type == "chi")

    return {
        "items": [
            {
                "id": str(t.id),
                "type": t.type,
                "category": t.category,
                "amount": float(t.amount),
                "ref_id": str(t.ref_id) if t.ref_id else None,
                "note": t.note,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in rows
        ],
        "total": total_count or 0,
        "page": page,
        "page_size": page_size,
        "total_thu": float(total_thu),
        "total_chi": float(total_chi),
    }


class TransactionUpdate(BaseModel):
    type: str | None = Field(None, pattern="^(thu|chi)$")
    category: str | None = Field(None, max_length=100)
    amount: Decimal | None = Field(None, gt=Decimal(0), max_digits=14, decimal_places=2)
    note: str | None = Field(None, max_length=500)


@router.patch("/{tx_id}")
async def update_transaction(
    tx_id: str,
    body: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "accountant")),
):
    try:
        uuid_val = parse_uuid(tx_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid transaction id")

    result = await db.execute(select(Transaction).where(Transaction.id == uuid_val))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if body.type is not None:
        tx.type = body.type
    if body.category is not None:
        tx.category = body.category
    if body.amount is not None:
        tx.amount = body.amount
    if body.note is not None:
        tx.note = body.note

    await db.commit()
    await db.refresh(tx)
    return {
        "id": str(tx.id),
        "type": tx.type,
        "category": tx.category,
        "amount": float(tx.amount),
        "note": tx.note,
        "status": "ok",
    }


class TransactionBulkDelete(BaseModel):
    ids: list[str]


@router.post("/bulk-delete")
async def bulk_delete_transactions(
    body: TransactionBulkDelete,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "accountant")),
):
    try:
        uuids = [parse_uuid(i) for i in body.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid transaction id")
    await db.execute(sa_delete(Transaction).where(Transaction.id.in_(uuids)))
    await db.commit()
    return {"deleted": len(uuids), "status": "ok"}


@router.post("", status_code=201)
async def create_transaction(
    body: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "accountant")),
):
    tx = Transaction(
        type=body.type,
        category=body.category,
        amount=body.amount,
        ref_id=parse_uuid(body.ref_id) if body.ref_id else None,
        note=body.note,
        created_by=parse_uuid(current_user["sub"]),
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return {"id": str(tx.id), "status": "ok"}
