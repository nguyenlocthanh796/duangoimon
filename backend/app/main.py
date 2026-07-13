import os
import re
import socket
import sys

# Windows + Python 3.14+: asyncpg needs SelectorEventLoop
# conftest.py sets this at test import time; here we handle server startup
if sys.platform == "win32":
    import asyncio
    import selectors

    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except DeprecationWarning:
        pass

    try:
        loop = asyncio.get_running_loop()
        if isinstance(loop, asyncio.ProactorEventLoop):
            loop.close()
            asyncio.set_event_loop(asyncio.SelectorEventLoop(selectors.SelectSelector()))
    except RuntimeError:
        pass

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.logging_config import setup_logging

setup_logging()

from sqlalchemy import text

from app.api.v1 import auth, ban_hang, ke_toan, quan_ly, thue
from app.core.database import engine
from app.core.rbac import require_branch_access, require_role
from app.core.ws_manager import ws_manager
from app.models.audit import AuditLog  # noqa
from app.models.ban_hang import Order, OrderItem, Product, Table  # noqa
from app.models.ke_toan import Invoice, Transaction  # noqa
from app.models.quan_ly import Inventory, InventoryTransaction, ShiftLog  # noqa
from app.models.recipe import RawMaterial, Recipe, RecipeItem  # noqa
from app.models.user import User  # noqa


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.sentry_config import init_sentry
    init_sentry()
    # Tax scheduler — disable on Windows (ProactorEventLoop not compatible with psycopg async)
    # Will be enabled when running with SelectorEventLoop
    try:
        from app.core.thue.scheduler import start_scheduler
        await start_scheduler()
    except Exception as e:
        import logging as _l
        _l.getLogger("lifespan").warning("Tax scheduler not started: %s", e)
    yield
    await engine.dispose()


# Disable OpenAPI in production (prevent API schema leak to attackers)
# Set POS_ENV=production to hide /docs and /openapi.json
_show_docs = os.getenv("POS_ENV", "development") != "production"

app = FastAPI(
    title="POS F&B API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _show_docs else None,
    redoc_url="/redoc" if _show_docs else None,
    openapi_url="/openapi.json" if _show_docs else None,
)

# Thue (tax) routes — admin + accountant only
app.include_router(
    thue.profile.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue")],
)
app.include_router(
    thue.cash_register_invoice.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.declaration.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.bank.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.report.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.legacy.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue")],
)
app.include_router(
    thue._alias.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue")],
)

# CORS — restrict origins via env, but always allow localhost / 127.0.0.1 / the
# machine's LAN IPs on any dev port (covers Expo web on :8081/:19006, the
# production build on :3000, and access from the LAN URL or a phone).
# Note: backend/.env is not auto-loaded (no python-dotenv), so CORS_ORIGINS must
# be set in the real process env if you need non-localhost origins.
_env_origins = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in _env_origins.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://localhost:8081",
]

# Resolve the machine's LAN IPv4 addresses so Expo's "LAN" URL and phones work.
_lan_ips: set[str] = set()
try:
    _hostname = socket.gethostname()
    for _info in socket.getaddrinfo(_hostname, None):
        _ip = _info[4][0]
        if re.match(r"^\d+\.\d+\.\d+\.\d+$", _ip) and not _ip.startswith("127."):
            _lan_ips.add(_ip)
    # Fallback: ask the default gateway (works if hostname doesn't resolve to LAN IP)
    _s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    _s.connect(("8.8.8.8", 80))
    _lan_ips.add(_s.getsockname()[0])
    _s.close()
except Exception as e:
    import structlog

    structlog.get_logger("cors").warning("Failed to resolve LAN IP for CORS", error=str(e))

_lan_pattern = "|".join(re.escape(ip) for ip in _lan_ips)
# Match http(s)://(localhost|127.0.0.1|<lan-ips>)(:port)?
_cors_regex = (
    r"^https?://(localhost|127\.0\.0\.1"
    + (f"|{_lan_pattern}" if _lan_pattern else "")
    + r")(:\d+)?$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    # Allow localhost + LAN IPs on any port during local/dev use.
    allow_origin_regex=_cors_regex,
)

# Request ID tracing — assign unique ID to each request
app.add_middleware(RequestIDMiddleware)

# Security headers — CSP, XSS, frame protection
app.add_middleware(SecurityHeadersMiddleware)


# Health check
@app.get("/healthz")
@app.get("/readyz")
async def healthz():
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        import logging
        logging.getLogger("healthz").warning("Database health check failed", exc_info=True)
    return {
        "status": "ok",
        "version": "1.0.0",
        "database": "connected" if db_ok else "disconnected",
    }


# Global exception handlers
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _get_cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if origin:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    headers = _get_cors_headers(request)
    if exc.headers:
        headers.update(exc.headers)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=_get_cors_headers(request),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from app.core.i18n import t

    return JSONResponse(
        status_code=500,
        content={"detail": t("common.error")},
        headers=_get_cors_headers(request),
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Not found"},
        headers=_get_cors_headers(request),
    )


# Auto-audit all POST/PUT/DELETE on /api/v1...
from app.core.audit_middleware import audit_mutation_middleware

app.middleware("http")(audit_mutation_middleware)

# CSRF protection — checks Origin/Referer on mutation requests
from app.core.csrf_middleware import csrf_middleware as _csrf_mw

app.middleware("http")(_csrf_mw)

# Rate limiting — 60 req/min per IP
from app.core.rate_limiter import rate_limit_middleware

app.middleware("http")(rate_limit_middleware)


# WebSocket - Kitchen
@app.websocket("/ws/kitchen")
async def kitchen_ws(websocket: WebSocket):
    # Require JWT token as query param ?token=xxx
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return
    try:
        from app.core.auth import decode_token
        decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid auth token")
        return
    await ws_manager.connect(websocket, "kitchen")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "kitchen")


# WebSocket - Inventory alerts
@app.websocket("/ws/inventory")
async def inventory_ws(websocket: WebSocket):
    # Require JWT token as query param ?token=xxx
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return
    try:
        from app.core.auth import decode_token
        decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid auth token")
        return
    await ws_manager.connect(websocket, "inventory")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "inventory")


# Auth routes (public)
app.include_router(auth.router, prefix="/api/v1/auth")

# Public routes (QR self-order — no auth)
from app.api.v1 import public

app.include_router(public.router, prefix="/api/v1")

# Public integrations (no auth — webhook receivers)
from app.api.v1 import integrations

app.include_router(integrations.router, prefix="/api/v1")

# BanHang routes — cashier + admin + manager
app.include_router(
    ban_hang.tables.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang"), require_branch_access()],
)
app.include_router(
    ban_hang.products.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang"), require_branch_access()],
)
app.include_router(
    ban_hang.orders.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang"), require_branch_access()],
)
app.include_router(
    ban_hang.payments.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang"), require_branch_access()],
)

# QuanLy routes — admin + manager only
app.include_router(
    quan_ly.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="quan-ly"), require_branch_access()],
)
app.include_router(
    quan_ly.users.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="quan-ly/users"), require_branch_access()],
)

# KeToan routes — admin + accountant only
app.include_router(
    ke_toan.transactions.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ke-toan"), require_branch_access()],
)
app.include_router(
    ke_toan.invoices.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ke-toan"), require_branch_access()],
)
app.include_router(
    ke_toan.dashboard.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ke-toan"), require_branch_access()],
)
