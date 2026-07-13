"""Seed data for production — branches, categories, default users."""

import asyncio
import uuid

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.all_models import *  # noqa
from app.models.branch import Branch
from app.models.user import User

# Needs to be a sync seed or use proper async
# For now: we append to seed.py

SEED_BRANCHES = [
    {
        "name": "Chi nhánh chính",
        "code": "CN01",
        "address": "123 Nguyễn Huệ, Q1, HCM",
        "phone": "0909123456",
    },
    {
        "name": "Chi nhánh 2",
        "code": "CN02",
        "address": "456 Lê Lợi, Q1, HCM",
        "phone": "0909123457",
    },
]

SEED_USERS = [
    {"username": "admin", "role": "admin", "full_name": "Quản trị viên", "password": "admin123"},
    {"username": "manager", "role": "manager", "full_name": "Quản lý", "password": "manager123"},
    {"username": "cashier", "role": "cashier", "full_name": "Thu ngân", "password": "cashier123"},
]
