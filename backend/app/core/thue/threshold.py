"""Threshold alerting for HKD revenue tiers (Báo cáo §2, §6 risk 2).

- At 80-90% of the 1 ty cap, push a multi-channel warning so the
  owner can prepare for mandatory e-invoice / tax-method switch.
- At > 1 ty, open the 30-day conversion task and flag the profile.

Notifications are stubbed (log intent) until real SMS/Zalo/Email
credentials are wired (see core/thue/notify.py).
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.thue.tier import ONE_TY
from app.models.thue.declaration_deadline import DeclarationDeadline
from app.models.thue.hkd_profile import HKDProfile

logger = logging.getLogger("thue.threshold")

# Alert window: 80% - 90% of the 1 ty threshold.
ALERT_LOW = ONE_TY * Decimal("0.8")
ALERT_HIGH = ONE_TY * Decimal("0.9")


async def notify_multichannel(profile: HKDProfile, message: str) -> None:
    """Stub: push App/Zalo/SMS/Email. Logs intent only (A2: no creds)."""
    logger.info(
        "NOTIFY_STUB branch=%s tax_code=%s msg=%s",
        profile.branch_id,
        profile.tax_code,
        message,
    )


async def check_threshold(db: AsyncSession, profile: HKDProfile) -> bool:
    """Return True if an alert was fired (once)."""
    if profile.threshold_alert_sent:
        return False
    ytd = Decimal(str(profile.revenue_ytd))
    if ALERT_LOW <= ytd <= ALERT_HIGH:
        pct = (ytd / ONE_TY * Decimal("100")).quantize(Decimal("0.1"))
        await notify_multichannel(
            profile,
            f"Doanh thu UTC lũy kế đạt {pct}% ngưỡng 1 ty VND. "
            f"Chuẩn bị chuyển đổi nghĩa vụ thuế (HĐĐT, sổ kế toán).",
        )
        profile.threshold_alert_sent = True
        await db.commit()
        return True
    return False


async def on_cross_1ty(db: AsyncSession, profile: HKDProfile) -> None:
    """Open the 30-day conversion deadline when revenue exceeds 1 ty."""
    ytd = Decimal(str(profile.revenue_ytd))
    if ytd <= ONE_TY:
        return
    if profile.registration_status == "canh_bao_chuyen_doi":
        return
    profile.registration_status = "canh_bao_chuyen_doi"
    due = date.today() + timedelta(days=30)
    deadline = DeclarationDeadline(
        branch_id=profile.branch_id,
        form="01_CNKD",
        period_type="nam",
        due_date=due,
    )
    db.add(deadline)
    await db.commit()
    await notify_multichannel(
        profile,
        f"Doanh thu vượt 1 ty VND. Phải hoàn tất chuyển đổi (HĐĐT "
        f"máy tính tiền, sổ kế toán) trước {due.isoformat()}.",
    )


async def scan_all(db: AsyncSession) -> dict:
    """Daily scan: check thresholds + cross-1ty for every profile."""
    result = await db.execute(select(HKDProfile))
    fired = 0
    for profile in result.scalars():
        if await check_threshold(db, profile):
            fired += 1
        await on_cross_1ty(db, profile)
    return {"profiles_scanned": fired}
