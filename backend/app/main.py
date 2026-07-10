import os
import re
import socket
import sys

# Windows + Python 3.14+: psycopg async needs SelectorEventLoop, not ProactorEventLoop
if sys.platform == "win32":
    import asyncio

    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models.ban_hang import Table, Product, Order, OrderItem  # noqa
from app.models.ke_toan import Transaction, Invoice  # noqa
from app.models.quan_ly import Inventory, InventoryTransaction, ShiftLog  # noqa
from app.models.user import User  # noqa
from app.models.recipe import RawMaterial, Recipe, RecipeItem  # noqa
from app.models.audit import AuditLog  # noqa

from app.core.rbac import require_role, require_branch_access
from app.api.v1 import auth, ban_hang, quan_ly, ke_toan
from app.api.v1 import thue
from app.core.database import engine
from app.core.ws_manager import ws_manager



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init extensions
    from app.core.sentry_config import init_sentry
    init_sentry()
    # Tax scheduler (threshold scans, later EOM + escalation)
    from app.core.thue.scheduler import start_scheduler
    await start_scheduler()
    yield
    await engine.dispose()


app = FastAPI(title="POS F&B API", version="1.0.0", lifespan=lifespan)

# Thue (tax) routes — admin + accountant only
app.include_router(
    thue.profile.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue")],
)
app.include_router(
    thue.cash_register_invoice.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.declaration.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.bank.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.report.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue"), require_branch_access()],
)
app.include_router(
    thue.legacy.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="thue")],
)
app.include_router(
    thue._alias.router, prefix="/api/v1",
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
except Exception:
    pass

_lan_pattern = "|".join(re.escape(ip) for ip in _lan_ips)
# Match http(s)://(localhost|127.0.0.1|<lan-ips>)(:port)?
_cors_regex = r"^https?://(localhost|127\.0\.0\.1" + (f"|{_lan_pattern}" if _lan_pattern else "") + r")(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Allow localhost + LAN IPs on any port during local/dev use.
    allow_origin_regex=_cors_regex,
)

# Health check
@app.get("/healthz")
@app.get("/readyz")
async def healthz():
    return {"status": "ok", "version": "1.0.0"}


# Global exception handlers
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
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
        content={"detail": t("common.error"), "type": type(exc).__name__, "message": str(exc)},
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

# Rate limiting — 60 req/min per IP
from app.core.rate_limiter import rate_limit_middleware
app.middleware("http")(rate_limit_middleware)

# WebSocket - Kitchen
@app.websocket("/ws/kitchen")
async def kitchen_ws(websocket: WebSocket):
    await ws_manager.connect(websocket, "kitchen")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "kitchen")

# WebSocket - Inventory alerts
@app.websocket("/ws/inventory")
async def inventory_ws(websocket: WebSocket):
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
    ban_hang.tables.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang")],
)
app.include_router(
    ban_hang.products.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang")],
)
app.include_router(
    ban_hang.orders.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang")],
)
app.include_router(
    ban_hang.payments.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ban-hang")],
)

# QuanLy routes — admin + manager only
app.include_router(
    quan_ly.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="quan-ly")],
)
app.include_router(
    quan_ly.users.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="quan-ly/users")],
)

# KeToan routes — admin + accountant only
app.include_router(
    ke_toan.transactions.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ke-toan")],
)
app.include_router(
    ke_toan.invoices.router, prefix="/api/v1",
    dependencies=[require_role(endpoint_path="ke-toan")],
)
