"""Aircraft API router with list, detail, and update endpoints.

All endpoints require authentication. Update (PUT) requires admin role.
EUR conversion is applied to all responses returning monetary values.
"""
from __future__ import annotations

from decimal import Decimal

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.aircraft.repository import AircraftRepository
from app.aircraft.schemas import (
    AircraftDetailResponse,
    AircraftListResponse,
    UpdateRatesRequest,
)
from app.aircraft.service import apply_eur_conversion

router = APIRouter(prefix="/aircraft", tags=["aircraft"])


@router.get("", response_model=list[AircraftListResponse])
async def list_aircraft(
    search: str | None = Query(None, description="Search by MSN or registration"),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all aircraft with rates, optionally filtered by search term."""
    repo = AircraftRepository(db)
    rows = await repo.list_aircraft(search)
    return [apply_eur_conversion(dict(r)) for r in rows]


@router.get("/{msn}", response_model=AircraftDetailResponse)
async def get_aircraft(
    msn: int,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get aircraft detail with full rates and EPR matrix."""
    repo = AircraftRepository(db)
    aircraft = await repo.fetch_by_msn(msn)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    epr_rows = await repo.fetch_epr_matrix(aircraft["id"])
    data = apply_eur_conversion(dict(aircraft))
    data["epr_matrix"] = [dict(r) for r in epr_rows]
    return data


@router.put("/{msn}/rates", response_model=AircraftDetailResponse)
async def update_rates(
    msn: int,
    body: UpdateRatesRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Update aircraft cost parameters (admin only).

    Accepts partial updates — only non-None fields are written.
    Returns the full aircraft detail with updated values.
    """
    repo = AircraftRepository(db)
    aircraft = await repo.fetch_by_msn(msn)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    await repo.update_rates(aircraft["id"], **fields)
    # Re-fetch to return updated data
    updated = await repo.fetch_by_msn(msn)
    epr_rows = await repo.fetch_epr_matrix(updated["id"])
    data = apply_eur_conversion(dict(updated))
    data["epr_matrix"] = [dict(r) for r in epr_rows]
    return data
