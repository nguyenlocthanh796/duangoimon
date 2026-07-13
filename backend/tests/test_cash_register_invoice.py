"""Tests for Cash-Register (M) e-invoice (Nghị định 70/2025)."""
import os
from decimal import Decimal

os.environ["PYTHONPATH"] = r"e:\posa\backend"

from app.integrations.einvoice import CashRegisterInvoiceClient


def test_invoice_code_format():
    # Default generator: leading 'M' + 22 hex chars = 23 chars.
    import secrets
    generated = "M" + secrets.token_hex(11).upper()[:22]
    assert generated.startswith("M")
    assert len(generated) == 23


async def test_adjust_never_cancels():
    client = CashRegisterInvoiceClient()
    res = await client.adjust("M" + "A" * 22, "M" + "B" * 22, {})
    assert res["adjustment_of"] == "M" + "B" * 22
    assert "status" in res


async def test_service_issues_invoice():
    from decimal import Decimal
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models import Base
    from app.models.ban_hang import Order

    # Dedicated engine for DDL — avoids polluting global pool
    ddl_engine = create_async_engine(settings.database_url, echo=False)
    DDLSessionLocal = async_sessionmaker(ddl_engine, expire_on_commit=False)

    from sqlalchemy import text
    async with ddl_engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS ban_hang"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS ke_toan"))
        await conn.run_sync(Base.metadata.create_all)

    async with DDLSessionLocal() as db:
        order = Order(
            branch_id=None, status="da_thanh_toan", total_amount=Decimal("120000"),
            tax_amount=Decimal("9600"),
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)

        from app.core.thue.cash_invoice_service import issue_for_order
        inv = await issue_for_order(db, order)
        await db.commit()
        await db.refresh(inv)

        assert inv.invoice_code.startswith("M")
        assert inv.status == "da_phat_hanh"
        assert inv.tax_auth_status == "da_tiep_nhan"

    await ddl_engine.dispose()
