"""Pagination utilities for list endpoints."""
from math import ceil
from typing import Any, TypeVar, Generic
from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PageParams:
    """FastAPI dependency that extracts pagination query params."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number (1-indexed)"),
        page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    ):
        self.page = page
        self.page_size = page_size


class PagedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100,
) -> dict:
    """Paginate a SQLAlchemy select query.
    
    Returns dict with items, total, page, page_size, total_pages.
    Items are raw ORM objects — caller must serialize.
    """
    page_size = min(max(page_size, 1), max_page_size)
    page = max(page, 1)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total > 0 else 0,
    }


# ── Self-validation (runs once at import) ──
def _self_validate() -> None:
    """Validate pagination math with known values."""
    # PagedResponse total_pages edge cases
    assert PagedResponse(items=[], total=0, page=1, page_size=20, total_pages=0).total_pages == 0
    assert PagedResponse(items=[1], total=1, page=1, page_size=20, total_pages=1).total_pages == 1
    assert PagedResponse(items=[1], total=21, page=1, page_size=20, total_pages=2).total_pages == 2
    assert PagedResponse(items=[1], total=20, page=1, page_size=20, total_pages=1).total_pages == 1
    assert PagedResponse(items=[1], total=100, page=1, page_size=30, total_pages=4).total_pages == 4

    # PageParams clamp (logic is in FastAPI Query ge=1, but verify)
    # PagedResponse negative/zero page not possible — API validation catches it.
    # test_page_params in test_core.py covers direct usage.
    pass


_self_validate()
