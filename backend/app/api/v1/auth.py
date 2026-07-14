from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    blacklist_token, create_token, get_current_user, verify_password,
)
from app.core.database import get_db
from app.models.user import User

router = APIRouter(tags=["auth"])
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.username == body.username).where(User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(
        str(user.id), role=user.role, branch_id=str(user.branch_id) if user.branch_id else ""
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "role": user.role,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "full_name": user.full_name,
        },
    }


@router.post("/logout")
async def logout(
    cred: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user),
):
    """Logout user by blacklisting current JWT token."""
    token = cred.credentials if cred else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    blacklist_token(token)
    return {"detail": "Logged out successfully"}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["sub"]}
