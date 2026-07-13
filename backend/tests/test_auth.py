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
        from app.core.rate_limiter import check_rate_limit, clear_requests

        clear_requests()

        # Should allow first LIMIT - 1 requests
        for _ in range(4):
            assert check_rate_limit("1.1.1.1", 5), "Should allow up to limit-1"

    def test_check_rate_limit_at_limit(self):
        from app.core.rate_limiter import check_rate_limit, clear_requests

        clear_requests()

        # Reach limit
        for _ in range(5):
            check_rate_limit("1.1.1.2", 5)

        # Next should be denied
        assert not check_rate_limit("1.1.1.2", 5), "Should deny after limit"

    def test_rate_limit_resets_after_window(self):
        from app.core.rate_limiter import check_rate_limit, clear_requests
        import time

        clear_requests()

        # Exhaust limit
        for _ in range(5):
            check_rate_limit("test-reset", 5)

        # Manually move timestamps back past window
        from app.core.rate_limiter import _requests as rl_requests
        old = time.time() - 120  # 2 min ago (past 60s window)
        rl_requests["test-reset"] = [old]

        # Should allow again (old entries cleaned)
        assert check_rate_limit("test-reset", 5), "Should allow after window reset"

    def test_rate_limit_unknown_ip(self):
        from app.core.rate_limiter import check_rate_limit, clear_requests

        clear_requests()

        # "unknown" IP should still be rate limited
        for _ in range(5):
            check_rate_limit("unknown", 5)

        assert not check_rate_limit("unknown", 5), "Should deny unknown IP after limit"


class TestJWTBlacklist:
    """JWT blacklist rejects tokens even before their natural expiry."""

    def test_blacklist_and_check(self):
        from app.core.auth import (
            BLACKLISTED_EXP,
            blacklist_token,
            create_token,
            is_token_blacklisted,
        )
        import jwt as _jwt
        from app.core.config import settings

        BLACKLISTED_EXP.clear()
        token = create_token("user-1", role="admin")
        exp = _jwt.decode(
            token, settings.secret_key, algorithms=["HS256"], options={"verify_exp": False}
        )["exp"]

        # Not blacklisted initially
        assert not is_token_blacklisted(exp)
        # After blacklisting, it's rejected
        blacklist_token(token)
        assert is_token_blacklisted(exp)
        BLACKLISTED_EXP.clear()

    def test_blacklist_invalid_token_noop(self):
        from app.core.auth import blacklist_token

        # Should not raise on garbage token
        blacklist_token("not-a-jwt")

    def test_decode_rejects_blacklisted(self):
        import pytest
        from fastapi import HTTPException

        from app.core.auth import (
            BLACKLISTED_EXP,
            blacklist_token,
            create_token,
            decode_token,
        )

        BLACKLISTED_EXP.clear()
        token = create_token("user-2", role="cashier")
        # Valid before blacklist
        decode_token(token)
        # Rejected after blacklist
        blacklist_token(token)
        with pytest.raises(HTTPException):
            decode_token(token)
        BLACKLISTED_EXP.clear()


class TestTrustedProxy:
    """rate_limiter._is_trusted only trusts private/loopback proxy IPs."""

    def test_loopback_trusted(self):
        from app.core.rate_limiter import _is_trusted

        assert _is_trusted("127.0.0.1") is True

    def test_private_ranges_trusted(self):
        from app.core.rate_limiter import _is_trusted

        assert _is_trusted("10.1.2.3") is True
        assert _is_trusted("172.16.5.5") is True
        assert _is_trusted("192.168.1.1") is True

    def test_public_ip_not_trusted(self):
        from app.core.rate_limiter import _is_trusted

        # A public IP must NOT be trusted (prevents X-Forwarded-For spoofing)
        assert _is_trusted("8.8.8.8") is False

    def test_garbage_not_trusted(self):
        from app.core.rate_limiter import _is_trusted

        assert _is_trusted("not-an-ip") is False
