import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.ban_hang import Order, OrderItem, Table
from app.schemas.ban_hang import OrderOut


def _uuid(val: str) -> uuid.UUID:
    try:
        return uuid.UUID(val)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {val}")


router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class SplitOrderBody(BaseModel):
    order_id: str
    item_ids: list[str]
    new_table_id: str | None = None


class SplitTableBody(BaseModel):
    order_id: str
    item_ids: list[str]
    new_table_id: str


class MoveTableBody(BaseModel):
    table_id: str


class MergeOrdersBody(BaseModel):
    source_order_id: str
    target_order_id: str | None = None


class CancelItemBody(BaseModel):
    item_id: str
    reason: str


# ── Split Order ──────────────────────────────────────────────────────────────

@router.post("/split", response_model=dict, status_code=201)
async def split_order(body: SplitOrderBody, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(body.order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Cannot split a paid order")

    item_id_set = set(body.item_ids)
    split_items = [i for i in order.items if str(i.id) in item_id_set]
    keep_items = [i for i in order.items if str(i.id) not in item_id_set]

    if not split_items:
        raise HTTPException(status_code=400, detail="No items to split")

    orig_total = sum(i.unit_price * i.quantity for i in order.items)
    keep_total = sum(i.unit_price * i.quantity for i in keep_items)
    ratio = keep_total / orig_total if orig_total else 0

    order.total_amount = keep_total
    order.discount = round(order.discount * ratio, 2)
    order.tax_amount = round(sum(i.unit_price * i.quantity * (i.vat_rate or 0) / 100 for i in keep_items), 2)

    table_uuid = None
    if body.new_table_id:
        table_uuid = _uuid(body.new_table_id)
        await db.execute(update(Table).where(Table.id == table_uuid).values(status="dang_su_dung"))

    new_order = Order(
        table_id=table_uuid,
        cashier_id=uuid.UUID(current_user["sub"]),
        total_amount=sum(i.unit_price * i.quantity for i in split_items),
        note=f"Tách từ {order.id}",
    )
    db.add(new_order)
    await db.flush()

    for item in split_items:
        item.order_id = new_order.id
        db.add(item)

    await db.commit()
    await db.refresh(order)
    await db.refresh(new_order)
    return {"original_order": order, "new_order": new_order}


# ── Split Table ──────────────────────────────────────────────────────────────

@router.post("/split-table", response_model=dict, status_code=201)
async def split_table(body: SplitTableBody, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(body.order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Cannot split a paid order")

    item_id_set = set(body.item_ids)
    split_items = [i for i in order.items if str(i.id) in item_id_set]
    keep_items = [i for i in order.items if str(i.id) not in item_id_set]

    if not split_items:
        raise HTTPException(status_code=400, detail="No items to split")

    orig_total = sum(i.unit_price * i.quantity for i in order.items)
    keep_total = sum(i.unit_price * i.quantity for i in keep_items)
    ratio = keep_total / orig_total if orig_total else 0

    order.total_amount = keep_total
    order.discount = round(order.discount * ratio, 2)
    order.tax_amount = round(sum(i.unit_price * i.quantity * (i.vat_rate or 0) / 100 for i in keep_items), 2)
    table_uuid = _uuid(body.new_table_id)

    existing = await db.execute(
        select(Order).where(Order.table_id == table_uuid).where(Order.status != "da_thanh_toan")
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Target table already has an active order")

    await db.execute(update(Table).where(Table.id == table_uuid).values(status="dang_su_dung"))

    new_order = Order(
        table_id=table_uuid,
        cashier_id=uuid.UUID(current_user["sub"]),
        total_amount=sum(i.unit_price * i.quantity for i in split_items),
        note=f"Tách bàn từ {order.id}",
    )
    db.add(new_order)
    await db.flush()

    for item in split_items:
        item.order_id = new_order.id
        db.add(item)

    await db.commit()
    await db.refresh(order)
    await db.refresh(new_order)
    return {"original_order": order, "new_order": new_order}


# ── Move Table (with auto-merge if target occupied) ──────────────────────────

@router.patch("/{order_id}/move-table", response_model=OrderOut)
async def move_table(order_id: str, body: MoveTableBody, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Cannot move a paid order")

    new_table_uuid = _uuid(body.table_id)
    existing = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.table_id == new_table_uuid)
        .where(Order.status != "da_thanh_toan")
        .order_by(Order.created_at.desc())
    )
    target_order = existing.scalars().first()

    if target_order and str(target_order.id) != order_id:
        # M3: Check table exists
        tbl_result = await db.execute(select(Table).where(Table.id == new_table_uuid))
        if not tbl_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Target table not found")
        # Merge: move all items from source to target
        old_table_id = order.table_id
        for item in order.items:
            item.order_id = target_order.id
            db.add(item)
        target_order.total_amount = sum(i.unit_price * i.quantity for i in order.items) + sum(i.unit_price * i.quantity for i in target_order.items)
        order.status = "da_gop"
        order.table_id = None
        if old_table_id:
            await db.execute(update(Table).where(Table.id == old_table_id).values(status="trong"))
        await db.execute(update(Table).where(Table.id == new_table_uuid).values(status="dang_su_dung"))
        await db.commit()
        await db.refresh(target_order)
        return target_order

    # Simple move
    old_table_id = order.table_id
    order.table_id = new_table_uuid
    if old_table_id:
        await db.execute(update(Table).where(Table.id == old_table_id).values(status="trong"))
    await db.execute(update(Table).where(Table.id == new_table_uuid).values(status="dang_su_dung"))
    await db.commit()
    await db.refresh(order)
    return order


# ── Merge Orders ─────────────────────────────────────────────────────────────

@router.post("/merge", response_model=OrderOut)
async def merge_orders(body: MergeOrdersBody, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(body.source_order_id))
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source order not found")
    if source.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Cannot merge a paid order")

    if body.target_order_id:
        target_result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(body.target_order_id))
        )
        target = target_result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Target order not found")
        if target.status == "da_thanh_toan":
            raise HTTPException(status_code=400, detail="Cannot merge into a paid order")
    else:
        if not source.table_id:
            raise HTTPException(status_code=400, detail="Source order has no table")
        target_result = await db.execute(
            select(Order).options(selectinload(Order.items))
            .where(Order.table_id == source.table_id)
            .where(Order.status != "da_thanh_toan")
            .where(Order.id != source.id)
            .order_by(Order.created_at.desc())
        )
        target = target_result.scalars().first()
        if not target:
            raise HTTPException(status_code=400, detail="No active target order on this table")

    old_source_table = source.table_id
    for item in source.items:
        item.order_id = target.id
        db.add(item)
    target.total_amount = sum(i.unit_price * i.quantity for i in source.items) + sum(i.unit_price * i.quantity for i in target.items)
    source.status = "da_gop"
    source.table_id = None
    if old_source_table:
        await db.execute(update(Table).where(Table.id == old_source_table).values(status="trong"))
    await db.commit()
    await db.refresh(target)
    return target


# ── Cancel OrderItem ─────────────────────────────────────────────────────────

@router.post("/cancel-item", response_model=dict)
async def cancel_order_item(body: CancelItemBody, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(OrderItem).where(OrderItem.id == _uuid(body.item_id)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="OrderItem not found")
    item.status = "da_huy"
    options = item.options or {}
    options["cancel_reason"] = body.reason
    item.options = options

    # C2: Recalculate order total excluding cancelled items
    if item.order_id:
        order_result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == item.order_id)
        )
        order = order_result.scalar_one_or_none()
        if order:
            order.total_amount = sum(
                i.unit_price * i.quantity for i in order.items if i.status != "da_huy"
            )

    await db.commit()

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "item_cancelled",
        "item": {"id": str(item.id), "product_name": item.product_name, "reason": body.reason},
    })
    return {"status": "ok", "item_id": body.item_id}
