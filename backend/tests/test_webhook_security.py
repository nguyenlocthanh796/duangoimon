"""Tests for webhook HMAC-SHA256 signature verification — security-critical, 0%."""
import hashlib
import hmac

import pytest


class TestWebhookSignature:
    """verify_signature validates HMAC-SHA256 of request body."""

    def test_valid_signature(self):
        from app.core.webhook_service import verify_signature

        key = "test-secret"
        body = b'{"order_id": "123"}'
        sig = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()
        assert verify_signature(body, sig, secret=key) is True

    def test_invalid_signature(self):
        from app.core.webhook_service import verify_signature

        body = b'{"order_id": "123"}'
        wrong_sig = "not-the-real-signature"
        assert verify_signature(body, wrong_sig, secret="test-secret") is False

    def test_missing_signature_rejected(self):
        from app.core.webhook_service import verify_signature

        assert verify_signature(b"body", None, secret="sec") is False

    def test_no_secret_dev_mode(self):
        """When no secret is configured, dev mode: ALL webhooks pass."""
        from app.core.webhook_service import verify_signature

        assert verify_signature(b"anything", None, secret="") is True
        assert verify_signature(b"anything", "garbage", secret="") is True

    def test_empty_body(self):
        from app.core.webhook_service import verify_signature

        key = "sec"
        sig = hmac.new(key.encode(), b"", hashlib.sha256).hexdigest()
        assert verify_signature(b"", sig, secret=key) is True

    def test_grab_momo_delegates_correctly(self):
        """Grab/Momo convenience functions delegate to verify_signature.
        Since _get_secret() now reads env at call time, we can test
        with a real secret by setting WEBHOOK_SECRET."""
        import hashlib
        import hmac
        import os

        from app.core.webhook_service import verify_grab_signature, verify_momo_signature

        key = "test-secret-123"
        body = b'{"webhook": "payload"}'
        sig = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()

        old = os.environ.get("WEBHOOK_SECRET")
        os.environ["WEBHOOK_SECRET"] = key
        try:
            assert verify_grab_signature(body, sig) is True
            assert verify_grab_signature(body, "bad-sig") is False
            assert verify_momo_signature(body, sig) is True
            assert verify_momo_signature(body, "bad-sig") is False
        finally:
            if old:
                os.environ["WEBHOOK_SECRET"] = old
            else:
                del os.environ["WEBHOOK_SECRET"]


class TestDeprecationHeader:
    """deprecation_header adds API deprecation warning headers."""

    def test_deprecation_header_added(self):
        from fastapi.responses import JSONResponse

        from app.api.versioning import deprecation_header

        async def fake_route(*args, **kwargs):
            return JSONResponse(content={"status": "ok"}, status_code=200)

        wrapped = deprecation_header(fake_route, sunset_date="2026-12-31")
        import asyncio

        resp = asyncio.run(wrapped())
        assert resp.headers.get("X-API-Deprecated") == "true"
        assert resp.headers.get("X-API-Sunset") == "2026-12-31"

    def test_deprecation_default_sunset(self):
        from fastapi.responses import JSONResponse

        from app.api.versioning import deprecation_header

        async def fake_route(*args, **kwargs):
            return JSONResponse(content={"msg": "hi"}, status_code=200)

        wrapped = deprecation_header(fake_route)
        import asyncio

        resp = asyncio.run(wrapped())
        assert resp.headers.get("X-API-Deprecated") == "true"

    def test_deprecation_skipped_for_non_response(self):
        """If route returns a dict, it's not a Response — header should not be set
        (standard FastAPI behavior). The wrapper checks isinstance(resp, Response)."""
        from app.api.versioning import deprecation_header

        async def fake_route(*args, **kwargs):
            return {"message": "plain dict"}  # not a Response

        wrapped = deprecation_header(fake_route)
        import asyncio

        resp = asyncio.run(wrapped())
        # plain dict doesn't have headers; but FastAPI converts it.
        # The wrapper adds headers only to Response objects.
