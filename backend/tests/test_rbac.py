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
