"""Multi-branch CRUD API."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.pagination import PageParams, paginate
from app.models.branch import Branch

router = APIRouter(prefix="/quan-ly/branches", tags=["quan-ly"])


class BranchCreate(BaseModel):
    name: str
    code: str
    address: str | None = None
    phone: str | None = None


class BranchUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    is_active: bool | None = None


def _branch_dict(b: Branch) -> dict:
    return {
        "id": str(b.id),
        "name": b.name,
        "code": b.code,
        "address": b.address,
        "phone": b.phone,
        "is_active": b.is_active,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("")
async def list_branches(
        page: PageParams = Depends(),
        db: AsyncSession = Depends(get_db),
        _user: dict = Depends(get_current_user),
    ):
    query = select(Branch).order_by(Branch.name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [_branch_dict(b) for b in page_result["items"]]
    return page_result


@router.post("", status_code=201)
async def create_branch(body: BranchCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    branch = Branch(name=body.name, code=body.code, address=body.address, phone=body.phone)
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return _branch_dict(branch)


@router.put("/{branch_id}")
async def update_branch(branch_id: str, body: BranchUpdate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Branch).where(Branch.id == uuid.UUID(branch_id)))
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    if body.name is not None: branch.name = body.name
    if body.address is not None: branch.address = body.address
    if body.phone is not None: branch.phone = body.phone
    if body.is_active is not None: branch.is_active = body.is_active
    await db.commit()
    await db.refresh(branch)
    return _branch_dict(branch)


@router.delete("/{branch_id}")
async def delete_branch(branch_id: str, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)):
    result = await db.execute(select(Branch).where(Branch.id == uuid.UUID(branch_id)))
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    await db.delete(branch)
    await db.commit()
    return {"status": "deleted"}
