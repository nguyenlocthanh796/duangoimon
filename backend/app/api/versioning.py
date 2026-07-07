"""API Versioning Strategy

## Current
- All endpoints under `/api/v1/...`
- Modules organized by domain: ban_hang, quan_ly, ke_toan, public

## Deprecation Path
1. New feature lands in both v1 + v2 during transition
2. v1 routes marked with deprecation warning header
3. After grace period (6 months), v1 removed

## How to Add v2
Create `app/api/v2/` mirror of v1 structure.
Register in main.py:

    from app.api import v2
    app.include_router(v2.router, prefix="/api/v2")

## Helper
"""
from fastapi.responses import Response
from typing import Callable


def deprecation_header(route: Callable, sunset_date: str = "2026-12-31"):
    """Decorator that adds deprecation warning to v1 routes."""
    async def wrapper(*args, **kwargs):
        resp = await route(*args, **kwargs)
        if isinstance(resp, Response):
            resp.headers["X-API-Deprecated"] = "true"
            resp.headers["X-API-Sunset"] = sunset_date
        return resp
    return wrapper
