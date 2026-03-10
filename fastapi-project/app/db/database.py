import json
import ssl
from decimal import Decimal

import asyncpg
from fastapi import Request


class _DecimalEncoder(json.JSONEncoder):
    def default(self, o: object) -> object:
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)


def _jsonb_encoder(value: object) -> str:
    return json.dumps(value, cls=_DecimalEncoder)


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Register JSONB codec so asyncpg returns dicts instead of raw strings."""
    await conn.set_type_codec(
        "jsonb",
        encoder=_jsonb_encoder,
        decoder=json.loads,
        schema="pg_catalog",
    )


async def create_pool(database_url: str) -> asyncpg.Pool:
    """Create an asyncpg connection pool.

    Args:
        database_url: PostgreSQL DSN string.

    Returns:
        An asyncpg connection pool instance.
    """
    # Only use SSL for public Railway URLs, not internal ones
    ssl_context = None
    if ("proxy.rlwy.net" in database_url or "sslmode" in database_url) and "railway.internal" not in database_url:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

    return await asyncpg.create_pool(
        dsn=database_url,
        min_size=2,
        max_size=10,
        init=_init_connection,
        ssl=ssl_context,
    )


async def get_db(request: Request) -> asyncpg.Connection:
    """FastAPI dependency that acquires a connection from the app's pool.

    Usage:
        @router.get("/example")
        async def example(db: asyncpg.Connection = Depends(get_db)):
            ...
    """
    async with request.app.state.pool.acquire() as connection:
        yield connection
