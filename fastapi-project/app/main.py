import pathlib
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import create_pool


async def run_migrations(pool: asyncpg.Pool) -> None:
    """Run SQL migration files in order on startup."""
    migrations_dir = pathlib.Path(__file__).parent.parent / "migrations"
    if not migrations_dir.exists():
        return

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        applied = {row["filename"] for row in await conn.fetch("SELECT filename FROM _migrations")}

        for sql_file in sorted(migrations_dir.glob("*.sql")):
            if sql_file.name not in applied:
                sql = sql_file.read_text()
                await conn.execute(sql)
                await conn.execute("INSERT INTO _migrations (filename) VALUES ($1)", sql_file.name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: create DB pool on startup, close on shutdown."""
    app.state.pool = await create_pool(settings.database_url)
    await run_migrations(app.state.pool)
    yield
    await app.state.pool.close()


app = FastAPI(
    title="ACMI Pricing Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration — explicit origin required when allow_credentials=True
# NEVER use allow_origins=["*"] with allow_credentials=True — browsers reject this
origins = [settings.frontend_url]
if settings.allowed_origins:
    origins.extend(o.strip() for o in settings.allowed_origins.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}


# Router includes
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.aircraft.router import router as aircraft_router
from app.pricing.router import router as pricing_router
from app.quotes.router import router as quotes_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(aircraft_router)
app.include_router(pricing_router)
app.include_router(quotes_router)
