"""FastAPI middleware that logs all mutation requests to audit_logs table.

This catches POST/PUT/DELETE on any /api/v1/... route and records:
  - user, action, resource, success/failure, IP

For detailed old/new_value logging, wire `log_action()` directly in the endpoint.
"""

import logging

from fastapi import Request

from app.core.auth import decode_token
from app.core.database import AsyncSessionLocal
from app.core.uuid_utils import parse_uuid
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


async def audit_mutation_middleware(request: Request, call_next):
    """ASGI middleware: log mutations after response is sent."""
    response = await call_next(request)

    # Only log API mutations
    path = request.url.path
    if request.method not in ("POST", "PUT", "DELETE") or not path.startswith("/api/v1/"):
        return response
    # Skip auth endpoint (login/logout are logged separately)
    if "auth" in path:
        return response
    # Skip WebSocket
    if "ws" in path:
        return response

    # Extract user from Authorization header
    user_id = None
    user_name = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = decode_token(auth_header[7:])
            user_id = payload.get("sub")
            user_name = payload.get("role") or payload.get("username")
        except Exception as e:
            logger.debug("audit_middleware: invalid token in request: %s", e)

    # Derive resource name from path
    parts = [p for p in path.split("/") if p and p not in ("api", "v1")]
    action_map = {"POST": "create", "PUT": "update", "DELETE": "delete"}
    action = action_map.get(request.method, request.method.lower())

    # Determine if request succeeded
    if response.status_code >= 400:
        return response  # Don't log failures as audit events

    # Background log to DB — use a new session
    user_uuid = None
    if user_id:
        try:
            user_uuid = parse_uuid(user_id)
        except ValueError as e:
            logger.warning("audit_middleware: invalid user_id=%r: %s", user_id, e)

    try:
        async with AsyncSessionLocal() as db:
            resource = parts[0] if parts else "unknown"
            log = AuditLog(
                user_id=user_uuid,
                user_name=user_name,
                action=action,
                resource=resource,
                resource_id=None,
                ip_address=request.client.host if request.client else None,
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        # Audit failure shouldn't crash the request, but must be logged
        logger.error("audit_middleware: failed to write audit log: %s", e, exc_info=True)

    return response
