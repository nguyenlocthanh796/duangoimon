"""Audit logging utility - log all mutations to audit_logs table."""


from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_action(
    db: AsyncSession,
    user_id: str,
    user_name: str | None,
    action: str,
    resource: str,
    resource_id: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    request: Request | None = None,
):
    """Log a mutation event to audit_logs table."""
    ip = request.client.host if request and request.client else None
    log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        resource=resource,
        resource_id=resource_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip,
    )
    db.add(log)
    await db.flush()
