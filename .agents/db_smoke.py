import asyncio
import os
import selectors
from decimal import Decimal

os.environ["PYTHONPATH"] = r"e:\posa\backend"

from sqlalchemy import text
from app.core.database import engine, AsyncSessionLocal
from app.models.all_models import (
    HKDProfile, SoS1a, SoS2a, SoS2b, SoS2c, SoS2d, SoS2e, SoS3a,
    CashRegisterInvoice, NotifiedBankAccount, DeclarationDeadline,
)
from app.models import Base


async def main():
    # Ensure schemas exist.
    schemas = ["ke_toan", "thue", "quan_ly", "ban_hang"]
    async with engine.begin() as conn:
        for s in schemas:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS {s}'))
        await conn.run_sync(Base.metadata.create_all)
    print("TABLES_CREATED_OK")

    # Smoke insert + select on the new tax tables.
    async with AsyncSessionLocal() as db:
        profile = HKDProfile(
            tax_code="0100100100",
            legal_name="Test HKD",
            revenue_ytd=Decimal("500000000"),
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        print("PROFILE_ID", profile.id)

        s2d = SoS2d(
            branch_id=profile.branch_id or profile.id,
            period_month="2026-07",
            product_id=profile.id,
            avg_cost=Decimal("15000"),
            closing_qty=Decimal("5"),
            closing_value=Decimal("75000"),
        )
        db.add(s2d)
        await db.commit()
        print("S2D_OK")

        # Verify select.
        from sqlalchemy import select
        rows = (await db.execute(select(HKDProfile))).scalars().all()
        print("PROFILE_COUNT", len(rows))


asyncio.run(main(), loop_factory=asyncio.SelectorEventLoop)
