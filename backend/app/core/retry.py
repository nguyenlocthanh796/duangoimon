"""Async Retry Decorator for Background Schedulers & External Integrations."""

import asyncio
import functools
import logging

logger = logging.getLogger(__name__)


def async_retry(max_retries: int = 3, delay: float = 2.0, backoff: float = 2.0):
    """Decorator to retry an async function upon exception with exponential backoff."""

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(1, max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        logger.error(
                            "Function %s failed after %d attempts: %s",
                            func.__name__,
                            max_retries,
                            e,
                            exc_info=True,
                        )
                        raise
                    logger.warning(
                        "Function %s attempt %d/%d failed (%s). Retrying in %.1fs...",
                        func.__name__,
                        attempt,
                        max_retries,
                        e,
                        current_delay,
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff

        return wrapper

    return decorator
