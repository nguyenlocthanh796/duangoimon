from fastapi import APIRouter

from .business import router as biz_router
from .crud import router as crud_router

router = APIRouter(prefix="/ban-hang/orders", tags=["ban-hang"])
router.include_router(crud_router)
router.include_router(biz_router)
