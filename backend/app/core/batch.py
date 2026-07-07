"""Batch operations utility for bulk create/update/delete.

Usage:
    from app.core.batch import batch_create, batch_update
    
    # Create 50 orders in one transaction
    await batch_create(db, Order, [Order(...) for ... in data])
"""
from typing import Any, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update as sa_update, delete as sa_delete
from app.models import Base


async def batch_create(
    db: AsyncSession,
    model: Type[Base],
    items: list[Base],
    chunk_size: int = 100,
) -> list[Base]:
    """Bulk insert records. Flushes in chunks, returns inserted objects."""
    created = []
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        db.add_all(chunk)
        await db.flush()
        created.extend(chunk)
    await db.commit()
    return created


async def batch_update(
    db: AsyncSession,
    model: Type[Base],
    ids: list[Any],
    values: dict[str, Any],
    chunk_size: int = 100,
) -> int:
    """Bulk update records by IDs. Returns count of updated rows."""
    total = 0
    for i in range(0, len(ids), chunk_size):
        chunk_ids = ids[i:i + chunk_size]
        result = await db.execute(
            sa_update(model)
            .where(model.id.in_(chunk_ids))
            .values(**values)
        )
        total += result.rowcount
    await db.commit()
    return total


async def batch_delete(
    db: AsyncSession,
    model: Type[Base],
    ids: list[Any],
    soft: bool = True,
    chunk_size: int = 100,
) -> int:
    """Bulk soft or hard delete records. Returns count."""
    from datetime import datetime, timezone
    total = 0
    for i in range(0, len(ids), chunk_size):
        chunk_ids = ids[i:i + chunk_size]
        if soft and hasattr(model, "deleted_at"):
            result = await db.execute(
                sa_update(model)
                .where(model.id.in_(chunk_ids))
                .values(deleted_at=datetime.now(timezone.utc))
            )
        else:
            result = await db.execute(
                sa_delete(model).where(model.id.in_(chunk_ids))
            )
        total += result.rowcount
    await db.commit()
    return total
