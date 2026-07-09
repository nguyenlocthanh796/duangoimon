"""CSRF protection middleware — checks Origin/Referer for mutation requests."""
from fastapi import Request, HTTPException, status

# Options: comma-separated allowed origins, e.g. "http://localhost:3000,http://localhost:8081"
import os
ALLOWED_ORIGINS = set(
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081").split(",") if o.strip()
)


async def csrf_middleware(request: Request, call_next):
    """Reject mutation requests without valid Origin or Referer."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)

    # Skip CSRF for WebSocket and /public/ (QR self-order)
    path = request.url.path
    if path.startswith("/ws") or "/public/" in path or "/auth/" in path:
        return await call_next(request)

    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")

    if not origin and not referer:
        raise HTTPException(status_code=403, detail="CSRF check: missing Origin/Referer")

    if origin:
        if origin not in ALLOWED_ORIGINS:
            raise HTTPException(status_code=403, detail="CSRF check: invalid Origin")
    elif referer:
        allowed = False
        for o in ALLOWED_ORIGINS:
            if referer.startswith(o + "/") or referer.startswith(o + ":"):
                allowed = True
                break
        if not allowed:
            raise HTTPException(status_code=403, detail="CSRF check: invalid Referer")

    return await call_next(request)
