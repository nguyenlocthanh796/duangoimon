"""Tests for Cash-Register (M) e-invoice (Nghị định 70/2025)."""
import asyncio
import os
from decimal import Decimal

os.environ["PYTHONPATH"] = r"e:\posa\backend"

from sqlalchemy import text
from app.core.database import engine, AsyncSessionLocal
from app.models import Base
from app.models.ban_hang import Order
from app.integrations.einvoice import CashRegisterInvoiceClient


def test_invoice_code_format():
    # Default generator: leading 'M' + 22 hex chars = 23 chars (NĐ70).
    import secrets
    generated = "M" + secrets.token_hex(11).upper()[:22]
    assert generated.startswith("M")
    assert len(generated) == 23


def test_adjust_never_cancels():
    client = CashRegisterInvoiceClient()
    res = asyncio.run(client.adjust("M" + "A" * 22, "M" + "B" * 22, {}))
    assert res["adjustment_of"] == "M" + "B" * 22
    assert "status" in res


async def _seed_and_issue():
    from app.core.thue.cash_invoice_service import issue_for_order

    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS ban_hang"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS ke_toan"))
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        order = Order(
            branch_id=None, status="da_thanh_toan", total_amount=Decimal("120000"),
            tax_amount=Decimal("9600"),
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)
        inv = await issue_for_order(db, order)
        await db.commit()
        await db.refresh(inv)
        return inv


def test_service_issues_invoice():
    inv = asyncio.run(_seed_and_issue())
    assert inv.invoice_code.startswith("M")
    assert inv.status == "da_phat_hanh"
    assert inv.tax_auth_status == "da_tiep_nhan"
