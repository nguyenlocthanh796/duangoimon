"""Role-based access control + branch scoping dependency injection."""
import re
from fastapi import Depends, HTTPException, Request, status

from app.core.auth import get_current_user

ALLOWED_ROLES = {
    "ban-hang": {"admin", "manager", "cashier"},
    "ban-hang/kitchen": {"admin", "manager", "cashier", "kitchen"},
    "quan-ly": {"admin", "manager"},
    "quan-ly/users": {"admin"},
    "ke-toan": {"admin", "accountant"},
    "thue": {"admin", "accountant"},
}

_UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)


def _resolve_prefix(path: str) -> str:
    normalized_path = path if path.startswith("/") else "/" + path
    for prefix in sorted(ALLOWED_ROLES, key=len, reverse=True):
        if normalized_path.startswith("/" + prefix):
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


def require_branch_access():
    """Dependency: scope a thue route to the caller's branch.

    Admins and managers see all branches. Accountants are limited to the
    branch encoded in their JWT (``branch_id``). The branch is inferred from
    the request path (the ``/thue/.../{branch_id}/...`` segment). If no
    branch segment is present, the dependency is a no-op (route is not
    branch-scoped). If a scoped accountant requests a different branch, 403.
    """

    async def _dep(
        request: Request,
        current_user: dict = Depends(get_current_user),
    ):
        role = (current_user.get("role") or "").lower()
        if role in ("admin", "manager"):
            return current_user
        scoped = current_user.get("branch_id")
        if not scoped:
            return current_user
        # Find a UUID path segment; the first one is treated as branch.
        segments = [s for s in request.url.path.split("/") if _UUID_RE.fullmatch(s)]
        if not segments:
            return current_user
        branch_id = segments[0]
        if str(scoped) != str(branch_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ được truy cập chi nhánh được gán.",
            )
        return current_user

    return Depends(_dep)
