"""Cursor-based pagination for efficient list endpoints.

Keyset pagination (cursor-based) avoids the O(n) offset cost of LIMIT/OFFSET.
Fast even on large pages because we filter by ID > cursor instead of skipping.
"""

from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

T = TypeVar("T")


class CursorPage(BaseModel, Generic[T]):
    """Cursor-based page response."""
    items: list[T]
    has_more: bool
    next_cursor: str | None = None


async def paginate_cursor(
    db: AsyncSession,
    query: Select,
    cursor: str | None = None,
    page_size: int = 20,
    max_page_size: int = 100,
) -> dict[str, Any]:
    """Paginate using cursor (keyset pagination).
    
    Args:
        db: AsyncSession
        query: SQLAlchemy select() statement (must already have ordering by ID)
        cursor: Last item's ID from previous page (base64 encoded UUID)
        page_size: Items to return
        max_page_size: Maximum allowed page_size
    
    Returns:
        dict with items, has_more, next_cursor
    """
    page_size = min(max(page_size, 1), max_page_size)
    
    # If cursor provided, only fetch items AFTER cursor
    if cursor:
        try:
            cursor_uuid = UUID(cursor)
            query = query.where(query.froms[0].c.id > cursor_uuid)
        except (ValueError, IndexError):
            pass  # Invalid cursor — start fresh
    
    # Fetch page_size + 1 to detect if there are more
    result = await db.execute(query.limit(page_size + 1))
    items = result.scalars().all()
    
    has_more = len(items) > page_size
    if has_more:
        items = items[:page_size]
        next_cursor = str(items[-1].id) if items else None
    else:
        next_cursor = None
    
    return {
        "items": items,
        "has_more": has_more,
        "next_cursor": next_cursor,
    }
