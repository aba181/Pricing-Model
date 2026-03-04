"""Test configuration with in-memory mock database layer.

Overrides the get_db dependency with a mock asyncpg.Connection that stores
data in-memory. This allows integration tests to run without a real PostgreSQL
database. The mock supports the same interface as BaseRepository expects:
fetchrow, fetch, and execute.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import get_db
from app.auth.service import hash_password


# ---- In-memory mock database ----

class MockRecord(dict):
    """Dict subclass that supports attribute access like asyncpg.Record."""
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(key)


class MockConnection:
    """Mock asyncpg.Connection backed by an in-memory dict store.

    Supports the subset of operations used by BaseRepository:
    fetchrow, fetch, execute.
    """

    def __init__(self, store: dict):
        self.store = store

    async def fetchrow(self, query: str, *args: Any) -> MockRecord | None:
        """Execute query and return first result row."""
        rows = await self._execute_query(query, args)
        return rows[0] if rows else None

    async def fetch(self, query: str, *args: Any) -> list[MockRecord]:
        """Execute query and return all result rows."""
        return await self._execute_query(query, args)

    async def execute(self, query: str, *args: Any) -> str:
        """Execute a mutation query and return status string."""
        await self._execute_query(query, args)
        return "OK"

    async def _execute_query(self, query: str, args: tuple) -> list[MockRecord]:
        """Route queries to appropriate handler based on SQL keywords."""
        q = query.strip().upper()

        if q.startswith("SELECT"):
            return self._handle_select(query, args)
        elif q.startswith("INSERT"):
            return self._handle_insert(query, args)
        elif q.startswith("UPDATE"):
            return self._handle_update(query, args)
        elif q.startswith("DELETE"):
            return self._handle_delete(query, args)
        return []

    def _handle_select(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle SELECT queries on the users table."""
        users = self.store.get("users", [])
        q_upper = query.upper()

        if "WHERE EMAIL" in q_upper and "IS_ACTIVE" in q_upper:
            # fetch_by_email: WHERE email=$1 AND is_active=TRUE
            email = args[0]
            return [MockRecord(u) for u in users if u["email"] == email and u["is_active"]]
        elif "WHERE EMAIL" in q_upper:
            email = args[0]
            return [MockRecord(u) for u in users if u["email"] == email]
        elif "WHERE ID" in q_upper:
            user_id = args[0]
            return [MockRecord(u) for u in users if u["id"] == user_id]
        elif "ORDER BY" in q_upper:
            # list_users
            sorted_users = sorted(users, key=lambda u: u["created_at"], reverse=True)
            return [MockRecord(u) for u in sorted_users]
        return [MockRecord(u) for u in users]

    def _handle_insert(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle INSERT into users table."""
        users = self.store.setdefault("users", [])
        now = datetime.now(timezone.utc)

        # Auto-increment ID
        max_id = max((u["id"] for u in users), default=0)
        new_id = max_id + 1

        new_user = MockRecord({
            "id": new_id,
            "email": args[0],
            "hashed_password": args[1],
            "role": args[2] if len(args) > 2 else "user",
            "full_name": args[3] if len(args) > 3 else None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        users.append(dict(new_user))

        if "RETURNING" in query.upper():
            return [new_user]
        return []

    def _handle_update(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle UPDATE on users table."""
        users = self.store.get("users", [])
        q_upper = query.upper()
        now = datetime.now(timezone.utc)

        if "IS_ACTIVE = FALSE" in q_upper:
            # deactivate_user
            user_id = args[0]
            for u in users:
                if u["id"] == user_id:
                    u["is_active"] = False
                    u["updated_at"] = now
                    return [MockRecord(u)] if "RETURNING" in q_upper else []
            return []

        # Dynamic update_user: parse SET clause to find fields
        # The last arg is the user_id (WHERE id=$N)
        user_id = args[-1]
        target = None
        for u in users:
            if u["id"] == user_id:
                target = u
                break
        if not target:
            return []

        # Extract field assignments from SET clause
        set_match = re.search(r'SET\s+(.+?)\s+WHERE', query, re.IGNORECASE | re.DOTALL)
        if set_match:
            set_clause = set_match.group(1)
            parts = [p.strip() for p in set_clause.split(",")]
            arg_idx = 0
            for part in parts:
                if "NOW()" in part.upper():
                    # updated_at = NOW()
                    field = part.split("=")[0].strip()
                    target[field] = now
                elif "=" in part:
                    field = part.split("=")[0].strip()
                    target[field] = args[arg_idx]
                    arg_idx += 1

        target["updated_at"] = now

        if "RETURNING" in q_upper:
            return [MockRecord(target)]
        return []

    def _handle_delete(self, query: str, args: tuple) -> list[MockRecord]:
        """Handle DELETE from users table."""
        users = self.store.get("users", [])
        if args:
            self.store["users"] = [u for u in users if u.get("email") != args[0] and u.get("id") != args[0]]
        return []


# ---- Fixtures ----

@pytest.fixture
def db_store():
    """Shared in-memory store for mock database."""
    return {"users": []}


@pytest.fixture
def mock_db(db_store):
    """Mock database connection using in-memory store."""
    return MockConnection(db_store)


@pytest.fixture
async def async_client(mock_db):
    """Async HTTP test client with mocked database dependency."""

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_admin_user(db_store):
    """Insert an admin user into the mock DB store."""
    now = datetime.now(timezone.utc)
    user = {
        "id": 1,
        "email": "admin@test.com",
        "hashed_password": hash_password("adminpass123"),
        "role": "admin",
        "full_name": "Test Admin",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    db_store["users"].append(user)
    return {"id": 1, "email": "admin@test.com", "role": "admin"}


@pytest.fixture
def test_regular_user(db_store):
    """Insert a regular user into the mock DB store."""
    now = datetime.now(timezone.utc)
    user = {
        "id": 2,
        "email": "user@test.com",
        "hashed_password": hash_password("userpass123"),
        "role": "user",
        "full_name": "Test User",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    db_store["users"].append(user)
    return {"id": 2, "email": "user@test.com", "role": "user"}
