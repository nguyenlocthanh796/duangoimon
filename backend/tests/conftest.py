import os
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*is deprecated.*")
warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*DATABASE_URL.*")

from typing import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

ADMIN_PASS = os.getenv("ADMIN_PASS", os.getenv("HARDCODED_PASS", "admin123"))
CASHIER_PASS = os.getenv("CASHIER_PASS", "cs123")


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": ADMIN_PASS,
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
async def cashier_token(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/auth/login", json={
        "username": "cashier1",
        "password": CASHIER_PASS,
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
