"""Scheduler for tax jobs (P3.2).

Replaces the bare asyncio 60s loop with cron-like scheduling semantics
(computed next-run from cron fields) without requiring an external
dependency. Three jobs:

  - run_threshold_scan()        : every 60s (near-real-time; cheap + idempotent)
  - run_daily()                 : daily at 02:00 — threshold scan + deadline escalation
  - run_eom_close()             : on the last calendar day of the month (after close) —
                                   weighted-average inventory cost close + ledger lock

Started from the app lifespan. The 60s tick keeps the near-real-time
threshold scan responsive; the cron jobs add deterministic daily/EOM runs.
"""
import asyncio
import logging
from datetime import datetime, timedelta

from app.core.database import AsyncSessionLocal
from app.core.thue.threshold import scan_all as scan_thresholds

logger = logging.getLogger("thue.scheduler")

TICK_SECONDS = 60


def _next_run(hour: int, minute: int) -> float:
    """Seconds until the next occurrence of (hour:minute)."""
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def _is_last_day_of_month(d: datetime | None = None) -> bool:
    d = d or datetime.now()
    tomorrow = d + timedelta(days=1)
    return tomorrow.month != d.month


async def run_threshold_scan() -> None:
    async with AsyncSessionLocal() as db:
        summary = await scan_thresholds(db)
    logger.info("threshold scan: %s", summary)


async def run_eom_weighted_average() -> None:
    """Month-end inventory cost close + ledger lock (TT152 §3)."""
    from sqlalchemy import select

    from app.core.thue.weighted_average import close_period, current_period
    from app.core.thue.data_lock import lock_period
    from app.models.branch import Branch

    period = current_period()
    async with AsyncSessionLocal() as db:
        branches = (await db.execute(select(Branch))).scalars().all()
        for branch in branches:
            try:
                await close_period(db, branch.id, period)
                await lock_period(db, branch.id, period)
                logger.info("EOM close %s branch=%s done", period, branch.id)
            except Exception:  # noqa: BLE001
                logger.exception("EOM close branch=%s failed", branch.id)


async def run_daily() -> None:
    """Daily: threshold scan + deadline escalation + notifications."""
    from app.core.thue.escalation import escalate

    await run_threshold_scan()
    async with AsyncSessionLocal() as db:
        summary = await escalate(db, lead_days=14)
    logger.info("daily escalation: %s", summary)


async def run_eom_close() -> None:
    await run_eom_weighted_average()


async def _loop() -> None:
    # Schedule the cron jobs: compute delays, then re-arm after each fire.
    daily_due = _next_run(2, 0)       # 02:00 daily
    eom_ran_this_month = False

    while True:
        # ----- near-real-time threshold scan every tick -----
        try:
            await run_threshold_scan()
        except Exception as exc:  # noqa: BLE001
            logger.exception("threshold scan failed: %s", exc)

        # ----- daily cron -----
        daily_due -= TICK_SECONDS
        if daily_due <= 0:
            try:
                await run_daily()
            except Exception:  # noqa: BLE001
                logger.exception("daily job failed")
            daily_due = _next_run(2, 0)

        # ----- EOM close (once per last-day-of-month, at 02:30) -----
        now = datetime.now()
        if _is_last_day_of_month(now) and now.hour == 2 and not eom_ran_this_month:
            try:
                await run_eom_close()
            except Exception:  # noqa: BLE001
                logger.exception("EOM close failed")
            eom_ran_this_month = True
        if now.day == 1 and now.hour == 0:
            eom_ran_this_month = False

        await asyncio.sleep(TICK_SECONDS)


async def start_scheduler() -> asyncio.Task:
    """Start the background scheduler loop. Call from app lifespan."""
    logger.info("tax scheduler started (tick=%ss, cron daily=02:00, EOM close)", TICK_SECONDS)
    return asyncio.create_task(_loop())
