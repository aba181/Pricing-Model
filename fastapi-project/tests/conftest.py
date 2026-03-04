from __future__ import annotations

import pytest
import asyncpg
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings


@pytest.fixture(scope="session")
async def db_pool():
    """Session-scoped asyncpg pool for test database operations."""
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=3)
    yield pool
    await pool.close()


@pytest.fixture
async def async_client():
    """Async HTTP test client pointed at the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
async def test_admin_user(db_pool):
    """Insert an admin user into the test DB; clean up after test."""
    from pwdlib import PasswordHash

    ph = PasswordHash.recommended()
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """INSERT INTO users (email, hashed_password, role, full_name)
               VALUES ($1, $2, 'admin', 'Test Admin')
               RETURNING id, email, role""",
            "admin@test.com",
            ph.hash("adminpass123"),
        )
        yield dict(user)
        await conn.execute("DELETE FROM users WHERE email = 'admin@test.com'")


@pytest.fixture
async def test_regular_user(db_pool):
    """Insert a standard user into the test DB; clean up after test."""
    from pwdlib import PasswordHash

    ph = PasswordHash.recommended()
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """INSERT INTO users (email, hashed_password, role, full_name)
               VALUES ($1, $2, 'user', 'Test User')
               RETURNING id, email, role""",
            "user@test.com",
            ph.hash("userpass123"),
        )
        yield dict(user)
        await conn.execute("DELETE FROM users WHERE email = 'user@test.com'")
