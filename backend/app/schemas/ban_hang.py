import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    area: str | None
    capacity: int
    status: str


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    category: str | None
    price: float
    cost_price: float
    unit: str
    image_url: str | None
    is_active: bool
    options: list | dict
    created_at: datetime


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    quantity: int
    unit_price: float
    options: dict
    note: str | None
    status: str
    service_type: str
    order_round: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    table_id: uuid.UUID | None
    cashier_id: uuid.UUID | None
    status: str
    note: str | None
    total_amount: float
    discount: float
    tax_amount: float
    payment_method: str | None
    created_at: datetime
    paid_at: datetime | None
    items: list[OrderItemOut] = []
