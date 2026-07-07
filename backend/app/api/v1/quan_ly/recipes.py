import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.recipe import RawMaterial, Recipe, RecipeItem
from app.models.ban_hang import Product

router = APIRouter(prefix="/quan-ly", tags=["quan-ly"])


# â”€â”€ Schemas â”€â”€

class RawMaterialCreate(BaseModel):
    code: str
    name: str
    category: str | None = None
    unit: str = "kg"
    default_cost: float = 0
    current_stock: float = 0
    min_stock: float = 0
    is_active: bool = True


class RawMaterialUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    default_cost: float | None = None
    current_stock: float | None = None
    min_stock: float | None = None
    is_active: bool | None = None


class RecipeItemCreate(BaseModel):
    raw_material_id: str
    quantity: float
    unit: str = "kg"
    cost: float = 0
    note: str | None = None


class RecipeCreate(BaseModel):
    product_id: str
    name: str
    yield_qty: float = 1
    yield_unit: str = "pháº§n"
    instructions: str | None = None
    wastage_percent: float = 0
    items: list[RecipeItemCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    yield_qty: float | None = None
    yield_unit: str | None = None
    instructions: str | None = None
    wastage_percent: float | None = None


# â”€â”€ Helpers â”€â”€

def _rm_to_dict(rm: RawMaterial) -> dict:
    return {
        "id": str(rm.id), "code": rm.code, "name": rm.name,
        "category": rm.category, "unit": rm.unit,
        "default_cost": float(rm.default_cost),
        "current_stock": float(rm.current_stock),
        "min_stock": float(rm.min_stock),
        "is_active": rm.is_active,
        "created_at": rm.created_at.isoformat() if rm.created_at else None,
    }

def _recipe_to_dict(r: Recipe) -> dict:
    return {
        "id": str(r.id), "product_id": str(r.product_id), "name": r.name,
        "yield_qty": float(r.yield_qty), "yield_unit": r.yield_unit,
        "cost_price": float(r.cost_price), "instructions": r.instructions,
        "wastage_percent": float(r.wastage_percent), "is_active": r.is_active,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "items": [
            {
                "id": str(i.id), "raw_material_id": str(i.raw_material_id),
                "quantity": float(i.quantity), "unit": i.unit,
                "cost": float(i.cost), "note": i.note,
            }
            for i in (r.items or [])
        ],
    }

def _calc_food_cost(cost_price: float, product_price: float) -> float:
    if not product_price:
        return 0
    return round((cost_price / product_price) * 100, 2)


# â”€â”€ Raw Materials CRUD â”€â”€

@router.get("/raw-materials")
async def list_raw_materials(db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(RawMaterial).order_by(RawMaterial.name))
    return [_rm_to_dict(rm) for rm in result.scalars()]


@router.post("/raw-materials", status_code=201)
async def create_raw_material(body: RawMaterialCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    rm = RawMaterial(**body.model_dump())
    db.add(rm)
    await db.commit()
    await db.refresh(rm)
    return _rm_to_dict(rm)


@router.put("/raw-materials/{rm_id}")
async def update_raw_material(rm_id: str, body: RawMaterialUpdate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(RawMaterial).where(RawMaterial.id == uuid.UUID(rm_id)))
    rm = result.scalar_one_or_none()
    if not rm:
        raise HTTPException(status_code=404, detail="Raw material not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(rm, k, v)
    await db.commit()
    await db.refresh(rm)
    return _rm_to_dict(rm)


# â”€â”€ Recipes CRUD â”€â”€

@router.get("/recipes")
async def list_recipes(
        page: PageParams = Depends(),
        db: AsyncSession = Depends(get_db),
        _user: dict = Depends(get_current_user),
    ):
    query = select(Recipe).order_by(Recipe.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_recipe_dict(r) for r in page_result["items"]]
    return page_result


@router.post("/recipes", status_code=201)
async def create_recipe(body: RecipeCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    # Verify product exists
    prod_result = await db.execute(select(Product).where(Product.id == uuid.UUID(body.product_id)))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    items_data = body.model_dump().pop("items", [])
    recipe = Recipe(
        product_id=uuid.UUID(body.product_id),
        name=body.name,
        yield_qty=body.yield_qty,
        yield_unit=body.yield_unit,
        instructions=body.instructions,
        wastage_percent=body.wastage_percent,
    )

    # Calculate cost from items
    total_cost = 0
    for item_data in body.items:
        rm_result = await db.execute(select(RawMaterial).where(RawMaterial.id == uuid.UUID(item_data.raw_material_id)))
        rm = rm_result.scalar_one_or_none()
        item_cost = item_data.cost if item_data.cost else (rm.default_cost * item_data.quantity if rm else 0)
        total_cost += item_cost
        recipe.items.append(RecipeItem(
            raw_material_id=uuid.UUID(item_data.raw_material_id),
            quantity=item_data.quantity,
            unit=item_data.unit,
            cost=item_cost,
            note=item_data.note,
        ))

    recipe.cost_price = total_cost
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return _recipe_to_dict(recipe)


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Recipe).options(selectinload(Recipe.items)).where(Recipe.id == uuid.UUID(recipe_id))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _recipe_to_dict(r)


@router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Recipe).where(Recipe.id == uuid.UUID(recipe_id)))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    await db.delete(r)
    await db.commit()
    return {"status": "ok"}


# â”€â”€ Food Cost Report â”€â”€

@router.get("/food-cost")
async def food_cost_report(db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Return food cost % for all products that have recipes."""
    products_result = await db.execute(select(Product).where(Product.is_active == True))
    products = {str(p.id): p for p in products_result.scalars()}

    recipes_result = await db.execute(
        select(Recipe).options(selectinload(Recipe.items)).where(Recipe.is_active == True)
    )
    report = []
    for r in recipes_result.scalars():
        prod = products.get(str(r.product_id))
        if not prod:
            continue
        report.append({
            "product_id": str(r.product_id),
            "product_name": prod.name,
            "product_price": float(prod.price),
            "recipe_name": r.name,
            "cost_price": float(r.cost_price),
            "food_cost_pct": _calc_food_cost(float(r.cost_price), float(prod.price)),
            "ingredient_count": len(r.items or []),
        })
    return sorted(report, key=lambda x: x["food_cost_pct"], reverse=True)

