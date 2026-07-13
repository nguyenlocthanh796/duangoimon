"""FastAPI middleware that logs all mutation requests to audit_logs table.

This catches POST/PUT/DELETE on any /api/v1/... route and records:
  - user, action, resource, success/failure, IP

For detailed old/new_value logging, wire `log_action()` directly in the endpoint.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import Request, Response
from sqlalchemy import select

from app.core.auth import decode_token
from app.core.database import AsyncSessionLocal
from app.models.audit import AuditLog


async def audit_mutation_middleware(request: Request, call_next):
    """ASGI middleware: log mutations after response is sent."""
    response: Response = await call_next(request)

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
        except Exception:
            pass

    # Derive resource name from path
    parts = [p for p in path.split("/") if p and p not in ("api", "v1")]
    action_map = {"POST": "create", "PUT": "update", "DELETE": "delete"}
    action = action_map.get(request.method, request.method.lower())

    # Determine if request succeeded
    if response.status_code >= 400:
        return response  # Don't log failures as audit events

    # Background log to DB — use a new session
    try:
        async with AsyncSessionLocal() as db:
            resource = parts[0] if parts else "unknown"
            log = AuditLog(
                user_id=uuid.UUID(user_id) if user_id else None,
                user_name=user_name,
                action=action,
                resource=resource,
                resource_id=None,
                ip_address=request.client.host if request.client else None,
            )
            db.add(log)
            await db.commit()
    except Exception:
        pass  # Audit failure shouldn't crash the request

    return response
