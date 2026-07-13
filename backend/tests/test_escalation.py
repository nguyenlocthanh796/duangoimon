"""Tests for declaration deadline computation & escalation."""
from datetime import date, timedelta
import pytest

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


def test_quarter_end_q3():
    # Q3 (Jul-Sep) ends 30/09
    assert quarter_end(date(2026, 8, 20)) == date(2026, 9, 30)


def test_compute_due_monthly():
    # Monthly declaration: period_end + 20 days (default for unknown form)
    due = compute_due_date("MONTHLY_FORM", "thang", date(2026, 5, 31))
    assert due == date(2026, 5, 31) + timedelta(days=20)


def test_due_reminder_level():
    from app.core.thue.escalation import _due_reminder_level

    # Ladder is [14, 7, 3, 1]; returns the TIGHTEST (smallest) window that
    # still contains days_left, so reminders escalate 14 -> 7 -> 3 -> 1.
    assert _due_reminder_level(20) is None  # beyond the ladder
    assert _due_reminder_level(14) == 14
    assert _due_reminder_level(10) == 14   # only the 14-day window contains 10
    assert _due_reminder_level(7) == 7
    assert _due_reminder_level(5) == 7     # 5 falls inside the 7-day window
    assert _due_reminder_level(3) == 3
    assert _due_reminder_level(1) == 1
    assert _due_reminder_level(0) == 1     # due today fires the 1-day level


def test_escalation_constants():
    from app.core.thue.escalation import DEADLINE_RULES, ESCALATION_LADDER

    assert DEADLINE_RULES["01_CNKD"] == 30
    assert DEADLINE_RULES["01_TKN_CNKD"] == 90
    # Ladder must be descending
    assert ESCALATION_LADDER == [14, 7, 3, 1]


async def test_escalate_flags_within_lead():
    import os
    os.environ["PYTHONPATH"] = r"e:\posa\backend"
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models import Base
    from app.models.thue.declaration_deadline import DeclarationDeadline

    # Create a dedicated engine for DDL to avoid polluting global pool
    ddl_engine = create_async_engine(settings.database_url, echo=False)
    DDLSessionLocal = async_sessionmaker(ddl_engine, expire_on_commit=False)

    from sqlalchemy import text
    async with ddl_engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS thue"))
        await conn.run_sync(Base.metadata.create_all)

    async with DDLSessionLocal() as db:
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

    await ddl_engine.dispose()
