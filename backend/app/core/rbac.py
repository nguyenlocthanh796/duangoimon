"""Role-based access control dependency injection."""
from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user

ALLOWED_ROLES = {
    "ban-hang": {"admin", "manager", "cashier"},
    "ban-hang/kitchen": {"admin", "manager", "cashier", "kitchen"},
    "quan-ly": {"admin", "manager"},
    "quan-ly/users": {"admin"},
    "ke-toan": {"admin", "accountant"},
}


def _resolve_prefix(path: str) -> str:
    for prefix in sorted(ALLOWED_ROLES, key=len, reverse=True):
        if path.startswith("/" + prefix):
            return prefix
    return ""


class RoleChecker:
    """FastAPI dependency — raises 403 if user role not in allowed set."""

    def __init__(self, endpoint_path: str = ""):
        self.endpoint_path = endpoint_path

    async def __call__(self, current_user: dict = Depends(get_current_user)):
        path = self.endpoint_path or ""
        if not path:
            return current_user
        prefix = _resolve_prefix(path)
        allowed = ALLOWED_ROLES.get(prefix, {"admin"})
        user_role = (current_user.get("role") or "").lower()
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' not allowed. Required one of: {sorted(allowed)}",
            )
        return current_user


# ---- Convenience factory ----
def require_role(*, endpoint_path: str = ""):
    return Depends(RoleChecker(endpoint_path=endpoint_path))
