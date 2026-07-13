import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    type: Mapped[str] = mapped_column(String(10))
    category: Mapped[str | None] = mapped_column(String(50))
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True)
    token: Mapped[str] = mapped_column(
        String(24),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: "inv_" + secrets.token_urlsafe(12),
    )
    buyer_name: Mapped[str | None] = mapped_column(String(200))
    buyer_tax_code: Mapped[str | None] = mapped_column(String(20))
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    vat_rate: Mapped[float] = mapped_column(Numeric(4, 2), default=10)
    vat_amount: Mapped[float | None] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(20), default="moi")
    exported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class SoS1a(Base):
    __tablename__ = "so_s1a"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    revenue_total: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS2a(Base):
    __tablename__ = "so_s2a"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    product_category: Mapped[str] = mapped_column(String(20), default="phan_phoi")
    revenue: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("1"))
    tncn_rate: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0.5"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS2b(Base):
    __tablename__ = "so_s2b"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    revenue: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS2c(Base):
    __tablename__ = "so_s2c"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    revenue: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    cost_of_goods: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    other_expense: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    taxable_income: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS2d(Base):
    __tablename__ = "so_s2d"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    opening_qty: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    inbound_qty: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    outbound_qty: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    closing_qty: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    avg_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    closing_value: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS2e(Base):
    __tablename__ = "so_s2e"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    bank_account: Mapped[str] = mapped_column(String(50), default="")
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    inflow: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    outflow: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    closing_balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SoS3a(Base):
    __tablename__ = "so_s3a"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    period_month: Mapped[str] = mapped_column(String(7), index=True)
    tax_type: Mapped[str] = mapped_column(String(20), default="xnk")
    payable: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    paid: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=Decimal("0"))
    signed_by: Mapped[str] = mapped_column(String(100), default="")
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CashRegisterInvoice(Base):
    __tablename__ = "cash_register_invoices"
    __table_args__ = {"schema": "ke_toan"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    invoice_code: Mapped[str] = mapped_column(
        String(23),
        unique=True,
        index=True,
        default=lambda: "M" + secrets.token_hex(11).upper()[:22],
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    buyer_name: Mapped[str | None] = mapped_column(String(200))
    buyer_tax_code: Mapped[str | None] = mapped_column(String(20))
    buyer_personal_id: Mapped[str | None] = mapped_column(String(20))
    total: Mapped[float] = mapped_column(Numeric(16, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="moi")
    adjustment_of: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    adjustment_type: Mapped[str | None] = mapped_column(String(10))
    tax_auth_status: Mapped[str | None] = mapped_column(String(20))
    qr_data: Mapped[str | None] = mapped_column(Text)
    delivery_channels: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
