import asyncpg
from fastapi import Request


async def create_pool(database_url: str) -> asyncpg.Pool:
    """Create an asyncpg connection pool.

    Args:
        database_url: PostgreSQL DSN string.

    Returns:
        An asyncpg connection pool instance.
    """
    return await asyncpg.create_pool(
        dsn=database_url,
        min_size=2,
        max_size=10,
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
