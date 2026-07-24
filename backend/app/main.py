"""POS F&B API — FastAPI application entry point.

Layout:
  imports (stdlib → 3rd-party → app)
  lifespan (startup / shutdown)
  FastAPI app creation
  middleware stack
  route registration
  WebSocket handlers
  health / readiness probes
  exception handlers
"""

import logging
import os
import re
import socket
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging_config import setup_logging

setup_logging()

from app.core.database import engine
from app.core.rbac import require_branch_access, require_role
from app.core.ws_manager import ws_manager
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.audit_middleware import audit_mutation_middleware
from app.core.csrf_middleware import csrf_middleware
from app.core.rate_limiter import rate_limit_middleware
from app.api.v1 import auth, public, integrations
from app.api.v1 import ban_hang, ke_toan, quan_ly, thue

logger = logging.getLogger(__name__)

# ── Windows / Python 3.14+ selector event loop ────────────────────────────
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


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.sentry_config import init_sentry
    init_sentry()

    # Tax scheduler — fails gracefully on Windows (ProactorEventLoop)
    try:
        from app.core.thue.scheduler import start_scheduler
        await start_scheduler()
    except Exception as e:
        logger.warning("Tax scheduler not started: %s", e)

    yield
    await engine.dispose()


# ── FastAPI app ────────────────────────────────────────────────────────────

_show_docs = os.getenv("POS_ENV", "development") != "production"

app = FastAPI(
    title="POS F&B API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _show_docs else None,
    redoc_url="/redoc" if _show_docs else None,
    openapi_url="/openapi.json" if _show_docs else None,
)


# ── CORS ──────────────────────────────────────────────────────────────────
# Restrict origins via env, but always allow localhost / 127.0.0.1 / the
# machine's LAN IPs on any dev port (covers Expo web on :8081/:19006,
# production build on :3000, and access from the LAN URL or a phone).
# Note: .env is NOT auto-loaded (no python-dotenv), so CORS_ORIGINS must
# be set in the real process env for non-localhost origins.

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
    try:
        import structlog

        structlog.get_logger("cors").warning(
            "Failed to resolve LAN IP for CORS", error=str(e)
        )
    except ImportError:
        pass

_lan_pattern = "|".join(re.escape(ip) for ip in _lan_ips)
_cors_regex = (
    r"^https?://(localhost|127\.0\.0\.1"
    + (f"|{_lan_pattern}" if _lan_pattern else "")
    + r")(:\d+)?$"
    + r"|^https://[a-z0-9-]+\.trycloudflare\.com$"
    + r"|^https://(?:[a-z0-9-]+\.)*pages\.dev$"
    + r"|^https://(?:[a-z0-9-]+\.)*up\.railway\.app$"
    + r"|^https://[a-z0-9-]+\.onrender\.com$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    allow_origin_regex=_cors_regex,
)

# Middleware stack (order matters)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.middleware("http")(audit_mutation_middleware)
app.middleware("http")(csrf_middleware)
app.middleware("http")(rate_limit_middleware)


# ── Route registration ────────────────────────────────────────────────────

# Public endpoints (no auth)
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(public.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")

# Ban-hang (POS) — cashier + admin + manager
_ban_hang_deps = [require_role(endpoint_path="ban-hang"), require_branch_access()]
app.include_router(ban_hang.tables.router, prefix="/api/v1", dependencies=_ban_hang_deps)
app.include_router(ban_hang.products.router, prefix="/api/v1", dependencies=_ban_hang_deps)
app.include_router(ban_hang.orders.router, prefix="/api/v1", dependencies=_ban_hang_deps)
app.include_router(ban_hang.payments.router, prefix="/api/v1", dependencies=_ban_hang_deps)
app.include_router(ban_hang.kitchen.router, prefix="/api/v1", dependencies=_ban_hang_deps)

# Quan-ly (admin / manager)
_quan_ly_deps = [require_role(endpoint_path="quan-ly"), require_branch_access()]
app.include_router(quan_ly.router, prefix="/api/v1", dependencies=_quan_ly_deps)
app.include_router(
    quan_ly.users.router,
    prefix="/api/v1",
    dependencies=[require_role(endpoint_path="quan-ly/users"), require_branch_access()],
)

# Ke-toan (accounting) — admin + accountant
_ke_toan_deps = [require_role(endpoint_path="ke-toan"), require_branch_access()]
app.include_router(ke_toan.transactions.router, prefix="/api/v1", dependencies=_ke_toan_deps)
app.include_router(ke_toan.invoices.router, prefix="/api/v1", dependencies=_ke_toan_deps)
app.include_router(ke_toan.dashboard.router, prefix="/api/v1", dependencies=_ke_toan_deps)

# Thue (tax) — admin + accountant
_thue_deps_mgmt = [require_role(endpoint_path="thue")]
_thue_deps_branch = [require_role(endpoint_path="thue"), require_branch_access()]
app.include_router(thue.profile.router, prefix="/api/v1", dependencies=_thue_deps_mgmt)
app.include_router(thue.legacy.router, prefix="/api/v1", dependencies=_thue_deps_mgmt)
app.include_router(thue._alias.router, prefix="/api/v1", dependencies=_thue_deps_mgmt)
app.include_router(thue.cash_register_invoice.router, prefix="/api/v1", dependencies=_thue_deps_branch)
app.include_router(thue.declaration.router, prefix="/api/v1", dependencies=_thue_deps_branch)
app.include_router(thue.bank.router, prefix="/api/v1", dependencies=_thue_deps_branch)
app.include_router(thue.report.router, prefix="/api/v1", dependencies=_thue_deps_branch)


# ── WebSocket endpoints ──────────────────────────────────────────────────

from app.core.auth import decode_token


async def _ws_auth(websocket: WebSocket) -> bool:
    """Validate JWT token from WebSocket query param."""
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return False
    try:
        decode_token(token)
        return True
    except Exception:
        await websocket.close(code=4001, reason="Invalid auth token")
        return False


@app.websocket("/ws/kitchen")
async def kitchen_ws(websocket: WebSocket):
    if not await _ws_auth(websocket):
        return
    await ws_manager.connect(websocket, "kitchen")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "kitchen")


@app.websocket("/ws/inventory")
async def inventory_ws(websocket: WebSocket):
    if not await _ws_auth(websocket):
        return
    await ws_manager.connect(websocket, "inventory")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "inventory")


@app.websocket("/ws/pos")
@app.websocket("/ws")
async def pos_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    if token:
        try:
            decode_token(token)
        except Exception:
            pass
    await ws_manager.connect(websocket, "pos")
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping" or '"type":"ping"' in data:
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "pos")


# ── Health / readiness ────────────────────────────────────────────────────

from sqlalchemy import text


@app.get("/healthz")
@app.get("/readyz")
async def healthz():
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.warning("Database health check failed", exc_info=True)
    return {
        "status": "ok",
        "version": "1.0.0",
        "database": "connected" if db_ok else "disconnected",
    }


# ── Exception handlers ────────────────────────────────────────────────────


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
# trigger reload
