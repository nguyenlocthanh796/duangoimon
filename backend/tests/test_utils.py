"""Unit tests for core utility modules — no DB needed."""
import asyncio

import pytest


class TestUuidUtils:
    """parse_uuid should parse valid UUIDs and raise 422 on invalid."""

    def test_parse_valid_uuid(self):
        import uuid

        from app.core.uuid_utils import parse_uuid

        u = uuid.uuid4()
        assert parse_uuid(str(u)) == u

    def test_parse_invalid_uuid_raises(self):
        from fastapi import HTTPException

        from app.core.uuid_utils import parse_uuid

        with pytest.raises(HTTPException) as exc:
            parse_uuid("not-a-uuid")
        assert exc.value.status_code == 422


class TestCache:
    """In-memory cache layer: get/set/delete/cached/invalidate."""

    async def test_set_and_get(self):
        from app.core.cache import cache_get, cache_set

        await cache_set("k1", "v1", ttl=60)
        assert await cache_get("k1") == "v1"

    async def test_get_missing_returns_none(self):
        from app.core.cache import cache_get

        assert await cache_get("does_not_exist_xyz") is None

    async def test_expired_returns_none(self):
        from app.core.cache import cache_get, cache_set

        await cache_set("k_exp", "v", ttl=-1)  # already expired
        assert await cache_get("k_exp") is None

    async def test_delete(self):
        from app.core.cache import cache_delete, cache_get, cache_set

        await cache_set("k_del", "v", ttl=60)
        await cache_delete("k_del")
        assert await cache_get("k_del") is None

    async def test_cached_fetches_and_stores(self):
        from app.core.cache import cache_get, cached

        calls = {"n": 0}

        async def fetcher():
            calls["n"] += 1
            return "fetched"

        # First call fetches
        r1 = await cached("k_cached", fetcher, ttl=60)
        # Second call uses cache
        r2 = await cached("k_cached", fetcher, ttl=60)
        assert r1 == "fetched"
        assert r2 == "fetched"
        assert calls["n"] == 1  # fetcher only called once

    async def test_invalidate_pattern(self):
        from app.core.cache import cache_get, cache_set, invalidate_pattern

        await cache_set("prefix:a", "1", ttl=60)
        await cache_set("prefix:b", "2", ttl=60)
        await cache_set("other:c", "3", ttl=60)
        await invalidate_pattern("prefix:")
        assert await cache_get("prefix:a") is None
        assert await cache_get("prefix:b") is None
        assert await cache_get("other:c") == "3"


class TestSearchFilters:
    """apply_filters builds SQL WHERE clauses; _parse_date parses date strings."""

    def test_apply_status_filter(self):
        from sqlalchemy import select

        from app.core.search import apply_filters
        from app.models.ban_hang import Order

        q = apply_filters(select(Order), Order, status="moi")
        sql = str(q)
        assert "status" in sql

    def test_apply_date_range_filter(self):
        from sqlalchemy import select

        from app.core.search import apply_filters
        from app.models.ban_hang import Order

        q = apply_filters(
            select(Order), Order, date_from="2024-01-01", date_to="2024-12-31"
        )
        sql = str(q)
        assert "created_at" in sql

    def test_apply_amount_range_filter(self):
        from sqlalchemy import select

        from app.core.search import apply_filters
        from app.models.ban_hang import Order

        q = apply_filters(select(Order), Order, min_amount=10, max_amount=100)
        sql = str(q)
        assert "total_amount" in sql

    def test_invalid_date_field_falls_back(self):
        from sqlalchemy import select

        from app.core.search import apply_filters
        from app.models.ban_hang import Order

        # Malicious date_field name should be ignored and fall back to created_at
        q = apply_filters(
            select(Order), Order, date_field="; DROP TABLE", date_from="2024-01-01"
        )
        sql = str(q)
        assert "DROP TABLE" not in sql

    def test_parse_date_iso(self):
        from datetime import datetime

        from app.core.search import _parse_date

        d = _parse_date("2024-06-15T10:30:00")
        assert isinstance(d, datetime)
        assert d.year == 2024
        assert d.month == 6

    def test_parse_date_ymd(self):
        from datetime import datetime

        from app.core.search import _parse_date

        d = _parse_date("2024-06-15")
        assert isinstance(d, datetime)
        assert d.day == 15

    def test_parse_date_invalid_returns_now(self):
        from datetime import datetime

        from app.core.search import _parse_date

        d = _parse_date("garbage")
        assert isinstance(d, datetime)


class TestRetentionPolicy:
    """Retention policy constants and 5-year statutory table guard."""

    def test_retention_days_defined(self):
        from app.core.retention import RETENTION_DAYS

        assert RETENTION_DAYS["audit_logs"] == 365
        assert RETENTION_DAYS["message_logs"] == 180
        assert RETENTION_DAYS["shift_logs"] == 730
        assert RETENTION_DAYS["accounting_records"] == 1825

    def test_five_year_tables_include_statutory(self):
        from app.core.retention import FIVE_YEAR_TABLES

        # TT152 statutory accounting tables must be present
        assert "ke_toan.cash_register_invoices" in FIVE_YEAR_TABLES
        assert "thue.hkd_profiles" in FIVE_YEAR_TABLES
        assert len(FIVE_YEAR_TABLES) >= 10
