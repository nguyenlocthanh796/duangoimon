"""Quan-ly Users API router."""

from app.core.uuid_utils import parse_uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, hash_password
from app.core.database import get_db
from app.core.pagination import PageParams, paginate
from app.models.user import User

router = APIRouter(prefix="/quan-ly/users", tags=["quan-ly"])


class UserCreate(BaseModel):
    username: str = Field(..., max_length=50, pattern="^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=100, description="Tối thiểu 8 ký tự")
    full_name: str | None = Field(None, max_length=200)
    role: str = Field(default="cashier", max_length=50)
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Mật khẩu phải có ít nhất 1 chữ hoa")
        if not any(c.isdigit() for c in v):
            raise ValueError("Mật khẩu phải có ít nhất 1 chữ số")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, description="Tối thiểu 8 ký tự")

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v: str) -> str | None:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("Mật khẩu phải có ít nhất 1 chữ hoa")
        if not any(c.isdigit() for c in v):
            raise ValueError("Mật khẩu phải có ít nhất 1 chữ số")
        return v


@router.get("")
async def list_users(
    page: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(User).order_by(User.full_name)
    page_result = await paginate(db, query, page.page, page.page_size)
    page_result["items"] = [
        {
            "id": str(u.id),
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in page_result["items"]
    ]
    return page_result


@router.post("", status_code=201)
async def create_user(
    body: UserCreate, db: AsyncSession = Depends(get_db), _user: dict = Depends(get_current_user)
):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        is_active=body.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "username": user.username}


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)
    result = await db.execute(select(User).where(User.id == parse_uuid(user_id)))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(u, k, v)
    await db.commit()
    return {"status": "ok"}
