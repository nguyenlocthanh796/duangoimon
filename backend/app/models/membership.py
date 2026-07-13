"""Membership + Loyalty models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class MembershipTier(Base):
    __tablename__ = "membership_tiers"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50))  # đồng, bạc, vàng, kim cương
    min_spent: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    discount_rate: Mapped[float] = mapped_column(Numeric(4, 2), default=0)  # %
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)  # điểm × multiplier
    color: Mapped[str | None] = mapped_column(String(20))  # hex color
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class LoyaltyPoint(Base):
    __tablename__ = "loyalty_points"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    points: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(10))  # earn / redeem
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
