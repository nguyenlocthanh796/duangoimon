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

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

RETENTION_DAYS = {
    "audit_logs": 365,
    "message_logs": 180,
    "shift_logs": 730,
    # TT152 §7: statutory accounting & tax records kept >= 5 years.
    "accounting_records": 1825,
}

# Tables under the 5-year rule — NEVER hard-deleted.
FIVE_YEAR_TABLES = [
    "ke_toan.so_s1a", "ke_toan.so_s2a", "ke_toan.so_s2b",
    "ke_toan.so_s2c", "ke_toan.so_s2d", "ke_toan.so_s2e",
    "ke_toan.so_s3a", "ke_toan.cash_register_invoices",
    "quan_ly.inventory_transactions", "thue.hkd_profiles",
    "thue.notified_bank_accounts", "thue.declaration_deadlines",
]


async def cleanup_table(db: AsyncSession, model, days: int, date_field: str = "created_at") -> int:
    """Delete records older than `days` from today."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    date_col = getattr(model, date_field, None)
    if date_col is None:
        return 0
    # Guard: never purge 5-year statutory tables.
    full = f"{model.__table_args__.get('schema', 'public')}.{model.__tablename__}"
    if full in FIVE_YEAR_TABLES and days >= 1825:
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
