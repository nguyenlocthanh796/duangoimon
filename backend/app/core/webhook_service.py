"""Webhook signature verification — HMAC-SHA256.

Supports GrabFood, Momo, and generic webhook patterns.
Secret configured via env: WEBHOOK_SECRET (default empty → skip verify).
"""

import hashlib
import hmac
import os


def _get_secret() -> str:
    """Lazy-load the webhook secret so env var changes are respected at call time."""
    return os.getenv("WEBHOOK_SECRET", "")


def verify_signature(body: bytes, signature_header: str | None, secret: str | None = None) -> bool:
    """Verify HMAC-SHA256 signature.

    Args:
        body: Raw request body (bytes).
        signature_header: Value of X-Signature or similar header.
        secret: Override secret. Falls back to WEBHOOK_SECRET env.

    Returns:
        True if valid or if no secret configured (dev mode).
    """
    key = secret if secret is not None else _get_secret()
    if not key:
        return True  # dev mode — skip verify
    if not signature_header:
        return False
    expected = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip())


def verify_grab_signature(body: bytes, signature_header: str | None) -> bool:
    """GrabFood webhook: HMAC-SHA256, header X-Grab-Signature."""
    return verify_signature(body, signature_header)


def verify_momo_signature(body: bytes, signature_header: str | None) -> bool:
    """Momo webhook: HMAC-SHA256, header X-Momo-Signature."""
    return verify_signature(body, signature_header)
