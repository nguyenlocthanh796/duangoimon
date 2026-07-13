from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.ban_hang import Product

router = APIRouter(prefix="/ban-hang/products", tags=["ban-hang"])


@router.get("")
async def list_products(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(Product).where(Product.is_active == True).order_by(Product.name)
    return await paginate(db, query, page.page, page.page_size)
