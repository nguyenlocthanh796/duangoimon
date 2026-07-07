import os
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

from app.api.v1 import auth, ban_hang, quan_ly, ke_toan
from app.core.database import engine
from app.core.ws_manager import ws_manager
from app.core.rbac import require_role


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init extensions
    from app.core.sentry_config import init_sentry
    init_sentry()
    yield
    await engine.dispose()


app = FastAPI(title="POS F&B API", version="1.0.0", lifespan=lifespan)

# CORS — restrict origins via env
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/healthz")
@app.get("/readyz")
async def healthz():
    return {"status": "ok", "version": "1.0.0"}


# Global exception handler
from fastapi import Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from app.core.i18n import t
    return JSONResponse(
        status_code=500,
        content={"detail": t("common.error"), "type": type(exc).__name__},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


# Auto-audit all POST/PUT/DELETE on /api/v1/...
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
