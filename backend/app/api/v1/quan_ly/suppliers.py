"""Quan-ly Suppliers API router."""

from app.core.uuid_utils import parse_uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.recipe import RawMaterial
from app.models.supplier import PurchaseOrder, PurchaseOrderItem, Supplier

router = APIRouter(prefix="/quan-ly", tags=["quan-ly"])


# ── Schemas ──
class SupplierCreate(BaseModel):
    code: str = Field(..., max_length=20, pattern="^[A-Z0-9]+$")
    name: str = Field(..., max_length=200)
    contact_person: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20, pattern="^[0-9\\-\\+]+$")
    email: str | None = Field(None, max_length=100)
    address: str | None = Field(None, max_length=500)
    tax_code: str | None = Field(None, max_length=50, pattern="^[0-9]{10}[A-Z]{3}$")
    payment_terms: str | None = Field(None, max_length=200)


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    tax_code: str | None = None
    payment_terms: str | None = None
    is_active: bool | None = None


class POItemCreate(BaseModel):
    raw_material_id: str = Field(..., pattern="^[a-f0-9-]{36}$")
    raw_material_name: str | None = Field(None, max_length=200)
    quantity: Decimal = Field(..., gt=Decimal(0), max_digits=14, decimal_places=4)
    unit_price: Decimal = Field(default=Decimal(0), max_digits=14, decimal_places=2)


class POCreate(BaseModel):
    supplier_id: str
    note: str | None = None
    expected_date: str | None = None
    items: list[POItemCreate] = []


class POReceiveBody(BaseModel):
    items: list[dict]


# ── Helpers ──
def _supplier_dict(s: Supplier) -> dict:
    return {
        "id": str(s.id),
        "code": s.code,
        "name": s.name,
        "contact_person": s.contact_person,
        "phone": s.phone,
        "email": s.email,
        "address": s.address,
        "tax_code": s.tax_code,
        "payment_terms": s.payment_terms,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _po_dict(po: PurchaseOrder) -> dict:
    return {
        "id": str(po.id),
        "po_number": po.po_number,
        "supplier_id": str(po.supplier_id) if po.supplier_id else None,
        "supplier_name": po.supplier.name if po.supplier else None,
        "status": po.status,
        "total_amount": float(po.total_amount),
        "note": po.note,
        "expected_date": po.expected_date.isoformat() if po.expected_date else None,
        "received_date": po.received_date.isoformat() if po.received_date else None,
        "created_by": str(po.created_by) if po.created_by else None,
        "created_at": po.created_at.isoformat() if po.created_at else None,
        "items": [
            {
                "id": str(i.id),
                "raw_material_id": str(i.raw_material_id) if i.raw_material_id else None,
                "raw_material_name": i.raw_material_name,
                "quantity": float(i.quantity),
                "unit_price": float(i.unit_price),
                "received_quantity": float(i.received_quantity),
                "total": float(i.total),
            }
            for i in (po.items or [])
        ],
    }


def _generate_po_number() -> str:
    today = datetime.now(timezone.utc)
    return f"PO-{today.strftime('%Y%m%d')}-{int(today.timestamp()) % 100000:05d}"


# ── Supplier CRUD ──
@router.get("/suppliers")
async def list_suppliers(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Supplier).order_by(Supplier.name)
    result = await paginate(db, query, page.page, page.page_size)
    result["items"] = [_supplier_dict(s) for s in result["items"]]
    return result


@router.post("/suppliers", status_code=201)
async def create_supplier(
    body: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    s = Supplier(**body.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _supplier_dict(s)


@router.put("/suppliers/{s_id}")
async def update_supplier(
    s_id: str,
    body: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Supplier).where(Supplier.id == parse_uuid(s_id)))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return _supplier_dict(s)


# ── Purchase Order CRUD ──
@router.get("/purchase-orders")
async def list_pos(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
        .order_by(PurchaseOrder.created_at.desc())
    )
    result = await paginate(db, query, page.page, page.page_size)
    result["items"] = [_po_dict(po) for po in result["items"]]
    return result


@router.post("/purchase-orders", status_code=201)
async def create_po(
    body: POCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    total = 0
    po = PurchaseOrder(
        po_number=_generate_po_number(),
        supplier_id=parse_uuid(body.supplier_id),
        note=body.note,
        expected_date=date.fromisoformat(body.expected_date) if body.expected_date else None,
    )
    for item in body.items:
        line_total = item.quantity * item.unit_price
        total += line_total
        rm_name = item.raw_material_name
        if not rm_name:
            rm_result = await db.execute(
                select(RawMaterial).where(RawMaterial.id == parse_uuid(item.raw_material_id))
            )
            rm = rm_result.scalar_one_or_none()
            rm_name = rm.name if rm else "Unknown"
        po.items.append(
            PurchaseOrderItem(
                raw_material_id=parse_uuid(item.raw_material_id),
                raw_material_name=rm_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=line_total,
            )
        )
    po.total_amount = total
    db.add(po)
    await db.commit()
    await db.refresh(po)
    return _po_dict(po)


@router.post("/purchase-orders/{po_id}/receive")
async def receive_po(
    po_id: str,
    body: POReceiveBody,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Receive goods: update stock + mark PO as received."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == parse_uuid(po_id))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status == "received":
        raise HTTPException(status_code=400, detail="PO already received")

    po.status = "received"
    po.received_date = date.today()

    item_map = {str(it.raw_material_id): it for it in po.items if it.raw_material_id}
    for rc in body.items:
        rm_id = rc.get("raw_material_id")
        qty = float(rc.get("quantity", 0))
        if rm_id and rm_id in item_map:
            item_map[rm_id].received_quantity += qty

        # Update stock — only if rm_id is valid
        if rm_id:
            rm_result = await db.execute(select(RawMaterial).where(RawMaterial.id == parse_uuid(rm_id)))
            rm = rm_result.scalar_one_or_none()
            if rm:
                rm.current_stock += qty

    await db.commit()
    return {"status": "ok", "po_id": po_id}
