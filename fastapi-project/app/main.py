from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import create_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle: create DB pool on startup, close on shutdown."""
    app.state.pool = await create_pool(settings.database_url)
    yield
    await app.state.pool.close()


app = FastAPI(
    title="ACMI Pricing Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration — explicit origin required when allow_credentials=True
# NEVER use allow_origins=["*"] with allow_credentials=True — browsers reject this
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(aircraft_router)
app.include_router(pricing_router)
