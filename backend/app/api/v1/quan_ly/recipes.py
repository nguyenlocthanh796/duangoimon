"""Quan-ly Recipes API router."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Product
from app.models.recipe import RawMaterial, Recipe, RecipeItem, RecipeVersion

router = APIRouter(prefix="/quan-ly", tags=["quan-ly"])


# ── Schemas ──


class RawMaterialCreate(BaseModel):
    code: str = Field(..., max_length=50, pattern="^[A-Z0-9]+$")
    name: str = Field(..., max_length=200)
    category: str | None = Field(None, max_length=100)
    unit: str = Field(default="kg", max_length=20)
    default_cost: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)
    current_stock: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=4)
    min_stock: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=4)
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
    raw_material_id: str = Field(..., pattern="^[a-f0-9-]{36}$")
    quantity: Decimal = Field(..., gt=Decimal(0), max_digits=14, decimal_places=4)
    unit: str = Field(default="kg", max_length=20)
    cost: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)
    note: str | None = Field(None, max_length=500)


class RecipeCreate(BaseModel):
    product_id: str
    name: str
    yield_qty: float = 1
    yield_unit: str = "phần"
    instructions: str | None = None
    wastage_percent: float = 0
    items: list[RecipeItemCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    yield_qty: float | None = None
    yield_unit: str | None = None
    instructions: str | None = None
    wastage_percent: float | None = None
    items: list[RecipeItemCreate] | None = None


# ── Helpers ──


def _rm_to_dict(rm: RawMaterial) -> dict:
    return {
        "id": str(rm.id),
        "code": rm.code,
        "name": rm.name,
        "category": rm.category,
        "unit": rm.unit,
        "default_cost": float(rm.default_cost),
        "current_stock": float(rm.current_stock),
        "min_stock": float(rm.min_stock),
        "is_active": rm.is_active,
        "created_at": rm.created_at.isoformat() if rm.created_at else None,
    }


def _calc_food_cost(cost_price: float, product_price: float) -> float:
    if not product_price:
        return 0.0
    return round((cost_price / product_price) * 100, 2)


async def _enrich_recipe(r: Recipe, db: AsyncSession, product_map: dict | None = None) -> dict:
    """Convert Recipe ORM to enriched dict with product info."""
    if product_map is not None:
        product = product_map.get(str(r.product_id))
    else:
        prod_result = await db.execute(select(Product).where(Product.id == r.product_id))
        product = prod_result.scalar_one_or_none()
    product_price = float(product.price) if product else 0
    product_name = product.name if product else ""

    return {
        "id": str(r.id),
        "product_id": str(r.product_id),
        "product_name": product_name,
        "product_price": product_price,
        "recipe_name": r.name,
        "name": r.name,
        "yield_qty": float(r.yield_qty),
        "yield_unit": r.yield_unit,
        "cost_price": float(r.cost_price),
        "food_cost_pct": _calc_food_cost(float(r.cost_price), product_price),
        "ingredient_count": len(r.items or []),
        "instructions": r.instructions,
        "wastage_percent": float(r.wastage_percent),
        "is_active": r.is_active,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "items": [
            {
                "id": str(i.id),
                "raw_material_id": str(i.raw_material_id),
                "quantity": float(i.quantity),
                "unit": i.unit,
                "cost": float(i.cost),
                "note": i.note,
            }
            for i in (r.items or [])
        ],
    }


# ── Raw Materials CRUD ──


@router.get("/raw-materials")
async def list_raw_materials(
    db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(RawMaterial).order_by(RawMaterial.name))
    return [_rm_to_dict(rm) for rm in result.scalars().all()]


@router.post("/raw-materials", status_code=201)
async def create_raw_material(
    body: RawMaterialCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    rm = RawMaterial(**body.model_dump())
    db.add(rm)
    await db.commit()
    await db.refresh(rm)
    return _rm_to_dict(rm)


@router.put("/raw-materials/{rm_id}")
async def update_raw_material(
    rm_id: str,
    body: RawMaterialUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(RawMaterial).where(RawMaterial.id == parse_uuid(rm_id)))
    rm = result.scalar_one_or_none()
    if not rm:
        raise HTTPException(status_code=404, detail="Raw material not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(rm, k, v)
    await db.commit()
    await db.refresh(rm)
    return _rm_to_dict(rm)


@router.delete("/raw-materials/{rm_id}")
async def delete_raw_material(
    rm_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(RawMaterial).where(RawMaterial.id == parse_uuid(rm_id)))
    rm = result.scalar_one_or_none()
    if not rm:
        raise HTTPException(status_code=404, detail="Raw material not found")
    await db.delete(rm)
    await db.commit()
    return {"status": "ok", "deleted": rm_id}


# ── Recipes CRUD ──


@router.get("/recipes")
async def list_recipes(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Recipe).options(selectinload(Recipe.items)).order_by(Recipe.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    recipes = page_result["items"]
    prod_ids = list(set(r.product_id for r in recipes if r.product_id))
    prod_map = {}
    if prod_ids:
        p_res = await db.execute(select(Product).where(Product.id.in_(prod_ids)))
        prod_map = {str(p.id): p for p in p_res.scalars().all()}
    page_result["items"] = [await _enrich_recipe(r, db, product_map=prod_map) for r in recipes]
    return page_result


@router.post("/recipes", status_code=201)
async def create_recipe(
    body: RecipeCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    prod_result = await db.execute(select(Product).where(Product.id == parse_uuid(body.product_id)))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    recipe = Recipe(
        product_id=parse_uuid(body.product_id),
        name=body.name,
        yield_qty=body.yield_qty,
        yield_unit=body.yield_unit,
        instructions=body.instructions,
        wastage_percent=body.wastage_percent,
    )

    total_cost = 0
    for item_data in body.items:
        rm_result = await db.execute(
            select(RawMaterial).where(RawMaterial.id == parse_uuid(item_data.raw_material_id))
        )
        rm = rm_result.scalar_one_or_none()
        item_cost = (
            item_data.cost
            if item_data.cost
            else (rm.default_cost * item_data.quantity if rm else 0)
        )
        total_cost += item_cost
        recipe.items.append(
            RecipeItem(
                raw_material_id=parse_uuid(item_data.raw_material_id),
                quantity=item_data.quantity,
                unit=item_data.unit,
                cost=item_cost,
                note=item_data.note,
            )
        )

    recipe.cost_price = total_cost
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)

    # Save version 1
    version = RecipeVersion(
        recipe_id=recipe.id,
        version_number=1,
        name=recipe.name,
        cost_price=total_cost,
        items_json=[
            {
                "raw_material_id": str(i.raw_material_id),
                "quantity": float(i.quantity),
                "unit": i.unit,
                "cost": float(i.cost),
                "note": i.note,
            }
            for i in recipe.items
        ],
    )
    db.add(version)
    await db.commit()

    return await _enrich_recipe(recipe, db)


@router.put("/recipes/{recipe_id}")
async def update_recipe(
    recipe_id: str,
    body: RecipeUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Recipe).options(selectinload(Recipe.items)).where(Recipe.id == parse_uuid(recipe_id))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")

    update_data = body.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for k, v in update_data.items():
        setattr(r, k, v)

    if items_data is not None:
        for old_item in r.items:
            await db.delete(old_item)
        r.items.clear()
        total_cost = 0
        for item_data in items_data:
            rm_result = await db.execute(
                select(RawMaterial).where(RawMaterial.id == parse_uuid(item_data["raw_material_id"]))
            )
            rm = rm_result.scalar_one_or_none()
            item_cost = item_data.get("cost", 0) or (
                rm.default_cost * item_data["quantity"] if rm else 0
            )
            total_cost += item_cost
            r.items.append(
                RecipeItem(
                    raw_material_id=parse_uuid(item_data["raw_material_id"]),
                    quantity=item_data["quantity"],
                    unit=item_data.get("unit", "kg"),
                    cost=item_cost,
                    note=item_data.get("note"),
                )
            )
        r.cost_price = total_cost

    await db.commit()
    await db.refresh(r)

    # Save new version
    from sqlalchemy import func as _func
    prev_ver = await db.scalar(
        select(_func.max(RecipeVersion.version_number))
        .where(RecipeVersion.recipe_id == r.id)
    ) or 0
    version = RecipeVersion(
        recipe_id=r.id,
        version_number=prev_ver + 1,
        name=r.name,
        cost_price=float(r.cost_price),
        items_json=[
            {
                "raw_material_id": str(i.raw_material_id),
                "quantity": float(i.quantity),
                "unit": i.unit,
                "cost": float(i.cost),
                "note": i.note,
            }
            for i in r.items
        ],
    )
    db.add(version)
    await db.commit()

    return await _enrich_recipe(r, db)


@router.get("/recipes/{recipe_id}")
async def get_recipe(
    recipe_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Recipe).options(selectinload(Recipe.items)).where(Recipe.id == parse_uuid(recipe_id))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return await _enrich_recipe(r, db)


@router.get("/recipes/{recipe_id}/versions")
async def list_recipe_versions(
    recipe_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(RecipeVersion)
        .where(RecipeVersion.recipe_id == parse_uuid(recipe_id))
        .order_by(RecipeVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "version_number": v.version_number,
            "name": v.name,
            "cost_price": float(v.cost_price),
            "items": v.items_json,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in versions
    ]


@router.delete("/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(select(Recipe).where(Recipe.id == parse_uuid(recipe_id)))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    await db.delete(r)
    await db.commit()
    return {"status": "ok"}


# ── Food Cost Report ──


@router.get("/food-cost")
async def food_cost_report(
    db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
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
        report.append(
            {
                "product_id": str(r.product_id),
                "product_name": prod.name,
                "product_price": float(prod.price),
                "recipe_name": r.name,
                "cost_price": float(r.cost_price),
                "food_cost_pct": _calc_food_cost(float(r.cost_price), float(prod.price)),
                "ingredient_count": len(r.items or []),
            }
        )
    return sorted(report, key=lambda x: x["food_cost_pct"], reverse=True)
