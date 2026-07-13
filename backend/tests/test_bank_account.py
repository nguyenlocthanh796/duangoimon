"""Tests for notified bank account (TT18/2026 — Mẫu 01/BK-STK)."""
import os
import pytest

os.environ["PYTHONPATH"] = r"e:\posa\backend"

from sqlalchemy import text

from app.models import Base
from app.models.thue.hkd_profile import HKDProfile
from app.models.thue.bank_account import NotifiedBankAccount

pytestmark = pytest.mark.anyio


async def test_bank_account_notify():
    import os
    os.environ["PYTHONPATH"] = r"e:\posa\backend"
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models import Base
    from app.models.thue.hkd_profile import HKDProfile
    from app.models.thue.bank_account import NotifiedBankAccount

    # Dedicated engine for DDL — avoids polluting global connection pool
    ddl_engine = create_async_engine(settings.database_url, echo=False)
    DDLSessionLocal = async_sessionmaker(ddl_engine, expire_on_commit=False)

    from sqlalchemy import text
    async with ddl_engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS thue"))
        await conn.run_sync(Base.metadata.create_all)

    async with DDLSessionLocal() as db:
        prof = HKDProfile(
            tax_code="8000000001",
            legal_name="HKD Test",
            tax_method="khoan",
            registration_status="da_dang_ky",
        )
        db.add(prof)
        await db.commit()
        await db.refresh(prof)

        ba = NotifiedBankAccount(
            branch_id=prof.branch_id,
            tax_code="8000000001",
            bank_name="VietcomBank",
            account_number="123456789",
        )
        db.add(ba)
        await db.commit()
        await db.refresh(ba)
        assert ba.form_status == "chua_thong_bao"

        # Simulate notify endpoint flagging the 01/BK-STK.
        from datetime import datetime, timezone
        ba.form_status = "da_thong_bao"
        ba.notified_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(ba)
        assert ba.form_status == "da_thong_bao"

    await ddl_engine.dispose()
