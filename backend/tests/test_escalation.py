"""Tests for declaration deadline computation & escalation."""
from datetime import date, timedelta

from app.core.thue.escalation import (
    compute_due_date, quarter_end, escalate,
)


def test_quarter_end():
    assert quarter_end(date(2026, 1, 15)) == date(2026, 3, 31)
    assert quarter_end(date(2026, 4, 1)) == date(2026, 6, 30)
    assert quarter_end(date(2026, 10, 1)) == date(2026, 12, 31)


def test_compute_due_quarterly():
    # Q1 2026 ends 31/03; +30d -> 30/04.
    due = compute_due_date("01_CNKD", "quy", date(2026, 2, 1))
    assert due == date(2026, 3, 31) + timedelta(days=30)


def test_compute_due_annual():
    # year-end 31/12 + 90d -> 31/03 next year.
    due = compute_due_date("01_TKN_CNKD", "nam", date(2026, 6, 1))
    assert due == date(2026, 12, 31) + timedelta(days=90)


def test_escalate_flags_within_lead():
    import asyncio
    import os
    os.environ["PYTHONPATH"] = r"e:\posa\backend"
    from sqlalchemy import text
    from app.core.database import engine, AsyncSessionLocal
    from app.models import Base
    from app.models.thue.declaration_deadline import DeclarationDeadline

    async def _run():
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA IF NOT EXISTS thue"))
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionLocal() as db:
            dl = DeclarationDeadline(
                branch_id=None, form="01_CNKD", period_type="quy",
                due_date=date.today() + timedelta(days=3),
            )
            db.add(dl)
            await db.commit()
            await db.refresh(dl)
            summary = await escalate(db, lead_days=7)
            assert summary["reminders_sent"] >= 1
            assert dl.notified is True

    asyncio.run(_run())
