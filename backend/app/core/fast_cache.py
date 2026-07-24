"""In-memory high-speed Micro-Cache with Stale-While-Revalidate (SWR).
Bypasses WAN latency to Cloud Postgres for read-heavy F&B operations.
"""

import asyncio
import functools
import hashlib
import inspect
import json
import logging
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

# Cache structure: key -> (expire_time, stale_until_time, value)
_cache: dict[str, tuple[float, float, Any]] = {}
_revalidating_keys: set[str] = set()


def get_fast_cache(key: str) -> tuple[Optional[Any], bool]:
    """Retrieve cached item. Returns (value, is_stale).
    If valid: (value, False)
    If stale but usable: (value, True)
    If completely expired/missing: (None, False)
    """
    entry = _cache.get(key)
    if not entry:
        return None, False
    expire_time, stale_until, val = entry
    now = time.time()

    if now <= expire_time:
        return val, False  # Fresh hit
    elif now <= stale_until:
        return val, True   # Stale hit (can serve while revalidating in background)
    else:
        _cache.pop(key, None)
        return None, False # Fully expired


def set_fast_cache(key: str, value: Any, ttl_seconds: float = 10.0, stale_seconds: float = 60.0) -> None:
    """Store item in fast cache with TTL and SWR window."""
    now = time.time()
    _cache[key] = (now + ttl_seconds, now + ttl_seconds + stale_seconds, value)


def invalidate_fast_cache(prefix: Optional[str] = None) -> None:
    """Clear cache items by prefix or all if prefix is None."""
    if not prefix:
        _cache.clear()
        return
    keys_to_del = [k for k in _cache if k.startswith(prefix)]
    for k in keys_to_del:
        _cache.pop(k, None)


def _make_cache_key(func: Callable, args: tuple, kwargs: dict) -> str:
    """Build a stable string key from function name + JSON args."""
    sig = inspect.signature(func)
    bound = sig.bind_partial(*args, **kwargs)
    bound.apply_defaults()

    params = {}
    for p_name, p_val in bound.arguments.items():
        if p_name in ("request", "self", "cls"):
            continue
        params[p_name] = p_val

    raw = f"{func.__module__}.{func.__qualname__}:{json.dumps(params, sort_keys=True, default=str)}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


async def _async_revalidate(func: Callable, args: tuple, kwargs: dict, key: str, ttl_seconds: float, stale_seconds: float):
    """Background task to fetch fresh data from DB and update cache."""
    try:
        result = await func(*args, **kwargs)
        set_fast_cache(key, result, ttl_seconds=ttl_seconds, stale_seconds=stale_seconds)
    except Exception as e:
        logger.warning(f"Background SWR revalidation failed for {func.__qualname__}: {e}")
    finally:
        _revalidating_keys.discard(key)


def cached(ttl_seconds: float = 10.0, stale_seconds: float = 60.0):
    """Decorator: SWR (Stale-While-Revalidate) async in-memory cache.
    Returns stale data instantly (0ms server latency) while refreshing DB in background!
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = _make_cache_key(func, args, kwargs)
            val, is_stale = get_fast_cache(key)

            if val is not None:
                if is_stale and key not in _revalidating_keys:
                    _revalidating_keys.add(key)
                    asyncio.create_task(_async_revalidate(func, args, kwargs, key, ttl_seconds, stale_seconds))
                return val

            # Cache miss: fetch synchronously
            result = await func(*args, **kwargs)
            set_fast_cache(key, result, ttl_seconds=ttl_seconds, stale_seconds=stale_seconds)
            return result
        return wrapper
    return decorator


