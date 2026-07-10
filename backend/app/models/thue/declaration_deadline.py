"""Tax declaration deadline tracker (Thông tư 18/2026/TT-BTC).

Tracks the due dates for statutory forms and drives the escalating
countdown alert engine (run_deadline_escalation) so HKD never miss a
filing and incur the heavy late penalties.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class DeclarationDeadline(Base):
    __tablename__ = "declaration_deadlines"
    __table_args__ = {"schema": "thue"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    form: Mapped[str] = mapped_column(String(20))
    period_type: Mapped[str] = mapped_column(String(10), default="thang")
    due_date: Mapped[date] = mapped_column(Date)
    reminded_14: Mapped[bool] = mapped_column(default=False)
    reminded_7: Mapped[bool] = mapped_column(default=False)
    reminded_3: Mapped[bool] = mapped_column(default=False)
    reminded_1: Mapped[bool] = mapped_column(default=False)
    notified: Mapped[bool] = mapped_column(default=False)
    submitted: Mapped[bool] = mapped_column(default=False)
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
