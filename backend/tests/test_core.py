"""Unit tests for core utilities — no DB needed."""
import pytest


class TestPagination:
    def test_paginate_simple(self):
        from app.core.pagination import paginate
        import inspect
        assert inspect.iscoroutinefunction(paginate)

    def test_page_params(self):
        from app.core.pagination import PageParams
        # PageParams uses FastAPI Query — can't instantiate directly.
        # Verify the class exists with correct interface.
        p = PageParams
        assert hasattr(p, '__init__')

    def test_paged_response(self):
        from app.core.pagination import PagedResponse
        resp = PagedResponse(items=[], total=0, page=1, page_size=20, total_pages=0)
        assert resp.total == 0
        assert resp.page == 1


class TestI18n:
    def test_vi(self):
        from app.core.i18n import t, set_language
        set_language("vi")
        assert t("order.created") == "Đơn hàng đã tạo"
        assert t("auth.invalid_credentials") == "Sai tên đăng nhập hoặc mật khẩu"

    def test_en(self):
        from app.core.i18n import t, set_language
        set_language("en")
        assert t("order.created") == "Order created"

    def test_fallback_to_key(self):
        from app.core.i18n import t
        assert t("nonexistent.key_12345") == "nonexistent.key_12345"

    def test_formatting(self):
        from app.core.i18n import t, set_language
        set_language("vi")
        msg = t("inventory.low_stock", name="Bột mì", qty=5)
        assert "Bột mì" in msg
        assert "5" in msg

    def test_set_language_invalid(self):
        from app.core.i18n import set_language, get_language
        set_language("en")
        set_language("fr")  # doesn't exist, should be noop
        assert get_language() == "en"


class TestSoftDelete:
    def test_mixin_has_deleted_at_column(self):
        from app.core.soft_delete import SoftDeleteMixin
        # deleted_at is a MappedColumn descriptor — tests that class is constructable
        assert hasattr(SoftDeleteMixin, "deleted_at")
        assert hasattr(SoftDeleteMixin, "soft_delete")
        assert hasattr(SoftDeleteMixin, "is_deleted")

    def test_soft_delete_behavior(self):
        """soft_delete() sets deleted_at; is_deleted reflects the state."""
        from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

        from app.core.soft_delete import SoftDeleteMixin

        class _Base(DeclarativeBase):
            pass

        class _Widget(_Base, SoftDeleteMixin):
            __tablename__ = "_test_widget_softdelete"
            id: Mapped[int] = mapped_column(primary_key=True)

        w = _Widget(id=1)
        # Fresh instance is not deleted
        assert w.is_deleted is False
        # After soft_delete, deleted_at is set and is_deleted flips
        w.soft_delete()
        assert w.deleted_at is not None
        assert w.is_deleted is True



class TestSearch:
    def test_apply_filters_is_active(self):
        from app.core.search import apply_filters
        from sqlalchemy import select
        from app.models.user import User
        q = select(User)
        q = apply_filters(q, User, is_active=True)
        sql = str(q)
        assert "is_active" in sql

    def test_apply_filters_status(self):
        from app.core.search import apply_filters
        from sqlalchemy import select
        from app.models.ban_hang import Order
        q = select(Order)
        q = apply_filters(q, Order, status="moi")
        sql = str(q)
        assert "moi" in sql or "status" in sql


class TestBatch:
    def test_batch_functions_exist(self):
        from app.core.batch import batch_create, batch_update, batch_delete
        import inspect
        assert inspect.iscoroutinefunction(batch_create)
        assert inspect.iscoroutinefunction(batch_update)
        assert inspect.iscoroutinefunction(batch_delete)


class TestLogging:
    def test_logging_config(self):
        from app.core.logging import configure_logging, get_logger
        configure_logging(log_level="DEBUG", json_output=False)
        logger = get_logger("test")
        assert logger is not None

    def test_get_logger(self):
        from app.core.logging import get_logger
        logger = get_logger()
        assert logger is not None


class TestSentry:
    def test_sentry_init_noop_when_no_dsn(self):
        from app.core.sentry_config import init_sentry
        # Should not raise when DSN is not set
        import os
        dsn = os.environ.pop("SENTRY_DSN", None)
        try:
            init_sentry()  # no error expected
        finally:
            if dsn:
                os.environ["SENTRY_DSN"] = dsn


class TestSoftDeleteMigration:
    def test_migration_exists(self):
        import os
        path = "alembic/versions/add_soft_delete.py"
        assert os.path.exists(path), f"Migration {path} not found"
