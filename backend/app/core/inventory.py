"""Auto-deduct inventory when order is paid.
Triggered after payment success, deducts raw material stock based on recipes.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ban_hang import Order
from app.models.recipe import RawMaterial, Recipe


async def deduct_inventory(order_id: str, db: AsyncSession):
    """Deduct raw materials stock based on order items' recipes."""
    # Get order with items
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == uuid.UUID(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        return  # Silent skip if no order

    # Get all product→recipe mappings
    product_ids = [str(item.product_id) for item in order.items if item.product_id]
    if not product_ids:
        return

    recipes_result = await db.execute(
        select(Recipe)
        .options(selectinload(Recipe.items))
        .where(Recipe.product_id.in_([uuid.UUID(pid) for pid in product_ids]))
        .where(Recipe.is_active == True)
    )
    recipes = {str(r.product_id): r for r in recipes_result.scalars()}

    alerts = []
    for item in order.items:
        pid = str(item.product_id)
        recipe = recipes.get(pid)
        if not recipe:
            continue  # No recipe for this product, skip

        for ri in recipe.items:
            qty_to_deduct = ri.quantity * item.quantity
            rm_result = await db.execute(
                select(RawMaterial).where(RawMaterial.id == ri.raw_material_id)
            )
            raw_material = rm_result.scalar_one_or_none()
            if not raw_material:
                continue

            raw_material.current_stock -= qty_to_deduct

            # Alert if below min_stock
            if raw_material.current_stock <= raw_material.min_stock:
                alerts.append(
                    {
                        "raw_material": raw_material.name,
                        "current_stock": float(raw_material.current_stock),
                        "min_stock": float(raw_material.min_stock),
                    }
                )

    await db.commit()

    # Broadcast stock alerts
    if alerts:
        from app.core.ws_manager import ws_manager

        await ws_manager.broadcast(
            "inventory",
            {
                "event": "stock_alert",
                "data": alerts,
            },
        )
