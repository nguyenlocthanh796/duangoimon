import asyncio
import os
import selectors

os.environ["PYTHONPATH"] = r"e:\posa\backend"
from sqlalchemy import text
from app.core.database import engine


async def main():
    async with engine.begin() as conn:
        # Add columns if missing (idempotent via DO blocks).
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='thue' AND table_name='declaration_deadlines'
                    AND column_name='notified'
                ) THEN
                    ALTER TABLE thue.declaration_deadlines ADD COLUMN notified BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='thue' AND table_name='declaration_deadlines'
                    AND column_name='submitted_at'
                ) THEN
                    ALTER TABLE thue.declaration_deadlines ADD COLUMN submitted_at TIMESTAMPTZ;
                END IF;
            END $$;
        """))
    print("MIGRATION_OK")


asyncio.run(main(), loop_factory=asyncio.SelectorEventLoop)
