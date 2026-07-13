"""Forecast API endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.forecast import predict_demand

router = APIRouter(prefix="/quan-ly/forecast", tags=["quan-ly"])


@router.get("/demand")
async def demand_forecast(
    days_ahead: int = Query(7, ge=1, le=30),
    lookback_days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await predict_demand(db, days_ahead, lookback_days)
