"""POS F&B Thue HKD - Input/Output validation schemas (TT 88/2021/TT-BTC)."""

import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class HKDProfileCreate(BaseModel):
    tax_code: str = Field(..., max_length=14, min_length=10)
    legal_name: str = Field(..., max_length=200)
    tax_method: str = Field("mien_thue", max_length=20)
    fiscal_year: int = Field(2026, ge=2020, le=2100)
    opened_in_first_half: bool = True


class HKDProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    branch_id: uuid.UUID | None = None
    tax_code: str
    legal_name: str
    registration_status: str
    tax_method: str
    revenue_ytd: Decimal
    fiscal_year: int
    opened_in_first_half: bool
    threshold_alert_sent: bool
    created_at: datetime
    updated_at: datetime | None = None


class CashRegisterInvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    branch_id: uuid.UUID | None = None
    order_id: uuid.UUID
    invoice_code: str
    issued_at: datetime
    buyer_name: str | None = None
    buyer_tax_code: str | None = None
    buyer_personal_id: str | None = None
    total: Decimal
    status: str
    qr_data: str | None = None
    created_at: datetime
