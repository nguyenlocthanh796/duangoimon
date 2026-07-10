"""Alias router so the ke-toan frontend paths /thue/deadlines/* resolve.

The canonical declaration router lives under /thue/declarations. The
frontend (lib/api/thue.ts) calls /thue/deadlines/{branch_id} and a future
/thue/deadlines/{id}/submit. These simply re-dispatch to the canonical
handlers in app.api.v1.thue.declaration.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.api.v1.thue import declaration

router = APIRouter(prefix="/thue/deadlines", tags=["thue"])


class SubmitBody(BaseModel):
    note: str | None = None
    ids: list[str] | None = None


@router.get("/{branch_id}")
async def list_deadlines_alias(
    branch_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await declaration.list_deadlines(branch_id=branch_id, db=db, _user=_user)


@router.post("/bulk-submit")
async def bulk_submit_deadlines_alias(
    body: SubmitBody,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    ids = body.ids or []
    if not ids:
        return {"submitted": 0, "status": "ok"}
    submitted = 0
    for dl_id in ids:
        try:
            res = await declaration.submit(deadline_id=dl_id, body=declaration.SubmitBody(note=body.note), db=db, _user=_user)
            if res.get("submitted"):
                submitted += 1
        except Exception:
            continue
    return {"submitted": submitted, "status": "ok"}


@router.post("/{deadline_id}/submit")
async def submit_deadline_alias(
    deadline_id: str,
    body: SubmitBody,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return await declaration.submit(deadline_id=deadline_id, body=body, db=db, _user=_user)
