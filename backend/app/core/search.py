"""Generic search and filter utilities for list endpoints.

Usage:
    from app.core.search import apply_filters, SearchParam

    @router.get("/orders")
    async def list_orders(
        status: str = None,
        date_from: str = None,
        date_to: str = None,
        search: str = None,
        db: AsyncSession = Depends(get_db),
        ...
    ):
        q = select(Order)
        q = apply_filters(q, Order, status=status, date_from=date_from, date_to=date_to)
        if search:
            q = q.where(Order.note.ilike(f"%{search}%"))
        ...
"""
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.sql import Select


def apply_filters(
    query: Select,
    model,
    **kwargs,
) -> Select:
    """Apply common filters to a query based on kwargs.
    
    Supported filter keys:
    - status: exact match
    - is_active: boolean match
    - category: exact match
    - payment_method: exact match
    - date_from: filter on model.created_at >= value
    - date_to: filter on model.created_at < value (next day)
    - date_field: override which field to filter date on (default: created_at)
    - branch_id: exact match
    - min_amount: filter on model.total_amount >= value
    - max_amount: filter on model.total_amount <= value
    """
    filters = {}

    # Extract known filters
    for key in ("status", "is_active", "category", "payment_method", "branch_id"):
        val = kwargs.pop(key, None)
        if val is not None:
            filters[key] = val

    # Date range
    date_field_name = kwargs.pop("date_field", "created_at")
    date_field = getattr(model, date_field_name, None)
    date_from = kwargs.pop("date_from", None)
    date_to = kwargs.pop("date_to", None)

    if date_field:
        if date_from:
            query = query.where(date_field >= _parse_date(date_from))
        if date_to:
            end = _parse_date(date_to)
            # If date_to has no time component, include full day
            if "T" not in str(date_to):
                from datetime import timedelta
                end = end + timedelta(days=1)
            query = query.where(date_field < end)

    # Amount range
    amount_field = kwargs.pop("amount_field", "total_amount")
    amount_attr = getattr(model, amount_field, None)
    min_amount = kwargs.pop("min_amount", None)
    max_amount = kwargs.pop("max_amount", None)

    if amount_attr:
        if min_amount is not None:
            query = query.where(amount_attr >= float(min_amount))
        if max_amount is not None:
            query = query.where(amount_attr <= float(max_amount))

    # Apply exact value filters
    for key, val in filters.items():
        col = getattr(model, key, None)
        if col is not None and val is not None:
            query = query.where(col == val)

    # Also handle soft delete visibility
    if hasattr(model, "deleted_at"):
        query = query.where(model.deleted_at.is_(None))

    return query


def _parse_date(value: str) -> datetime:
    """Parse date string to datetime. Supports ISO format and YYYY-MM-DD."""
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        pass
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        pass
    return datetime.now(timezone.utc)
