"""Declaration deadline computation & escalation (TT152 / Luật Quản lý thuế).

Deadlines (kể từ ngày kết thúc kỳ):
  - Kê khai theo tháng: 20 ngày đầu tháng sau (thực tế quy định 20,
    chốt luồng dùng 30 để đồng bộ cảnh báo).
  - Kê khai theo quý:  30 ngày kể từ ngày kết thúc quý.
  - Quyết toán năm:     90 ngày kể từ 31/12 năm dương lịch.

Escalation: when N days remain (14/7/3/1), push a multi-channel reminder
via the notification service; if overdue, raise a flag for the owner.
"""

from datetime import date, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.thue import notifications
from app.models.thue.declaration_deadline import DeclarationDeadline
from app.models.thue.hkd_profile import HKDProfile

# Default periods per form (days after period end).
DEADLINE_RULES: dict[str, int] = {
    "01_CNKD": 30,  # quarterly kê khai thuế (30 ngày sau kết thúc quý)
    "01_TKN_CNKD": 90,  # annual tax-exemption declaration
    "SoS1a": 30,
    "SoS2a": 30,
}

# Reminder lead days (escalation ladder).
ESCALATION_LADDER = [14, 7, 3, 1]


def quarter_end(d: date) -> date:
    q = (d.month - 1) // 3
    last_month = (q + 1) * 3
    if last_month == 3:
        return date(d.year, 3, 31)
    if last_month == 6:
        return date(d.year, 6, 30)
    if last_month == 9:
        return date(d.year, 9, 30)
    return date(d.year, 12, 31)


def compute_due_date(
    form: str, period_type: Literal["thang", "quy", "nam"], period_end: date
) -> date:
    if period_type == "quy":
        end = quarter_end(period_end)
        return end + timedelta(days=DEADLINE_RULES.get(form, 30))
    if period_type == "nam":
        return date(period_end.year, 12, 31) + timedelta(days=DEADLINE_RULES.get(form, 90))
    # tháng
    return period_end + timedelta(days=DEADLINE_RULES.get(form, 20))


async def ensure_deadlines(db: AsyncSession, profile: HKDProfile) -> None:
    """Create upcoming DeclarationDeadline rows if missing."""
    today = date.today()
    q_end = quarter_end(today)
    rules = [
        ("01_CNKD", "quy", q_end),
        ("01_TKN_CNKD", "nam", today),
    ]
    for form, ptype, pend in rules:
        due = compute_due_date(form, ptype, pend)
        existing = await db.execute(
            select(DeclarationDeadline).where(
                DeclarationDeadline.branch_id == profile.branch_id,
                DeclarationDeadline.form == form,
                DeclarationDeadline.due_date == due,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(
                DeclarationDeadline(
                    branch_id=profile.branch_id,
                    form=form,
                    period_type=ptype,
                    due_date=due,
                )
            )
    await db.commit()


def _due_reminder_level(days_left: int) -> int | None:
    """Return the tightest escalation ladder level that applies (or None).

    The ladder [14, 7, 3, 1] represents reminder milestones. For a given
    days_left we want the SMALLEST level whose window still contains it, so
    reminders escalate 14 -> 7 -> 3 -> 1 as the deadline approaches. Each
    level fires once (tracked by the reminded_* flags in escalate()).

    Examples:
        days_left=10 -> 14 (only the 14-day window contains 10)
        days_left=7  -> 7
        days_left=5  -> 7  (5 falls inside the 7-day window)
        days_left=3  -> 3
        days_left=1  -> 1
        days_left=20 -> None (beyond every window)
    """
    applicable = [lvl for lvl in ESCALATION_LADDER if days_left <= lvl]
    return min(applicable) if applicable else None


async def escalate(db: AsyncSession, lead_days: int = 14) -> dict:
    """Push reminders for deadlines within `lead_days`. Returns count."""
    today = date.today()
    result = await db.execute(select(DeclarationDeadline))
    fired = 0
    for dl in result.scalars():
        if dl.submitted:
            continue
        days_left = (dl.due_date - today).days
        if days_left < 0:
            # Overdue — escalate once more if not yet notified.
            if not dl.notified:
                await notifications.notify(
                    db,
                    category="deadline",
                    ref_type="deadline",
                    ref_id=dl.id,
                    branch_id=dl.branch_id,
                    subject=f"QUÁ HẠN nộp {dl.form}",
                    message=f"Hạn nộp {dl.form} ({dl.period_type}) đã quá hạn. Cần nộp ngay để tránh phạt.",
                    channel="in_app",
                )
                dl.notified = True
                fired += 1
            continue
        if days_left > lead_days:
            continue
        lvl = _due_reminder_level(days_left)
        flag = {"14": dl.reminded_14, "7": dl.reminded_7, "3": dl.reminded_3, "1": dl.reminded_1}[
            str(lvl)
        ]
        if flag:
            continue
        # Mark the matching ladder flag.
        if lvl == 14:
            dl.reminded_14 = True
        elif lvl == 7:
            dl.reminded_7 = True
        elif lvl == 3:
            dl.reminded_3 = True
        elif lvl == 1:
            dl.reminded_1 = True
        dl.notified = True
        await notifications.notify(
            db,
            category="deadline",
            ref_type="deadline",
            ref_id=dl.id,
            branch_id=dl.branch_id,
            subject=f"Còn {days_left} ngày nộp {dl.form}",
            message=f"Hạn nộp {dl.form} ({dl.period_type}) vào {dl.due_date.isoformat()}. Cấp nhắc nhở {lvl} ngày.",
            channel="in_app",
        )
        fired += 1
    await db.commit()
    return {"reminders_sent": fired}
