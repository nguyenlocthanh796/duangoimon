from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer()

# ── JWT Blacklist (in-memory, replace with Redis for multi-worker) ────────
import time

BLACKLISTED_TOKENS: set[str] = set()
BLACKLISTED_EXP: set[int] = set()  # Track exp times of blacklisted tokens


def blacklist_token(token: str) -> None:
    """Add token to blacklist so it's rejected even before expiry."""
    try:
        decoded = jwt.decode(
            token, settings.secret_key, algorithms=["HS256"],
            options={"verify_exp": False}
        )
        exp = decoded.get("exp", 0)
        BLACKLISTED_EXP.add(exp)
    except Exception:
        pass


def is_token_blacklisted(exp: int) -> bool:
    """Check if a token with this exp time has been blacklisted."""
    # Clean expired entries periodically
    now = int(time.time())
    expired = {e for e in BLACKLISTED_EXP if e < now}
    BLACKLISTED_EXP.difference_update(expired)
    return exp in BLACKLISTED_EXP


_cleanup_counter = 0


def _periodic_cleanup():
    """Clean up expired blacklist entries every 100 calls."""
    global _cleanup_counter
    _cleanup_counter += 1
    if _cleanup_counter >= 100:
        now = int(time.time())
        expired = {e for e in BLACKLISTED_EXP if e < now}
        BLACKLISTED_EXP.difference_update(expired)
        _cleanup_counter = 0


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_token(user_id: str, role: str = "", branch_id: str = "") -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "branch_id": branch_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),  # Reduced from 8h to 1h
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        decoded = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        # Check blacklist
        exp = decoded.get("exp", 0)
        if is_token_blacklisted(exp):
            raise HTTPException(status_code=401, detail="Token has been revoked")
        _periodic_cleanup()
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    return decode_token(cred.credentials)


def require_role(*allowed_roles: str, endpoint_path: str = ""):
    """Dependency factory: only allow specified roles.

    endpoint_path is a descriptive label (e.g. 'quan-ly', 'ban-hang') used
    for logging/audit. allowed_roles are the actual roles permitted.
    If allowed_roles is empty, defaults based on endpoint_path:
      - "ban-hang": cashier, admin, manager
      - "quan-ly": admin, manager
      - "quan-ly/users": admin
      - "ke-toan": admin, accountant
      - "thue": admin, accountant, manager
    """

    _ROLE_MAP = {
        "ban-hang": ("admin", "manager", "cashier"),
        "quan-ly": ("admin", "manager"),
        "quan-ly/users": ("admin",),
        "ke-toan": ("admin", "accountant"),
        "thue": ("admin", "accountant", "manager"),
    }

    roles = allowed_roles or _ROLE_MAP.get(endpoint_path, ("admin",))

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role')}' không có quyền truy cập",
            )
        return user

    return _checker


def require_branch(branch_id: str | None = None):
    """Dependency factory: block cross-branch access.
    If user has a fixed branch_id and it differs from the request branch_id -> 403.
    Admin (empty branch_id) can access all branches.
    """

    async def _checker(user: dict = Depends(get_current_user)) -> dict:
        user_branch = user.get("branch_id")
        if user_branch and branch_id and user_branch != branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền truy cập chi nhánh này",
            )
        return user

    return _checker


async def ensure_branch_access(
    branch_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Dependency for routes with {branch_id} path param.
    Injects branch_id from path and checks against user's branch.
    Admin (empty branch_id) can access all branches.
    Usage: _user: dict = Depends(ensure_branch_access)
    """
    user_branch = user.get("branch_id")
    if user_branch and branch_id and user_branch != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập chi nhánh này",
        )
    return user
