"""POS F&B Ke Toan - Input/Output validation schemas."""

import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    type: str = Field(..., max_length=10)  # thu / chi
    category: str | None = Field(None, max_length=50)
    amount: Decimal = Field(..., max_digits=14, decimal_places=2, gt=Decimal("0"))
    ref_id: uuid.UUID | None = None
    note: str | None = Field(None, max_length=500)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    branch_id: uuid.UUID | None = None
    type: str
    category: str | None = None
    amount: Decimal
    ref_id: uuid.UUID | None = None
    note: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    order_id: uuid.UUID
    branch_id: uuid.UUID | None = None
    invoice_number: str
    token: str | None = None
    buyer_name: str | None = None
    buyer_tax_code: str | None = None
    total_amount: Decimal
    vat_rate: Decimal
    vat_amount: Decimal | None = None
    status: str
    exported_at: datetime | None = None
    created_at: datetime
