"""HKD tax profile model (schema: thue).

Represents a household business (Hộ Kinh Doanh) registered under one
branch of the POSA tenant. Drives the revenue-tier classification
(Nhóm 1-4) per Nghị định 141/2026/NĐ-CP and Thông tư 152/2025/TT-BTC.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class HKDProfile(Base):
    __tablename__ = "hkd_profiles"
    __table_args__ = {"schema": "thue"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    tax_code: Mapped[str] = mapped_column(String(14), index=True)
    legal_name: Mapped[str] = mapped_column(String(200))
    registration_status: Mapped[str] = mapped_column(String(20), default="chua_dang_ky")
    tax_method: Mapped[str] = mapped_column(String(20), default="mien_thue")
    revenue_ytd: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    fiscal_year: Mapped[int] = mapped_column(default=lambda: datetime.now(timezone.utc).year)
    opened_in_first_half: Mapped[bool] = mapped_column(default=True)
    threshold_alert_sent: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
