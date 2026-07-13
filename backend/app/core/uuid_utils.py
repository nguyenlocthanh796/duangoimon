"""Shared UUID parsing utility for request validation."""

import uuid

from fastapi import HTTPException


def parse_uuid(val: str) -> uuid.UUID:
    """Parse string to UUID or raise 422."""
    try:
        return uuid.UUID(val)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid UUID: {val}")
