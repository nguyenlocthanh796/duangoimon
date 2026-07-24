"""In-memory high-speed Micro-Cache for FastAPI endpoints.
Bypasses WAN latency to Cloud Postgres for read-heavy F&B operations.
"""

import functools
import hashlib
import inspect
import json
import time
from typing import Any, Callable, Optional

_cache: dict[str, tuple[float, Any]] = {}


def get_fast_cache(key: str) -> Optional[Any]:
    """Retrieve cached item if not expired."""
    entry = _cache.get(key)
    if not entry:
        return None
    expire_time, val = entry
    if time.time() > expire_time:
        _cache.pop(key, None)
        return None
    return val


def set_fast_cache(key: str, value: Any, ttl_seconds: float = 10.0) -> None:
    """Store item in fast cache with TTL."""
    _cache[key] = (time.time() + ttl_seconds, value)


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
    # Skip the first argument if it's `self` or `request` (DB session, Request obj)
    sig = inspect.signature(func)
    bound = sig.bind_partial(*args, **kwargs)
    bound.apply_defaults()

    # Build a dict of param_name -> value for JSON-serializable params
    params = {}
    for p_name, p_val in bound.arguments.items():
        if p_name in ("request", "self", "cls"):
            continue
        params[p_name] = p_val

    raw = f"{func.__module__}.{func.__qualname__}:{json.dumps(params, sort_keys=True, default=str)}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def cached(ttl_seconds: float = 10.0):
    """Decorator: cache async function results in-memory with TTL.

    Usage:
        @cached(ttl_seconds=30.0)
        async def get_products(db: AsyncSession):
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = _make_cache_key(func, args, kwargs)
            hit = get_fast_cache(key)
            if hit is not None:
                return hit
            result = await func(*args, **kwargs)
            set_fast_cache(key, result, ttl_seconds=ttl_seconds)
            return result
        return wrapper
    return decorator

