"""CSRF protection middleware — checks Origin/Referer for mutation requests."""

# Options: comma-separated allowed origins, e.g. "http://localhost:3000,http://localhost:8081"
import os
import re

from fastapi import HTTPException, Request

ALLOWED_ORIGINS = set(
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081").split(",")
    if o.strip()
)

# Regex to support wildcards/subdomains for local, LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x), cloudflared, pages.dev, railway, and render
ALLOWED_ORIGINS_REGEX = re.compile(
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
    r"|^https://[a-z0-9-]+\.trycloudflare\.com$"
    r"|^https://(?:[a-z0-9-]+\.)*pages\.dev$"
    r"|^https://(?:[a-z0-9-]+\.)*up\.railway\.app$"
    r"|^https://[a-z0-9-]+\.onrender\.com$"
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
        # Allow requests with Authorization header (JWT Bearer token cannot be set
        # cross-origin, so this is CSRF-safe). Required for API clients and tests.
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="CSRF check: missing Origin/Referer")

    if origin:
        if origin not in ALLOWED_ORIGINS and not ALLOWED_ORIGINS_REGEX.match(origin):
            raise HTTPException(status_code=403, detail=f"CSRF check: invalid Origin '{origin}'")
    elif referer:
        allowed = False
        for o in ALLOWED_ORIGINS:
            if referer.startswith(o + "/") or referer.startswith(o + ":"):
                allowed = True
                break
        if not allowed:
            # Check against regex pattern
            # Strip trailing slash if present for cleaner matching
            ref_clean = referer.rstrip("/")
            # Also extract origin part for regex matching
            parts = ref_clean.split("/")
            if len(parts) >= 3:
                ref_origin = f"{parts[0]}//{parts[2]}"
                if ALLOWED_ORIGINS_REGEX.match(ref_origin):
                    allowed = True
        if not allowed:
            raise HTTPException(status_code=403, detail=f"CSRF check: invalid Referer '{referer}'")

    return await call_next(request)

