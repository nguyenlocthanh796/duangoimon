"""Notification log (Tuân thủ & cảnh báo HKD 2026).

Records every tax-related alert (threshold breach, deadline escalation,
EOM close) so the system has a real, auditable trail instead of only
console logs. Persisted to the `thue` schema.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    __table_args__ = ({"schema": "thue"},)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    category: Mapped[str] = mapped_column(String(30))  # threshold | deadline | eom
    channel: Mapped[str] = mapped_column(String(20), default="in_app")  # in_app|email|sms|zalo
    recipient: Mapped[str | None] = mapped_column(String(120), nullable=True)
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    ref_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
