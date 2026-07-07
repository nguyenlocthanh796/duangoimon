"""Branch-aware request filtering - extract branch_id from X-Branch-ID header."""
import uuid
from fastapi import Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.branch import Branch

async def get_branch_id(
    x_branch_id: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID | None:
    """Extract and validate branch from header. Returns None if no header (admin bypass)."""
    if not x_branch_id:
        return None
    try:
        branch_uuid = uuid.UUID(x_branch_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid branch ID format")
    result = await db.execute(select(Branch).where(Branch.id == branch_uuid, Branch.is_active == True))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid or inactive branch")
    return branch_uuid
