"""Customer self-order API — called by QR app."""

from app.core.uuid_utils import parse_uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.ws_manager import ws_manager
from app.models.ban_hang import Order, OrderItem, Product, Table

router = APIRouter(prefix="/public", tags=["public"])


class SelfOrderItem(BaseModel):
    product_id: str
    quantity: int = 1
    note: str | None = None


class SelfOrderCreate(BaseModel):
    table_id: str
    items: list[SelfOrderItem]


@router.get("/menu")
async def public_menu(db: AsyncSession = Depends(get_db)):
    """Public menu for QR self-order — no auth required."""
    result = await db.execute(
        select(Product).where(Product.is_active == True).order_by(Product.category, Product.name)
    )
    menu = {}
    for p in result.scalars().all():
        cat = p.category or "Khác"
        if cat not in menu:
            menu[cat] = []
        menu[cat].append({"id": str(p.id), "name": p.name, "price": float(p.price), "unit": p.unit})
    return menu


@router.get("/tables/{table_code}")
async def get_table(table_code: str, db: AsyncSession = Depends(get_db)):
    """Get table info by code (for QR linking)."""
    result = await db.execute(select(Table).where(Table.name == table_code))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"id": str(t.id), "name": t.name, "area": t.area}


@router.post("/orders", status_code=201)
async def create_self_order(
    body: SelfOrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create order from QR self-order. No auth — source tracked via table."""
    # Anti-spam: max 10 items per order
    if len(body.items) > 10:
        raise HTTPException(status_code=400, detail="Tối đa 10 món/đơn hàng")
    # Anti-spam: max quantity per item
    for item in body.items:
        if item.quantity > 20:
            raise HTTPException(status_code=400, detail="Số lượng mỗi món tối đa 20")

    table_id = parse_uuid(body.table_id)
    # Verify table exists
    t_result = await db.execute(select(Table).where(Table.id == table_id))
    if not t_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Table not found")

    order = Order(table_id=table_id, status="moi")
    db.add(order)
    await db.flush()

    total = 0
    for item in body.items:
        p_result = await db.execute(select(Product).where(Product.id == parse_uuid(item.product_id)))
        p = p_result.scalar_one_or_none()
        if not p:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sản phẩm '{item.product_id}' không tồn tại",
            )
        line_total = float(p.price) * item.quantity
        total += line_total
        oi = OrderItem(
            order_id=order.id,
            product_id=p.id,
            product_name=p.name,
            quantity=item.quantity,
            unit_price=float(p.price),
            total=line_total,
            note=item.note,
        )
        db.add(oi)

    order.total_amount = total
    await db.commit()
    await db.refresh(order)

    # Notify kitchen
    await ws_manager.broadcast("kitchen", {"type": "new_order", "order_id": str(order.id)})

    return {"order_id": str(order.id), "total": round(total, 2)}
