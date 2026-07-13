from sqlalchemy.orm import DeclarativeBase

from app.core.soft_delete import SoftDeleteMixin


class Base(DeclarativeBase):
    pass


class BaseSoftDelete(Base, SoftDeleteMixin):
    """Base class with soft delete support."""

    __abstract__ = True
    __table_args__ = {}  # allow per-model override
