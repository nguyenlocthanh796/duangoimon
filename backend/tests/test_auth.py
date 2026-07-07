"""Unit tests for auth module — no DB needed."""
import sys
sys.path.insert(0, '.')
import time

from app.core import auth
from app.core.auth import hash_password, verify_password, create_token, decode_token


class TestPassword:
    def test_hash_and_verify(self):
        h = hash_password("hello123")
        assert h != "hello123"
        assert verify_password("hello123", h)

    def test_wrong_password_fails(self):
        h = hash_password("correct")
        assert not verify_password("wrong", h)

    def test_different_hashes_same_password(self):
        """Same password produces different hashes (bcrypt salt)."""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2
        assert verify_password("same", h1)
        assert verify_password("same", h2)


class TestJWT:
    def test_create_and_decode_admin(self):
        token = create_token("user-abc", "admin")
        payload = decode_token(token)
        assert payload["sub"] == "user-abc"
        assert payload["role"] == "admin"
        assert "exp" in payload

    def test_create_and_decode_cashier(self):
        token = create_token("cashier-xyz", "cashier")
        payload = decode_token(token)
        assert payload["sub"] == "cashier-xyz"
        assert payload["role"] == "cashier"

    def test_decode_invalid_token_raises(self):
        import jwt as _jwt  # need the exception directly
        from fastapi import HTTPException
        try:
            decode_token("this.is.not.a.valid.jwt")
        except HTTPException as e:
            assert e.status_code == 401
            return
        assert False, "Should have raised HTTPException(401)"

    def test_decode_expired_token_raises(self):
        from fastapi import HTTPException
        import jwt as _jwt
        # Create token with expired time
        import os
        from app.core.config import settings
        from datetime import datetime, timedelta, timezone
        expired = _jwt.encode(
            {"sub": "test", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            settings.secret_key,
            algorithm="HS256",
        )
        try:
            decode_token(expired)
        except HTTPException as e:
            assert e.status_code == 401
            return
        assert False, "Should have raised HTTPException(401) for expired token"

    def test_token_payload_fields(self):
        token = create_token("u1", "manager")
        payload = decode_token(token)
        # Should not contain sensitive fields
        assert "password" not in payload
        assert "token" not in payload


class TestRateLimiter:
    def test_check_rate_limit_under(self):
        """Test the rate limiter logic directly."""
        from app.api.v1.auth import _check_login_rate, LOGIN_LIMIT, _login_attempts
        _login_attempts.clear()

        # Create a mock request object
        class MockRequest:
            class Client:
                host = "192.168.1.1"
            client = Client()

        # Should not raise for first LOGIN_LIMIT - 1 attempts
        for _ in range(LOGIN_LIMIT - 1):
            try:
                _check_login_rate(MockRequest())
            except Exception:
                assert False, f"Should not raise at {LOGIN_LIMIT - 1} attempts"

    def test_check_rate_limit_at_limit(self):
        from app.api.v1.auth import _check_login_rate, LOGIN_LIMIT, _login_attempts
        _login_attempts.clear()

        class MockRequest:
            class Client:
                host = "192.168.1.2"
            client = Client()

        # Reach limit
        for _ in range(LOGIN_LIMIT):
            _check_login_rate(MockRequest())

        # Next should raise
        from fastapi import HTTPException
        try:
            _check_login_rate(MockRequest())
        except HTTPException as e:
            assert e.status_code == 429
            return
        assert False, "Should have raised HTTPException(429)"

    def test_rate_limit_resets_after_window(self):
        from app.api.v1.auth import _check_login_rate, LOGIN_LIMIT, LOGIN_WINDOW, _login_attempts
        _login_attempts.clear()

        class MockRequest:
            class Client:
                host = "test-reset"
            client = Client()

        # Exhaust limit
        for _ in range(LOGIN_LIMIT):
            _check_login_rate(MockRequest())

        # Manually move timestamps back past window
        import copy
        now = time.time()
        _login_attempts["test-reset"] = [now - LOGIN_WINDOW - 1]

        # Should not raise now (old entries cleaned)
        from fastapi import HTTPException
        try:
            _check_login_rate(MockRequest())
        except HTTPException:
            assert False, "Should not raise after window reset"

    def test_rate_limit_unknown_ip(self):
        from app.api.v1.auth import _check_login_rate, LOGIN_LIMIT, _login_attempts
        _login_attempts.clear()

        class MockRequest:
            client = None  # Simulate behind proxy without IP

        # "unknown" IP should still be rate limited
        for _ in range(LOGIN_LIMIT):
            _check_login_rate(MockRequest())

        from fastapi import HTTPException
        try:
            _check_login_rate(MockRequest())
        except HTTPException as e:
            assert e.status_code == 429
            return
        assert False, "Should have raised HTTPException(429)"
