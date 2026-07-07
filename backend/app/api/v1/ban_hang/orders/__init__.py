from fastapi import APIRouter

from .crud import router as crud_router
from .business import router as biz_router

router = APIRouter(prefix="/ban-hang/orders", tags=["ban-hang"])
router.include_router(crud_router)
router.include_router(biz_router)
