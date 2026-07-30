"""CSRF protection middleware — checks Origin/Referer for mutation requests."""

import os
import re

from fastapi import Request
from fastapi.responses import JSONResponse

ALLOWED_ORIGINS = set(
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081").split(",")
    if o.strip()
)

# Regex to support wildcards/subdomains for local, LAN IPs, cloudflared, pages.dev, railway, and render
ALLOWED_ORIGINS_REGEX = re.compile(
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
    r"|^https://[a-z0-9-]+\.trycloudflare\.com$"
    r"|^https://(?:[a-z0-9-]+\.)*pages\.dev$"
    r"|^https://(?:[a-z0-9-]+\.)*up\.railway\.app$"
    r"|^https://[a-z0-9-]+\.onrender\.com$"
)


def _make_forbidden_response(detail: str, origin: str) -> JSONResponse:
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=403,
        content={"detail": detail},
        headers=headers,
    )


async def csrf_middleware(request: Request, call_next):
    """Reject mutation requests without valid Origin or Referer."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return await call_next(request)

    # Skip CSRF for WebSocket, public endpoints, and auth routes
    path = request.url.path
    if path.startswith("/ws") or "/public/" in path or "/auth/" in path:
        return await call_next(request)

    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")

    if not origin and not referer:
        # Allow requests with Authorization header (JWT Bearer token cannot be set
        # cross-origin, so this is CSRF-safe). Required for API clients and mobile.
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return _make_forbidden_response("CSRF check: missing Origin/Referer", origin)

    if origin:
        if origin not in ALLOWED_ORIGINS and not ALLOWED_ORIGINS_REGEX.match(origin):
            return _make_forbidden_response(f"CSRF check: invalid Origin '{origin}'", origin)
    elif referer:
        allowed = False
        for o in ALLOWED_ORIGINS:
            if referer.startswith(o + "/") or referer.startswith(o + ":"):
                allowed = True
                break
        if not allowed:
            ref_clean = referer.rstrip("/")
            parts = ref_clean.split("/")
            if len(parts) >= 3:
                ref_origin = f"{parts[0]}//{parts[2]}"
                if ALLOWED_ORIGINS_REGEX.match(ref_origin):
                    allowed = True
        if not allowed:
            return _make_forbidden_response(f"CSRF check: invalid Referer '{referer}'", origin)

    return await call_next(request)
