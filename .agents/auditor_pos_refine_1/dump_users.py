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
        res = await session.execute(text("SELECT id, username, role FROM public.users"))
        for row in res.all():
            print(f"ID: {row[0]}, username: {row[1]}, role: {row[2]}")

if __name__ == "__main__":
    asyncio.run(run())
