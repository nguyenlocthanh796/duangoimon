"""Unit tests for CSRF middleware — no DB needed.

Uses a lightweight fake Request so we exercise the Origin/Referer logic
directly without spinning up the full ASGI stack.
"""
import pytest
from fastapi import HTTPException

from app.core.csrf_middleware import ALLOWED_ORIGINS, csrf_middleware


class _FakeURL:
    def __init__(self, path):
        self.path = path


class _FakeRequest:
    def __init__(self, method="POST", path="/api/v1/quan-ly/products", headers=None):
        self.method = method
        self.url = _FakeURL(path)
        self.headers = headers or {}


async def _noop_call_next(request):
    return "OK"


class TestCSRFMiddleware:
    async def test_safe_method_bypasses(self):
        req = _FakeRequest(method="GET")
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_public_path_bypasses(self):
        req = _FakeRequest(method="POST", path="/api/v1/public/order")
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_auth_path_bypasses(self):
        req = _FakeRequest(method="POST", path="/api/v1/auth/login")
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_ws_path_bypasses(self):
        req = _FakeRequest(method="POST", path="/ws/kitchen")
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_missing_origin_and_referer_rejected(self):
        req = _FakeRequest(method="POST", headers={})
        with pytest.raises(HTTPException) as exc:
            await csrf_middleware(req, _noop_call_next)
        assert exc.value.status_code == 403

    async def test_bearer_token_allows_missing_origin(self):
        # JWT Bearer cannot be set cross-origin, so it's CSRF-safe.
        req = _FakeRequest(method="POST", headers={"Authorization": "Bearer abc.def.ghi"})
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_valid_origin_allowed(self):
        origin = next(iter(ALLOWED_ORIGINS))
        req = _FakeRequest(method="POST", headers={"origin": origin})
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_invalid_origin_rejected(self):
        req = _FakeRequest(method="POST", headers={"origin": "http://evil.example.com"})
        with pytest.raises(HTTPException) as exc:
            await csrf_middleware(req, _noop_call_next)
        assert exc.value.status_code == 403

    async def test_valid_referer_allowed(self):
        origin = next(iter(ALLOWED_ORIGINS))
        req = _FakeRequest(method="POST", headers={"referer": origin + "/some/page"})
        assert await csrf_middleware(req, _noop_call_next) == "OK"

    async def test_invalid_referer_rejected(self):
        req = _FakeRequest(method="POST", headers={"referer": "http://evil.example.com/x"})
        with pytest.raises(HTTPException) as exc:
            await csrf_middleware(req, _noop_call_next)
        assert exc.value.status_code == 403
