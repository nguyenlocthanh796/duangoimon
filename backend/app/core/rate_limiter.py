"""Rate limiting middleware for FastAPI."""
import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

# Per-IP request tracking
_requests: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT = 60  # max requests
RATE_WINDOW = 60  # seconds


async def rate_limit_middleware(request: Request, call_next):
    """Rate limit: 60 requests/min per IP."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = RATE_WINDOW

    # Clean old entries
    _requests[client_ip] = [t for t in _requests[client_ip] if now - t < window]

    if len(_requests[client_ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    _requests[client_ip].append(now)
    return await call_next(request)
