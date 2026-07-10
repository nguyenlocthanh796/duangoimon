"""Notified bank account / e-wallet (Mẫu 01/BK-STK) per Thông tư 18/2026/TT-BTC.

HKD must declare every bank account and e-wallet (MoMo, ZaloPay, VNPay)
used to receive customer payments. This feeds Open Banking reconciliation
into SoS2e (Sổ chi tiết tiền).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class NotifiedBankAccount(Base):
    __tablename__ = "notified_bank_accounts"
    __table_args__ = {"schema": "thue"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    tax_code: Mapped[str] = mapped_column(String(14), index=True)
    bank_name: Mapped[str] = mapped_column(String(50))
    account_number: Mapped[str] = mapped_column(String(30))
    wallet_type: Mapped[str] = mapped_column(String(20), default="bank")
    notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    form_status: Mapped[str] = mapped_column(
        String(20), default="chua_thong_bao"
    )
