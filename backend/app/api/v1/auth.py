from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import verify_password, create_token, get_current_user
from app.models.user import User

router = APIRouter(tags=["auth"])

# Login rate limit — per IP, 5 attempts per minute
import time
_login_attempts: dict[str, list[float]] = {}
LOGIN_LIMIT = 5
LOGIN_WINDOW = 60


def _check_login_rate(request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = _login_attempts.setdefault(ip, [])
    _login_attempts[ip] = [t for t in attempts if now - t < LOGIN_WINDOW]
    if len(_login_attempts[ip]) >= LOGIN_LIMIT:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    _login_attempts[ip].append(now)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_login_rate(request)
    result = await db.execute(
        select(User).where(User.username == body.username).where(User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user.id), role=user.role, branch_id=str(user.branch_id) if user.branch_id else "")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "role": user.role,
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "full_name": user.full_name
        },
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["sub"]}
