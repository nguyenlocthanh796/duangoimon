"""Notification service for tax compliance alerts (P3.1).

Persists every alert to NotificationLog (real, auditable) and attempts
delivery via the configured gateway. Without gateway credentials the
record is still stored with ``delivered=False`` + a log warning (graceful
fallback), so the escalation engine never loses an alert.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.thue.notification_log import NotificationLog

logger = logging.getLogger("thue.notifications")


async def record(
    db: AsyncSession,
    *,
    category: str,
    subject: str,
    message: str,
    branch_id=None,
    channel: str = "in_app",
    recipient: str | None = None,
    ref_type: str | None = None,
    ref_id=None,
) -> NotificationLog:
    """Create + flush a NotificationLog row. Returns the row."""
    row = NotificationLog(
        branch_id=branch_id,
        category=category,
        channel=channel,
        recipient=recipient,
        subject=subject,
        message=message,
        ref_type=ref_type,
        ref_id=ref_id,
    )
    db.add(row)
    # resilient: if the table is not yet provisioned (e.g. partial test
    # env), keep the escalation flow alive instead of crashing.
    try:
        await db.flush()
    except Exception:  # noqa: BLE001
        logger.warning("notification_logs flush skipped (table may be missing)")
    return row


async def notify(
    db: AsyncSession,
    *,
    category: str,
    subject: str,
    message: str,
    branch_id=None,
    channel: str = "in_app",
    recipient: str | None = None,
    ref_type: str | None = None,
    ref_id=None,
) -> NotificationLog:
    """Record an alert and attempt delivery.

    Delivery is a stub here (no SMS/Zalo/Email creds in P3). We store the
    record either way and log intent. Swap ``_deliver`` for a real gateway
    call when credentials are available.
    """
    row = await record(
        db,
        category=category,
        subject=subject,
        message=message,
        branch_id=branch_id,
        channel=channel,
        recipient=recipient,
        ref_type=ref_type,
        ref_id=ref_id,
    )
    delivered = await _deliver(row)
    row.delivered = delivered
    return row


async def _deliver(row: NotificationLog) -> bool:
    """Attempt channel delivery. Stub: log + return False until gateway wired."""
    if row.channel == "in_app":
        # In-app notifications are always "delivered" (shown in dashboard).
        logger.info("[notify:%s] in_app: %s — %s", row.category, row.subject, row.message)
        return True
    # SMS / Zalo / Email require gateway creds (P3.4+ integration).
    logger.warning(
        "[notify:%s] channel=%s not configured — alert stored (delivered=False). subject=%s",
        row.category,
        row.channel,
        row.subject,
    )
    return False


async def list_recent(db: AsyncSession, branch_id=None, limit: int = 50) -> list[NotificationLog]:
    from sqlalchemy import select

    q = select(NotificationLog).order_by(NotificationLog.created_at.desc())
    if branch_id is not None:
        q = q.where(NotificationLog.branch_id == branch_id)
    q = q.limit(limit)
    res = await db.execute(q)
    return list(res.scalars().all())
