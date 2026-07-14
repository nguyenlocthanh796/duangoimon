"""Quan-ly Tables API router."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Table
from app.schemas.ban_hang import TableOut

router = APIRouter(prefix="/quan-ly/tables", tags=["quan-ly"])


class TableCreate(BaseModel):
    name: str = Field(..., max_length=50)
    area: str | None = Field(None, max_length=100)
    capacity: int = Field(default=4, ge=1, le=50)
    status: str = Field(default="trong", max_length=20)


class TableUpdate(BaseModel):
    name: str | None = Field(None, max_length=50)
    area: str | None = Field(None, max_length=100)
    capacity: int | None = Field(None, ge=1, le=50)
    status: str | None = Field(None, max_length=20)


@router.get("")
async def list_tables(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Table).order_by(Table.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [TableOut.model_validate(t).model_dump() for t in page_result["items"]]
    return page_result


@router.post("", status_code=201, response_model=TableOut)
async def create_table(
    body: TableCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    tbl = Table(**body.model_dump())
    db.add(tbl)
    await db.commit()
    await db.refresh(tbl)
    return tbl


@router.put("/{table_id}", response_model=TableOut)
async def update_table(
    table_id: str,
    body: TableUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)
    result = await db.execute(select(Table).where(Table.id == parse_uuid(table_id)))
    tbl = result.scalar_one_or_none()
    if not tbl:
        raise HTTPException(status_code=404, detail="Table not found")
    for k, v in data.items():
        setattr(tbl, k, v)
    await db.commit()
    await db.refresh(tbl)
    return tbl


@router.delete("/{table_id}")
async def delete_table(
    table_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Table).where(Table.id == parse_uuid(table_id)))
    tbl = result.scalar_one_or_none()
    if not tbl:
        raise HTTPException(status_code=404, detail="Table not found")
    await db.delete(tbl)
    await db.commit()
    return {"status": "ok"}
