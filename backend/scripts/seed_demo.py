"""Seed demo branch + HKD profile (idempotent).

Creates a fixed-UUID demo branch and an HKD profile so the ke-toan
module has data to display (the frontend default branch is the same UUID).
Run:  python -m scripts.seed_demo
"""

import asyncio
import uuid

# Windows + Python 3.14+: psycopg async needs SelectorEventLoop, not ProactorEventLoop
if hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.branch import Branch
from app.models.thue.hkd_profile import HKDProfile

DEMO_BRANCH_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


async def main():
    async with AsyncSessionLocal() as db:
        branch = (
            await db.execute(select(Branch).where(Branch.id == DEMO_BRANCH_ID))
        ).scalar_one_or_none()
        if not branch:
            branch = Branch(
                id=DEMO_BRANCH_ID,
                name="Chi nhánh Demo",
                code="DEMO",
                address="123 Đường Lê Lợi, Quận 1, TP.HCM",
                phone="0901234567",
                is_active=True,
            )
            db.add(branch)
            await db.flush()
            print(f"Created branch {branch.id}")
        else:
            print(f"Branch already exists {branch.id}")

        prof = (
            await db.execute(select(HKDProfile).where(HKDProfile.branch_id == DEMO_BRANCH_ID))
        ).scalar_one_or_none()
        if not prof:
            prof = HKDProfile(
                branch_id=DEMO_BRANCH_ID,
                tax_code="8000000000",
                legal_name="HKD Demo POSA",
                registration_status="dang_hoat_dong",
                tax_method="mien_thue",
                revenue_ytd=0,
                opened_in_first_half=True,
                threshold_alert_sent=False,
            )
            db.add(prof)
            await db.flush()
            print(f"Created HKD profile {prof.tax_code}")
        else:
            print(f"HKD profile already exists {prof.tax_code}")

        await db.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
