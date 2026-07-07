import sys
import os
import asyncio

if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(r"e:\posa\backend")

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def run():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, cashier_id, status FROM ban_hang.orders"))
        rows = res.all()
        print(f"Total orders in DB: {len(rows)}")
        for row in rows:
            print(f"Order: {row[0]}, cashier: {row[1]}, status: {row[2]}")

if __name__ == "__main__":
    asyncio.run(run())
