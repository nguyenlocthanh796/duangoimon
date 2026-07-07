"""Pytest fixtures shared across test files."""
from typing import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """FastAPI test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    """Get admin JWT token for auth tests."""
    resp = await client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
async def cashier_token(client: AsyncClient) -> str:
    """Get cashier JWT token."""
    resp = await client.post("/api/v1/auth/login", json={
        "username": "cashier1",
        "password": "cs123",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
