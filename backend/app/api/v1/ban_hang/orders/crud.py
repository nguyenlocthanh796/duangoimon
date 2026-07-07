import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Order, OrderItem, Table
from app.schemas.ban_hang import OrderOut

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: str
    product_name: str = ""
    quantity: int = 1
    unit_price: float
    options: dict | None = None
    vat_rate: float = 8
    note: str | None = None
    service_type: str = "dine_in"
    order_round: int = 1
    status: str = "moi"


class OrderStatusUpdate(BaseModel):
    status: str


class OrderCreate(BaseModel):
    table_id: str
    items: list[OrderItemCreate]
    note: str | None = None


class OrderUpdate(BaseModel):
    items: list[OrderItemCreate]
    note: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
async def list_orders(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return await paginate(db, query, page.page, page.page_size)


@router.post("/", response_model=OrderOut, status_code=201)
async def create_order(body: OrderCreate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    total = sum(i.unit_price * i.quantity for i in body.items)
    total_tax = sum(round(i.unit_price * i.quantity * i.vat_rate / 100, 2) for i in body.items)
    table_uuid = None if body.table_id == "TAKEAWAY" else uuid.UUID(body.table_id)
    order = Order(
        table_id=table_uuid,
        cashier_id=uuid.UUID(current_user["sub"]),
        total_amount=total,
        tax_amount=total_tax,
        note=body.note,
    )
    db.add(order)
    await db.flush()

    for item in body.items:
        oi = OrderItem(
            order_id=order.id,
            product_id=uuid.UUID(item.product_id),
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            options=item.options or {},
            vat_rate=item.vat_rate,
            note=item.note,
            service_type=item.service_type,
            order_round=item.order_round,
            status=item.status,
        )
        db.add(oi)

    if table_uuid:
        await db.execute(
            update(Table).where(Table.id == table_uuid).values(status="dang_su_dung")
        )

    await db.commit()
    await db.refresh(order)

    # Audit log
    from app.core.audit import log_action
    await log_action(
        db, str(current_user["sub"]), current_user.get("username"),
        "create", "order", str(order.id),
        new_value={"total": total, "table_id": body.table_id, "items": len(body.items)},
        request=request,
    )

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "new_order",
        "order": {"id": str(order.id), "table_id": str(order.table_id), "total": float(order.total_amount), "note": order.note, "created_at": str(order.created_at)},
    })

    return order


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == uuid.UUID(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == uuid.UUID(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    status = body.status.strip()
    if not status:
        raise HTTPException(status_code=400, detail="Status cannot be empty")

    old_status = order.status
    order.status = status
    await db.commit()
    await db.refresh(order)

    # Audit
    from app.core.audit import log_action
    await log_action(
        db, str(_user["sub"]), _user.get("username"),
        "update", "order", str(order.id),
        old_value={"status": old_status},
        new_value={"status": status},
        request=request,
    )

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "order_updated",
        "order": {"id": str(order.id), "status": order.status},
    })

    return order


@router.put("/{order_id}", response_model=OrderOut)
async def update_order(
    order_id: str,
    body: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == uuid.UUID(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order already paid")

    await db.execute(delete(OrderItem).where(OrderItem.order_id == order.id))

    for item in body.items:
        oi = OrderItem(
            order_id=order.id,
            product_id=uuid.UUID(item.product_id),
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            options=item.options or {},
            vat_rate=item.vat_rate,
            note=item.note,
            service_type=item.service_type,
            order_round=item.order_round,
            status=item.status,
        )
        db.add(oi)

    order.total_amount = sum(i.unit_price * i.quantity for i in body.items)
    order.tax_amount = sum(round(i.unit_price * i.quantity * i.vat_rate / 100, 2) for i in body.items)
    if body.note is not None:
        order.note = body.note

    if order.table_id:
        await db.execute(
            update(Table).where(Table.id == order.table_id).values(status="dang_su_dung")
        )

    await db.commit()
    await db.refresh(order)

    from app.core.ws_manager import ws_manager
    await ws_manager.broadcast("kitchen", {
        "event": "order_updated",
        "order": {
            "id": str(order.id),
            "table_id": str(order.table_id) if order.table_id else None,
            "total": float(order.total_amount),
            "note": order.note,
            "status": order.status,
            "created_at": str(order.created_at)
        },
    })

    return order


@router.get("/active-table/{table_id}", response_model=OrderOut | None)
async def get_active_order_for_table(
    table_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.table_id == uuid.UUID(table_id))
        .where(Order.status != "da_thanh_toan")
        .order_by(Order.created_at.desc())
    )
    order = result.scalars().first()
    return order
