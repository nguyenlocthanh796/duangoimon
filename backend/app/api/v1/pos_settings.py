"""API router for managing POS settings in database."""

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ban_hang import POSSettingsModel

router = APIRouter(prefix="/pos/settings", tags=["pos-settings"])


class POSSettingsPayload(BaseModel):
    settings: Dict[str, Any]


@router.get("")
async def get_pos_settings(db: AsyncSession = Depends(get_db)):
    """Fetch saved POS store settings from database."""
    result = await db.execute(
        select(POSSettingsModel).where(POSSettingsModel.id == "default_store")
    )
    record = result.scalar_one_or_none()
    if not record:
        return {"settings": None}
    return {"settings": record.settings_data}


@router.put("")
async def save_pos_settings(
    payload: POSSettingsPayload,
    db: AsyncSession = Depends(get_db),
):
    """Save or update POS store settings in database."""
    result = await db.execute(
        select(POSSettingsModel).where(POSSettingsModel.id == "default_store")
    )
    record = result.scalar_one_or_none()

    if not record:
        record = POSSettingsModel(
            id="default_store",
            settings_data=payload.settings,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(record)
    else:
        record.settings_data = payload.settings
        record.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(record)
    return {"status": "ok", "settings": record.settings_data}
