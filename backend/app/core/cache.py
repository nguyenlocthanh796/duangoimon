"""Redis cache layer for frequent queries.

ponytail: stub using in-memory dict. Replace with aioredis when Redis is provisioned.
"""
from __future__ import annotations
import time
from typing import Any, Callable, Awaitable

_cache: dict[str, tuple[Any, float]] = {}
DEFAULT_TTL = 300  # 5 minutes


async def cache_get(key: str) -> Any | None:
    """Get from cache. Returns None if missing or expired."""
    if key in _cache:
        val, expires = _cache[key]
        if time.time() < expires:
            return val
        del _cache[key]
    return None


async def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    """Set cache with TTL in seconds."""
    _cache[key] = (value, time.time() + ttl)


async def cache_delete(key: str) -> None:
    """Delete from cache."""
    _cache.pop(key, None)


async def cached(
    key: str,
    fetcher: Callable[[], Awaitable[Any]],
    ttl: int = DEFAULT_TTL,
) -> Any:
    """Cache-aside pattern: get from cache or fetch + store."""
    val = await cache_get(key)
    if val is not None:
        return val
    val = await fetcher()
    await cache_set(key, val, ttl)
    return val


async def invalidate_pattern(pattern: str) -> None:
    """Invalidate all keys starting with pattern."""
    to_delete = [k for k in _cache if k.startswith(pattern)]
    for k in to_delete:
        _cache.pop(k, None)
