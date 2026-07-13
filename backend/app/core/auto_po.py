"""Auto PO generation — create purchase order drafts when stock < min_alert."""

import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quan_ly import Inventory
from app.models.recipe import RawMaterial
from app.models.supplier import PurchaseOrder, PurchaseOrderItem, Supplier


async def auto_generate_pos(db: AsyncSession, created_by: uuid.UUID | None = None) -> list[dict]:
    """Check all inventory items. For items below min_alert, create PO draft.

    Returns list of created PO summaries.

    ponytail: creates one PO per supplier. For v2, batch by supplier + expected_date.
    """
    # Find items below min_alert
    result = await db.execute(
        select(Inventory, RawMaterial)
        .join(RawMaterial, Inventory.product_id == RawMaterial.id, isouter=True)
        .where(Inventory.quantity < Inventory.min_alert)
        .order_by(Inventory.quantity)
    )
    low_stock = result.all()
    if not low_stock:
        return []

    # Group by supplier (via raw_material default_supplier heuristic — first supplier)
    # Simplified: find first supplier for all items
    supplier_result = await db.execute(select(Supplier).limit(1))
    supplier = supplier_result.scalar_one_or_none()
    if not supplier:
        return []

    # Create one PO
    po = PurchaseOrder(
        po_number=f"AUTO-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        supplier_id=supplier.id,
        status="draft",
        note=f"Auto-generated {date.today().isoformat()} — low stock items",
        expected_date=date.today() + timedelta(days=3),
        created_by=created_by,
    )
    db.add(po)
    await db.flush()

    total = 0
    for inv, mat in low_stock:
        qty = float(mat.min_stock or 10) if mat else 10
        unit_price = float(mat.default_cost or 0) if mat else 0
        item_total = qty * unit_price
        total += item_total
        poi = PurchaseOrderItem(
            po_id=po.id,
            raw_material_id=inv.product_id,
            raw_material_name=mat.name if mat else "Unknown",
            quantity=qty,
            unit_price=unit_price,
            total=item_total,
        )
        db.add(poi)

    po.total_amount = total
    await db.commit()
    await db.refresh(po)

    return [
        {
            "po_id": str(po.id),
            "po_number": po.po_number,
            "total_amount": float(total),
            "items_count": len(low_stock),
        }
    ]
