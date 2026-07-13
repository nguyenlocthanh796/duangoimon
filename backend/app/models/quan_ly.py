import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = {"schema": "quan_ly"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    min_alert: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    __table_args__ = {"schema": "quan_ly"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    type: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[float] = mapped_column(Numeric(12, 2))
    amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # --- Tax module (TT152 §3): weighted-average cost at period close ---
    unit_cost: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    avg_cost_backfilled: Mapped[bool] = mapped_column(default=False)
    accounting_period: Mapped[str | None] = mapped_column(String(7), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ShiftLog(Base):
    __tablename__ = "shift_logs"
    __table_args__ = {"schema": "quan_ly"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    shift_code: Mapped[str | None] = mapped_column(String(20))
    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    opening_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    closing_balance: Mapped[float | None] = mapped_column(Numeric(14, 2))
    cash_end: Mapped[float | None] = mapped_column(Numeric(14, 2))
    card_total: Mapped[float | None] = mapped_column(Numeric(14, 2))
    transfer_total: Mapped[float | None] = mapped_column(Numeric(14, 2))
    total_revenue: Mapped[float | None] = mapped_column(Numeric(14, 2))
    expense_total: Mapped[float | None] = mapped_column(Numeric(14, 2))
    difference: Mapped[float | None] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(20), default="dang_lam")
    note: Mapped[str | None] = mapped_column(Text)
