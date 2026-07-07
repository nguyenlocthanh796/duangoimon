import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Product

router = APIRouter(prefix="/quan-ly/products", tags=["quan-ly"])


class ProductCreate(BaseModel):
    code: str
    name: str
    category: str | None = None
    price: float
    cost_price: float = 0
    unit: str = "phần"
    is_active: bool = True
    options: list = []


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = None
    cost_price: float | None = None
    unit: str | None = None
    is_active: bool | None = None
    options: list | None = None


def _to_dict(p: Product) -> dict:
    return {
        "id": str(p.id),
        "code": p.code,
        "name": p.name,
        "category": p.category,
        "price": float(p.price),
        "cost_price": float(p.cost_price),
        "unit": p.unit,
        "is_active": p.is_active,
        "options": p.options if p.options else [],
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("")
async def list_products(
        page: PageParams = Depends(),
        db: AsyncSession = Depends(get_db),
        _user: dict = Depends(get_current_user),
    ):
    query = select(Product).where(Product.is_active == True).order_by(Product.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_product_dict(p) for p in page_result["items"]]
    return page_result


@router.get("/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_dict(p)


@router.post("", status_code=201)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    product = Product(**body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return _to_dict(product)


@router.put("/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in data.items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return _to_dict(p)


@router.delete("/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(p)
    await db.commit()
    return {"status": "ok"}
