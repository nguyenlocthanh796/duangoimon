from fastapi import APIRouter

from . import (
    audit,
    bi_reports,
    booking,
    branches,
    crm,
    dashboard,
    exec_dashboard,
    export,
    forecast,
    marketing,
    membership,
    menu_eng,
    products,
    promo,
    recipes,
    reports,
    shifts,
    stations,
    supplier_portal,
    suppliers,
    tables,
    users,  # noqa: F401
)

__all__ = [
    "audit", "bi_reports", "booking", "branches", "crm", "dashboard",
    "exec_dashboard", "export", "forecast", "marketing", "membership",
    "menu_eng", "products", "promo", "recipes", "reports", "shifts",
    "stations", "supplier_portal", "suppliers", "tables", "users",
]  # noqa: F401

# Consolidated router — single prefix + dependency in main.py
router = APIRouter()
router.include_router(dashboard.router)
router.include_router(products.router)
router.include_router(tables.router)
router.include_router(reports.router)
router.include_router(recipes.router)
router.include_router(audit.router)
router.include_router(suppliers.router)
router.include_router(shifts.router)
router.include_router(stations.router)
router.include_router(branches.router)
router.include_router(crm.router)
router.include_router(membership.router)
router.include_router(promo.router)
router.include_router(booking.router)
router.include_router(menu_eng.router)
router.include_router(bi_reports.router)
router.include_router(export.router)
router.include_router(exec_dashboard.router)
router.include_router(forecast.router)
router.include_router(marketing.router)
router.include_router(supplier_portal.router)
