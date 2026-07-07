"""Data retention policy — auto-cleanup old records.

Configuration:
    RETENTION_DAYS = {
        "audit_logs": 365,       # 1 year
        "message_logs": 180,     # 6 months
        "shift_logs": 730,       # 2 years
    }

Schedule via cron/Scheduler:
    python -c "from app.core.retention import run_cleanup; import asyncio; asyncio.run(run_cleanup())"
"""
from datetime import datetime, timezone, timedelta

from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

RETENTION_DAYS = {
    "audit_logs": 365,
    "message_logs": 180,
    "shift_logs": 730,
}


async def cleanup_table(db: AsyncSession, model, days: int, date_field: str = "created_at") -> int:
    """Delete records older than `days` from today."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    date_col = getattr(model, date_field, None)
    if date_col is None:
        return 0
    stmt = delete(model).where(date_col < cutoff)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount


async def run_cleanup(db: AsyncSession) -> dict[str, int]:
    """Run all retention policies. Returns dict of table -> rows deleted."""
    from app.models.audit import AuditLog
    from app.models.marketing import MessageLog
    from app.models.quan_ly import ShiftLog

    results = {}
    results["audit_logs"] = await cleanup_table(db, AuditLog, 365)
    results["message_logs"] = await cleanup_table(db, MessageLog, 180)
    results["shift_logs"] = await cleanup_table(db, ShiftLog, 730, date_field="start_at")
    return results
