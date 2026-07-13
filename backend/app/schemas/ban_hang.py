"""POSA Ban Hang - Input validation schemas.
DO NOT use float for money fields - use Decimal with MoneyAmount.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.base_types import MoneyAmount


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str = Field(..., max_length=10)
    area: str | None = Field(None, max_length=50)
    capacity: int = Field(..., ge=1, le=50)
    status: str = Field(..., max_length=20)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=100)
    category: str | None = Field(None, max_length=50)
    price: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    cost_price: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    unit: str = Field(..., max_length=20)
    image_url: str | None = Field(None, max_length=500)
    is_active: bool = True
    options: list | dict = []
    vat_rate: Decimal = Field(default=Decimal(0), max_digits=5, decimal_places=4)
    created_at: datetime


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str = Field(..., max_length=100)
    quantity: int = Field(..., ge=0)
    unit_price: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    options: Any = None
    vat_rate: Decimal = Field(default=Decimal(0), max_digits=5, decimal_places=4)
    note: str | None = Field(None, max_length=500)
    status: str = Field(..., max_length=20)
    service_type: str = Field(..., max_length=20)
    order_round: int = Field(0, ge=0)


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    table_id: uuid.UUID | None = None
    table_name: str | None = Field(None, max_length=50)
    cashier_id: uuid.UUID | None = None
    status: str = Field(..., max_length=20)
    note: str | None = Field(None, max_length=500)
    total_amount: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    discount: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    payment_method: str | None = Field(None, max_length=20)
    created_at: datetime
    paid_at: datetime | None = None
    items: list[OrderItemOut] = []
