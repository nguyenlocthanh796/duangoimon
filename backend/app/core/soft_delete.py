"""Soft delete mixin for ORM models.

Usage:
    class MyModel(Base, SoftDeleteMixin):
        __tablename__ = "my_model"
        ...
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


class SoftDeleteMixin:
    """Adds deleted_at column. Query active rows via .is_active filter."""

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    def soft_delete(self):
        self.deleted_at = datetime.now(timezone.utc)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
