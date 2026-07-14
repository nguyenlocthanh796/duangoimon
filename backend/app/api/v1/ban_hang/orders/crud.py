"""Ban-hang Orders Crud API router."""

import uuid
from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Order, OrderItem, Product, Table
from app.schemas.ban_hang import OrderOut


def _uuid(val: str) -> uuid.UUID:
    try:
        return parse_uuid(val)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {val}")


router = APIRouter()

# ── Valid State Transitions ─────────────────────────────────────────────────────
VALID_TRANSITIONS = {
    "moi": ["gui_bep", "da_huy"],
    "gui_bep": ["dang_lam", "da_huy"],
    "dang_lam": ["hoan_thanh", "da_huy"],
    "hoan_thanh": [],  # terminal
    "da_thanh_toan": [],  # terminal
    "da_gop": [],  # terminal
    "da_huy": [],  # terminal
}


# ── Schemas ──────────────────────────────────────────────────────────────────


class OrderItemCreate(BaseModel):
    product_id: str
    product_name: str = ""  # ignored by server, always fetched from DB
    quantity: int = Field(default=1, ge=1, description="Must be >= 1")
    unit_price: float = Field(
        default=0, gt=0, description="Must be > 0 (server uses DB price anyway)"
    )
    options: dict | None = None
    vat_rate: float = Field(default=8.0, ge=0, le=100)
    note: str | None = None
    service_type: str = "dine_in"
    order_round: int = Field(default=1, ge=1)
    status: str = "moi"

    @field_validator("quantity")
    @classmethod
    def _check_qty(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Số lượng phải >= 1")
        return v

    @field_validator("unit_price")
    @classmethod
    def _check_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Đơn giá phải > 0")
        return v

    @field_validator("vat_rate")
    @classmethod
    def _check_vat(cls, v: float) -> float:
        ALLOWED_VAT = {0.0, 5.0, 8.0, 10.0}
        if v not in ALLOWED_VAT:
            raise ValueError(f"Thuế suất phải thuộc {ALLOWED_VAT}")
        return v


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
    status: str | None = Query(
        None, description="moi|gui_bep|dang_lam|hoan_thanh|da_thanh_toan|da_gop|da_huy"
    ),
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    result = await paginate(db, query, page.page, page.page_size)
    # Populate table_name on each order for kitchen / frontend display
    orders = result["items"]
    if orders:
        table_ids = [o.table_id for o in orders if o.table_id]
        if table_ids:
            tables_q = await db.execute(select(Table).where(Table.id.in_(table_ids)))
            tables = {str(t.id): t.name for t in tables_q.scalars().all()}
            for o in orders:
                if o.table_id and str(o.table_id) in tables:
                    o.table_name = tables[str(o.table_id)]
    return result


@router.post("/", response_model=OrderOut, status_code=201)
async def create_order(
    body: OrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Fetch products from DB — DO NOT trust client unit_price / product_name
    product_ids = [_uuid(item.product_id) for item in body.items]
    products_q = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = products_q.scalars().all()
    prod_map = {str(p.id): p for p in products}

    total = 0.0
    total_tax = 0.0
    for item in body.items:
        pid = _uuid(item.product_id)
        prod = prod_map.get(str(pid))
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        db_price = float(prod.price)
        total += db_price * item.quantity
        db_vat_rate = float(prod.vat_rate)  # ← from DB, NEVER from client
        total_tax += round(db_price * item.quantity * db_vat_rate / 100, 2)

    table_uuid = None if body.table_id == "TAKEAWAY" else _uuid(body.table_id)
    order = Order(
        table_id=table_uuid,
        cashier_id=parse_uuid(current_user["sub"]),
        total_amount=total,
        tax_amount=total_tax,
        note=body.note,
    )
    db.add(order)
    await db.flush()

    for item in body.items:
        pid = _uuid(item.product_id)
        prod = prod_map.get(str(pid))
        db_price = float(prod.price) if prod else 0
        db_name = prod.name if prod else ""
        db_vat_rate = float(prod.vat_rate) if prod else 8.0
        oi = OrderItem(
            order_id=order.id,
            product_id=pid,
            product_name=db_name,  # ← from DB
            quantity=item.quantity,
            unit_price=db_price,  # ← from DB
            total=db_price * item.quantity,
            options=item.options or {},
            vat_rate=db_vat_rate,  # ← from DB, NOT from client
            note=item.note,
            service_type=item.service_type,
            order_round=item.order_round,
            status="moi",  # ← always start as 'moi', ignore client
        )
        db.add(oi)

    if table_uuid:
        await db.execute(update(Table).where(Table.id == table_uuid).values(status="dang_su_dung"))

    await db.commit()
    await db.refresh(order)

    # Audit log
    from app.core.audit import log_action

    await log_action(
        db,
        str(current_user["sub"]),
        current_user.get("username"),
        "create",
        "order",
        str(order.id),
        new_value={"total": total, "table_id": body.table_id, "items": len(body.items)},
        request=request,
    )

    from app.core.ws_manager import ws_manager

    await ws_manager.broadcast(
        "kitchen",
        {
            "event": "new_order",
            "order": {
                "id": str(order.id),
                "table_id": str(order.table_id),
                "total": float(order.total_amount),
                "note": order.note,
                "created_at": str(order.created_at),
            },
        },
    )

    return order


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(order_id))
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
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == _uuid(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    status = body.status.strip()
    if not status:
        raise HTTPException(status_code=400, detail="Status cannot be empty")

    # ★ State machine: only allow valid transitions
    if order.status in ("da_thanh_toan", "da_gop", "hoan_thanh", "da_huy"):
        raise HTTPException(status_code=400, detail=f"Cannot update status from '{order.status}'")
    allowed = VALID_TRANSITIONS.get(order.status, [])
    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể chuyển từ '{order.status}' sang '{status}'. Hợp lệ: {allowed}",
        )

    old_status = order.status
    order.status = status
    await db.commit()
    await db.refresh(order)

    # Audit
    from app.core.audit import log_action

    await log_action(
        db,
        str(_user["sub"]),
        _user.get("username"),
        "update",
        "order",
        str(order.id),
        old_value={"status": old_status},
        new_value={"status": status},
        request=request,
    )

    from app.core.ws_manager import ws_manager

    await ws_manager.broadcast(
        "kitchen",
        {
            "event": "order_updated",
            "order": {"id": str(order.id), "status": order.status},
        },
    )

    return order


@router.put("/{order_id}", response_model=OrderOut)
async def update_order(
    order_id: str,
    body: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == parse_uuid(order_id))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "da_thanh_toan":
        raise HTTPException(status_code=400, detail="Order already paid")

    await db.execute(delete(OrderItem).where(OrderItem.order_id == order.id))

    # Fetch products from DB — DO NOT trust client unit_price / product_name
    product_ids = [_uuid(item.product_id) for item in body.items]
    products_q = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = products_q.scalars().all()
    prod_map = {str(p.id): p for p in products}

    for item in body.items:
        pid = _uuid(item.product_id)
        prod = prod_map.get(str(pid))
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        db_price = float(prod.price)
        db_name = prod.name
        db_vat_rate = float(prod.vat_rate)
        oi = OrderItem(
            order_id=order.id,
            product_id=pid,
            product_name=db_name,  # ← from DB
            quantity=item.quantity,
            unit_price=db_price,  # ← from DB
            total=db_price * item.quantity,
            options=item.options or {},
            vat_rate=db_vat_rate,  # ← from DB, NOT from client
            note=item.note,
            service_type=item.service_type,
            order_round=item.order_round,
            status="moi",  # ← always start as 'moi'
        )
        db.add(oi)

    order.total_amount = sum(
        float(prod_map[str(_uuid(i.product_id))].price) * i.quantity for i in body.items
    )
    order.tax_amount = sum(
        round(float(prod_map[str(_uuid(i.product_id))].price) * i.quantity * float(prod_map[str(_uuid(i.product_id))].vat_rate) / 100, 2)
        for i in body.items
    )
    if body.note is not None:
        order.note = body.note

    if order.table_id:
        await db.execute(
            update(Table).where(Table.id == order.table_id).values(status="dang_su_dung")
        )

    await db.commit()
    await db.refresh(order)

    from app.core.ws_manager import ws_manager

    await ws_manager.broadcast(
        "kitchen",
        {
            "event": "order_updated",
            "order": {
                "id": str(order.id),
                "table_id": str(order.table_id) if order.table_id else None,
                "total": float(order.total_amount),
                "note": order.note,
                "status": order.status,
                "created_at": str(order.created_at),
            },
        },
    )

    return order


@router.get("/active-table/{table_id}", response_model=OrderOut | None)
async def get_active_order_for_table(
    table_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.table_id == _uuid(table_id))
        .where(Order.status != "da_thanh_toan")
        .order_by(Order.created_at.desc())
    )
    order = result.scalars().first()
    return order
