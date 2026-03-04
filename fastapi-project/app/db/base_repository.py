from __future__ import annotations

from typing import Any

import asyncpg


class BaseRepository:
    """Base class for all database repositories.

    Wraps an asyncpg connection and provides typed helper methods
    for common query patterns. All repositories should extend this class.

    Example:
        class UserRepository(BaseRepository):
            async def fetch_by_email(self, email: str) -> dict | None:
                return await self.fetch_one(
                    "SELECT * FROM users WHERE email = $1", email
                )
    """

    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def fetch_one(self, query: str, *args: Any) -> dict | None:
        """Execute a query and return the first row as a dict, or None."""
        row = await self.conn.fetchrow(query, *args)
        return dict(row) if row else None

    async def fetch_many(self, query: str, *args: Any) -> list[dict]:
        """Execute a query and return all rows as a list of dicts."""
        rows = await self.conn.fetch(query, *args)
        return [dict(row) for row in rows]

    async def execute(self, query: str, *args: Any) -> str:
        """Execute a query and return the status string (e.g., 'INSERT 0 1')."""
        return await self.conn.execute(query, *args)
