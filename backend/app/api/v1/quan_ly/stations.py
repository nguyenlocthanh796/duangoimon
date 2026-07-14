"""Multi-station KDS routing - stations CRUD + routing logic."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.station import Station

router = APIRouter(prefix="/quan-ly/stations", tags=["quan-ly"])


class StationCreate(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20, pattern="^[A-Z0-9]+$")
    categories: list[str] = []
    printer_name: str | None = Field(None, max_length=100)


class StationUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    categories: list[str] | None = None
    printer_name: str | None = Field(None, max_length=100)
    is_active: bool | None = None


def _station_dict(s: Station) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "code": s.code,
        "categories": s.categories or [],
        "printer_name": s.printer_name,
        "is_active": s.is_active,
    }


# Default category-to-station mapping
DEFAULT_MAPPING: dict[str, str] = {
    "Món chính": "main",
    "Khai vị": "starter",
    "Đồ uống": "bar",
    "Nướng": "grill",
    "Lẩu": "grill",
    "Tráng miệng": "dessert",
}


def resolve_station_for_category(category: str | None, stations: list[Station]) -> str:
    """Return station code for a product category."""
    if not category:
        return "main"
    # Check if any station explicitly maps this category
    for s in stations:
        if s.categories and category in s.categories:
            return s.code
    # Fall back to default
    return DEFAULT_MAPPING.get(category, "main")


@router.get("")
async def list_stations(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Station).order_by(Station.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_station_dict(s) for s in page_result["items"]]
    return page_result


@router.post("", status_code=201)
async def create_station(
    body: StationCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    s = Station(**body.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _station_dict(s)


@router.put("/{s_id}")
async def update_station(
    s_id: str,
    body: StationUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Station).where(Station.id == parse_uuid(s_id)))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Station not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return _station_dict(s)
