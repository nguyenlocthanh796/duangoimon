"""Data-lock guard for closed accounting periods (TT152 §3 — bất biến).

After an EOM close, every SoS2x row and InventoryTransaction of that
period is locked (locked_at set). Any mutation attempt must raise
423 Locked to preserve ledger integrity.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ke_toan import (
    SoS1a, SoS2a, SoS2b, SoS2c, SoS2d, SoS2e, SoS3a,
)
from app.models.quan_ly import InventoryTransaction

_LOCKED_MODELS = [SoS1a, SoS2a, SoS2b, SoS2c, SoS2d, SoS2e, SoS3a]


async def is_period_locked(
    db: AsyncSession, branch_id, period: str, model
) -> bool:
    result = await db.execute(
        select(model).where(
            model.branch_id == branch_id,
            model.period_month == period,
            model.locked_at.isnot(None),
        ).limit(1)
    )
    return result.first() is not None


async def assert_not_locked(
    db: AsyncSession, branch_id, period: str
) -> None:
    for model in _LOCKED_MODELS:
        if await is_period_locked(db, branch_id, period, model):
            raise LockedError(period)


async def lock_period(db: AsyncSession, branch_id, period: str) -> None:
    """Set locked_at on all statutory-book rows for the period."""
    for model in _LOCKED_MODELS:
        rows = await db.execute(
            select(model).where(
                model.branch_id == branch_id,
                model.period_month == period,
                model.locked_at.is_(None),
            )
        )
        for row in rows.scalars():
            row.locked_at = datetime.now(timezone.utc)
    # Lock inventory transactions of the period.
    txns = await db.execute(
        select(InventoryTransaction).where(
            InventoryTransaction.branch_id == branch_id,
            InventoryTransaction.accounting_period == period,
            InventoryTransaction.locked_at.is_(None),
        )
    )
    for tx in txns.scalars():
        tx.locked_at = datetime.now(timezone.utc)
    await db.commit()


class LockedError(Exception):
    """Raised when mutating a locked accounting period (HTTP 423)."""
