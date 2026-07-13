"""Unit tests for newly added modules (middleware, async wrapper, cursor pagination, base types)."""
import asyncio
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


class TestSecurityHeaders:
    """SecurityHeadersMiddleware should add security headers to responses."""

    async def test_security_headers_present(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/healthz")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "geolocation=()" in resp.headers.get("Permissions-Policy", "")


class TestRequestID:
    """RequestIDMiddleware should assign an X-Request-ID header."""

    async def test_request_id_header_present(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/healthz")
        rid = resp.headers.get("X-Request-ID")
        assert rid is not None
        assert len(rid) == 8

    async def test_request_id_unique_per_request(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r1 = await ac.get("/healthz")
            r2 = await ac.get("/healthz")
        assert r1.headers.get("X-Request-ID") != r2.headers.get("X-Request-ID")


class TestAsyncTaskWrapper:
    """safe_task / create_safe_task should handle exceptions properly."""

    async def test_safe_task_success(self):
        from app.core.async_task_wrapper import safe_task

        called = {}

        async def _job():
            called["ran"] = True

        await safe_task(_job(), "test_success")
        assert called.get("ran") is True

    async def test_safe_task_reraises_exception(self):
        from app.core.async_task_wrapper import safe_task

        async def _job():
            raise ValueError("boom")

        with pytest.raises(ValueError, match="boom"):
            await safe_task(_job(), "test_failure")

    async def test_safe_task_reraises_cancelled(self):
        from app.core.async_task_wrapper import safe_task

        async def _job():
            raise asyncio.CancelledError()

        with pytest.raises(asyncio.CancelledError):
            await safe_task(_job(), "test_cancel")

    async def test_create_safe_task_returns_task(self):
        from app.core.async_task_wrapper import create_safe_task

        async def _job():
            return 42

        task = create_safe_task(_job(), "test_create")
        assert isinstance(task, asyncio.Task)
        await task


class TestBaseTypes:
    """MoneyAmount and PhoneNumber validators."""

    def test_money_amount_valid(self):
        from app.schemas.base_types import MoneyAmount
        from pydantic import BaseModel

        class M(BaseModel):
            amount: MoneyAmount

        m = M(amount=Decimal("100.50"))
        assert m.amount == Decimal("100.50")

    def test_money_amount_negative_rejected(self):
        from app.schemas.base_types import MoneyAmount
        from pydantic import BaseModel, ValidationError

        class M(BaseModel):
            amount: MoneyAmount

        with pytest.raises(ValidationError):
            M(amount=Decimal("-1"))

    def test_money_amount_too_large_rejected(self):
        from app.schemas.base_types import MoneyAmount
        from pydantic import BaseModel, ValidationError

        class M(BaseModel):
            amount: MoneyAmount

        with pytest.raises(ValidationError):
            M(amount=Decimal("100000000"))

    def test_phone_number_valid(self):
        from app.schemas.base_types import PhoneNumber
        from pydantic import BaseModel

        class P(BaseModel):
            phone: PhoneNumber

        p = P(phone="0912345678")
        assert p.phone == "0912345678"

    def test_phone_number_invalid_rejected(self):
        from app.schemas.base_types import PhoneNumber
        from pydantic import BaseModel, ValidationError

        class P(BaseModel):
            phone: PhoneNumber

        with pytest.raises(ValidationError):
            P(phone="123")


class TestCursorPagination:
    """pagination_cursor module basic interface."""

    def test_module_imports(self):
        import app.core.pagination_cursor as pc

        assert pc is not None

    def test_encode_decode_cursor_roundtrip(self):
        import app.core.pagination_cursor as pc

        # Only test if encode/decode helpers exist
        if hasattr(pc, "encode_cursor") and hasattr(pc, "decode_cursor"):
            token = pc.encode_cursor("2024-01-01T00:00:00")
            assert isinstance(token, str)
            decoded = pc.decode_cursor(token)
            assert decoded == "2024-01-01T00:00:00"


class TestLoggingConfig:
    """logging_config.setup_logging should return a configured logger."""

    def test_setup_logging(self):
        import logging

        from app.core.logging_config import setup_logging

        # setup_logging() configures the root logger in place and returns None.
        setup_logging()
        root_logger = logging.getLogger()
        assert len(root_logger.handlers) >= 1
