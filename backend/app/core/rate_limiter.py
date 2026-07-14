"""Rate limiting middleware for FastAPI.

State is persisted to a JSON file so that --reload restarts don't reset counters.
For multi-worker production, replace with Redis (aioredis).
"""
import json
import os
import threading
import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse

# ── Whitelist of proxies we trust for X-Forwarded-For ─────────────────────
TRUSTED_PROXIES = {"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}


def _is_trusted(ip: str) -> bool:
    """Check if IP is a trusted proxy."""
    import socket
    try:
        packed = socket.inet_aton(ip)
        first_octet = packed[0]
        if ip in TRUSTED_PROXIES:
            return True
        if first_octet == 10:
            return True
        if first_octet == 172 and 16 <= packed[1] <= 31:
            return True
        if first_octet == 192 and packed[1] == 168:
            return True
    except (OSError, AttributeError, TypeError):
        pass
    return False


# ── File-based persistence (survives --reload) ─────────────────────────────
_STATE_FILE = os.path.join(os.path.dirname(__file__), ".rate_limit_state.json")
_requests: dict[str, list[float]] = defaultdict(list)
_lock = threading.Lock()


def _load_state() -> None:
    if not os.path.exists(_STATE_FILE):
        return
    try:
        with open(_STATE_FILE) as f:
            data: dict[str, list[float]] = json.load(f)
        now = time.time()
        for ip, timestamps in data.items():
            _requests[ip] = [t for t in timestamps if now - t < RATE_WINDOW]
    except (json.JSONDecodeError, OSError):
        pass


def _save_state() -> None:
    try:
        with _lock:
            data = {ip: ts for ip, ts in _requests.items() if ts}
        with open(_STATE_FILE, "w") as f:
            json.dump(data, f)
    except OSError:
        pass


_load_state()

RATE_LIMIT_LOGIN = 5
RATE_LIMIT_PUBLIC = 20
RATE_LIMIT_API = 60
RATE_WINDOW = 60


def _get_limit(path: str) -> int:
    if path.endswith("/auth/login"):
        return RATE_LIMIT_LOGIN
    if "/public/" in path:
        return RATE_LIMIT_PUBLIC
    return RATE_LIMIT_API


def check_rate_limit(ip: str, limit: int, window: int = RATE_WINDOW) -> bool:
    now = time.time()
    with _lock:
        _requests[ip] = [t for t in _requests[ip] if now - t < window]
        if len(_requests[ip]) >= limit:
            return False
        _requests[ip].append(now)
    return True


def clear_requests():
    with _lock:
        _requests.clear()
    _save_state()


async def rate_limit_middleware(request: Request, call_next):
    """Rate limit per endpoint type and IP.
    Only trusts X-Forwarded-For from known proxy IPs to prevent spoofing.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = request.client.host if request.client else "unknown"

    # Only parse X-Forwarded-For if request comes from a trusted proxy
    if forwarded and _is_trusted(client_ip):
        client_ip = forwarded.split(",")[0].strip()

    limit = _get_limit(request.url.path)

    if not check_rate_limit(client_ip, limit):
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded ({limit}/{RATE_WINDOW}s)."},
        )

    if len(_requests) % 5 == 0:
        _save_state()

    return await call_next(request)
