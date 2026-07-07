"""Sentry error tracking configuration.

Usage:
    from app.core.sentry_config import init_sentry
    init_sentry()

Requires: pip install sentry-sdk
And SENTRY_DSN set in .env
"""
import os


def init_sentry():
    """Initialize Sentry SDK if DSN is configured."""
    dsn = os.getenv("SENTRY_DSN", "")
    if not dsn:
        return  # silently skip if not configured

    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=0.2,  # 20% for perf tracing
            send_default_pii=False,
            environment=os.getenv("ENV", "development"),
        )
    except ImportError:
        pass  # sentry-sdk not installed
