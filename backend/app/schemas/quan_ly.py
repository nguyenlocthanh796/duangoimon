"""POS F&B Quan Ly - Input/Output validation schemas."""

import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class RawMaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=200)
    category: str | None = Field(None, max_length=50)
    unit: str = Field("kg", max_length=20)
    default_cost: Decimal = Field(Decimal("0"), max_digits=14, decimal_places=2)
    current_stock: Decimal = Field(Decimal("0"), max_digits=12, decimal_places=2)
    min_stock: Decimal = Field(Decimal("0"), max_digits=12, decimal_places=2)
    image_url: str | None = None
    is_active: bool = True
    created_at: datetime


class RecipeItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    recipe_id: uuid.UUID
    raw_material_id: uuid.UUID
    quantity: Decimal = Field(Decimal("0"), max_digits=12, decimal_places=3)
    unit: str = Field("kg", max_length=20)
    cost: Decimal = Field(Decimal("0"), max_digits=14, decimal_places=2)
    note: str | None = None


class RecipeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: uuid.UUID
    name: str = Field(..., max_length=200)
    yield_qty: Decimal = Field(Decimal("1"), max_digits=12, decimal_places=2)
    yield_unit: str = Field("phần", max_length=20)
    cost_price: Decimal = Field(Decimal("0"), max_digits=14, decimal_places=2)
    instructions: str | None = None
    wastage_percent: Decimal = Field(Decimal("0"), max_digits=5, decimal_places=2)
    is_active: bool = True
    created_at: datetime
    items: list[RecipeItemOut] = []


class ShiftLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    shift_code: str | None = None
    start_at: datetime
    end_at: datetime | None = None
    opening_balance: Decimal = Field(Decimal("0"), max_digits=14, decimal_places=2)
    closing_balance: Decimal | None = None
    total_revenue: Decimal | None = None
    status: str = Field("dang_lam", max_length=20)
    note: str | None = None
