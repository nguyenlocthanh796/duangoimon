"""Unit tests for RBAC module — no DB needed."""
import sys
sys.path.insert(0, '.')
from app.core.rbac import require_role


class TestRequireRole:
    def test_import(self):
        """require_role is a dependency factory returning a Dependency."""
        # require_role(endpoint_path="ban-hang") returns a Depends
        dep = require_role(endpoint_path="ban-hang")
        assert dep is not None

    def test_role_hierarchy(self):
        """Admin should have access to all roles."""
        from fastapi import Depends

        # ALLOWED_ROLES defines which roles can access which paths
        from app.core.rbac import ALLOWED_ROLES
        assert "ban-hang" in ALLOWED_ROLES
        assert "quan-ly" in ALLOWED_ROLES
        assert "ke-toan" in ALLOWED_ROLES
        assert "admin" in ALLOWED_ROLES["quan-ly/users"]
        assert "cashier" in ALLOWED_ROLES["ban-hang"]

    def test_dependency_result(self):
        """require_role returns a Depends that wraps the actual dependency."""
        result = require_role(endpoint_path="ban-hang")
        # FastAPI Depends has a .dependency attribute
        assert hasattr(result, "dependency")


class TestResolvePrefix:
    """_resolve_prefix picks the longest matching allowed-role prefix."""

    def test_resolve_longest_prefix(self):
        from app.core.rbac import _resolve_prefix

        # /quan-ly/users must resolve to the more specific 'quan-ly/users'
        assert _resolve_prefix("/quan-ly/users") == "quan-ly/users"

    def test_resolve_base_prefix(self):
        from app.core.rbac import _resolve_prefix

        assert _resolve_prefix("/ban-hang/orders") == "ban-hang"

    def test_resolve_no_match(self):
        from app.core.rbac import _resolve_prefix

        assert _resolve_prefix("/unknown/route") == ""

    def test_resolve_handles_missing_leading_slash(self):
        from app.core.rbac import _resolve_prefix

        assert _resolve_prefix("ke-toan/invoices") == "ke-toan"


class TestRoleChecker:
    """RoleChecker enforces role membership per endpoint path."""

    async def test_allowed_role_passes(self):
        from app.core.rbac import RoleChecker

        checker = RoleChecker(endpoint_path="ban-hang")
        user = {"role": "cashier"}
        result = await checker(current_user=user)
        assert result == user

    async def test_disallowed_role_403(self):
        import pytest
        from fastapi import HTTPException

        from app.core.rbac import RoleChecker

        checker = RoleChecker(endpoint_path="quan-ly/users")
        # cashier cannot access user management (admin only)
        with pytest.raises(HTTPException) as exc:
            await checker(current_user={"role": "cashier"})
        assert exc.value.status_code == 403

    async def test_empty_path_is_noop(self):
        from app.core.rbac import RoleChecker

        checker = RoleChecker(endpoint_path="")
        user = {"role": "kitchen"}
        assert await checker(current_user=user) == user

    async def test_admin_accesses_user_management(self):
        from app.core.rbac import RoleChecker

        checker = RoleChecker(endpoint_path="quan-ly/users")
        user = {"role": "admin"}
        assert await checker(current_user=user) == user
