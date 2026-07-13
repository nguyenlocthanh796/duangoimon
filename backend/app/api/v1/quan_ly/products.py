import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Product

router = APIRouter(prefix="/quan-ly/products", tags=["quan-ly"])


class ProductCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    category: str | None = Field(None, max_length=50)
    price: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    cost_price: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    unit: str = Field(default="phần", max_length=20)
    is_active: bool = True
    options: list = []


class ProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    category: str | None = Field(None, max_length=50)
    price: Decimal | None = Field(None, max_digits=10, decimal_places=2)
    cost_price: Decimal | None = Field(None, max_digits=10, decimal_places=2)
    unit: str | None = Field(None, max_length=20)
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
    page_result["items"] = [_to_dict(p) for p in page_result["items"]]
    return page_result


@router.get("/{product_id}")
async def get_product(
    product_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_dict(p)


@router.post("", status_code=201)
async def create_product(
    body: ProductCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    try:
        product = Product(**body.model_dump())
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return _to_dict(product)
    except Exception:
        await db.rollback()
        raise


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    try:
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
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise


@router.delete("/{product_id}")
async def delete_product(
    product_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    try:
        result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")
        await db.delete(p)
        await db.commit()
        return {"deleted": True}
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
