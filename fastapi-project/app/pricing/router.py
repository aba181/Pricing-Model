"""Pricing API endpoints: calculation, config CRUD, crew config CRUD, project management.

Endpoints:
- POST /pricing/calculate: Run P&L calculation for one or more MSNs
- GET  /pricing/config: Get current pricing config
- GET  /pricing/config/{version_id}: Get specific config version
- PUT  /pricing/config: Create new config version (admin only)
- GET  /pricing/crew-config: Get all current crew configs
- PUT  /pricing/crew-config: Create new crew config version (admin only)
- POST /pricing/projects: Create pricing project
- GET  /pricing/projects: List user's projects
- GET  /pricing/projects/{id}: Get project with MSN inputs
- POST /pricing/projects/{id}/msn: Add MSN input
- PUT  /pricing/projects/{id}/msn/{input_id}: Update MSN input
- DELETE /pricing/projects/{id}/msn/{input_id}: Remove MSN input
"""
from __future__ import annotations

from decimal import Decimal

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user, require_admin
from app.db.database import get_db
from app.aircraft.repository import AircraftRepository
from app.pricing.repository import (
    CrewConfigRepository,
    PricingConfigRepository,
    ProjectRepository,
)
from app.pricing.schemas import (
    AddMsnInputRequest,
    CalculateRequest,
    CalculateResponse,
    ComponentBreakdown as ComponentBreakdownSchema,
    CreateProjectRequest,
    CrewConfigResponse,
    MsnInputResponse,
    MsnPnlResult,
    PricingConfigResponse,
    ProjectResponse,
    UpdateCrewConfigRequest,
    UpdatePricingConfigRequest,
)
from app.pricing.service import (
    AircraftCosts,
    CrewConfig,
    PricingConfig,
    calculate_pricing,
    calculate_project_pnl,
    interpolate_epr,
)


router = APIRouter(prefix="/pricing", tags=["pricing"])


# ---- Calculation Endpoint ----


@router.post("/calculate", response_model=CalculateResponse)
async def calculate(
    body: CalculateRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Run P&L calculation for one or more MSNs.

    For each MSN input:
    1. Fetch aircraft by MSN (with rates)
    2. Fetch EPR matrix for the aircraft
    3. Fetch current pricing config and crew config
    4. Interpolate EPR rate for the given cycle_ratio and environment
    5. Run the 7-component calculation
    6. Return per-MSN breakdown and aggregated total
    """
    aircraft_repo = AircraftRepository(db)
    pricing_repo = PricingConfigRepository(db)
    crew_repo = CrewConfigRepository(db)

    # Fetch pricing config once
    pricing_config_row = await pricing_repo.get_current()
    if not pricing_config_row:
        raise HTTPException(status_code=500, detail="No pricing config found")

    config = PricingConfig(
        exchange_rate=pricing_config_row["exchange_rate"],
        insurance_usd=pricing_config_row["insurance_usd"],
        doc_total_budget=pricing_config_row["doc_total_budget"],
        overhead_total_budget=pricing_config_row["overhead_total_budget"],
        other_cogs_monthly=pricing_config_row["other_cogs_monthly"],
        line_maintenance_monthly=pricing_config_row["line_maintenance_monthly"],
        base_maintenance_monthly=pricing_config_row["base_maintenance_monthly"],
        personnel_salary_monthly=pricing_config_row["personnel_salary_monthly"],
        c_check_monthly=pricing_config_row["c_check_monthly"],
        maintenance_training_monthly=pricing_config_row["maintenance_training_monthly"],
        spare_parts_rate=pricing_config_row["spare_parts_rate"],
        maintenance_per_diem=pricing_config_row["maintenance_per_diem"],
        average_active_fleet=pricing_config_row["average_active_fleet"],
    )

    msn_results = []

    for msn_input in body.msn_inputs:
        # Fetch aircraft with rates
        aircraft = await aircraft_repo.fetch_by_msn(msn_input.msn)
        if not aircraft:
            raise HTTPException(
                status_code=404,
                detail=f"Aircraft with MSN {msn_input.msn} not found",
            )

        # Fetch EPR matrix
        epr_rows = await aircraft_repo.fetch_epr_matrix(aircraft["id"])

        # Build EPR matrix tuples and interpolate
        rate_key = "benign_rate" if msn_input.environment == "benign" else "hot_rate"
        epr_tuples: list[tuple[Decimal, Decimal]] = [
            (row["cycle_ratio"], row[rate_key]) for row in epr_rows
        ]
        epr_tuples.sort(key=lambda x: x[0])

        # Interpolate EPR rate for the target cycle_ratio
        epr_rate = interpolate_epr(epr_tuples, msn_input.cycle_ratio) if epr_tuples else Decimal("0")

        # Get crew config for this aircraft type
        crew_config_row = await crew_repo.get_current(aircraft["aircraft_type"])
        if not crew_config_row:
            raise HTTPException(
                status_code=500,
                detail=f"No crew config for {aircraft['aircraft_type']}",
            )

        crew_cfg = CrewConfig(
            aircraft_type=aircraft["aircraft_type"],
            pilot_salary_monthly=crew_config_row["pilot_salary_monthly"],
            senior_attendant_salary_monthly=crew_config_row["senior_attendant_salary_monthly"],
            regular_attendant_salary_monthly=crew_config_row["regular_attendant_salary_monthly"],
            per_diem_rate=crew_config_row["per_diem_rate"],
            accommodation_monthly_budget=crew_config_row["accommodation_monthly_budget"],
            training_total_budget=crew_config_row["training_total_budget"],
            uniform_total_budget=crew_config_row["uniform_total_budget"],
        )

        # Build aircraft costs dataclass with interpolated EPR rate
        ac = AircraftCosts(
            lease_rent_usd=aircraft.get("lease_rent_usd", Decimal("0")) or Decimal("0"),
            six_year_check_usd=aircraft.get("six_year_check_usd", Decimal("0")) or Decimal("0"),
            twelve_year_check_usd=aircraft.get("twelve_year_check_usd", Decimal("0")) or Decimal("0"),
            ldg_usd=aircraft.get("ldg_usd", Decimal("0")) or Decimal("0"),
            apu_rate_usd=aircraft.get("apu_rate_usd", Decimal("0")) or Decimal("0"),
            llp1_rate_usd=aircraft.get("llp1_rate_usd", Decimal("0")) or Decimal("0"),
            llp2_rate_usd=aircraft.get("llp2_rate_usd", Decimal("0")) or Decimal("0"),
            epr_rate=epr_rate,
        )

        breakdown = calculate_pricing(
            mgh=msn_input.mgh,
            cycle_ratio=msn_input.cycle_ratio,
            environment=msn_input.environment,
            exchange_rate=body.exchange_rate,
            margin_percent=body.margin_percent,
            aircraft_type=aircraft["aircraft_type"],
            lease_type=msn_input.lease_type,
            crew_sets=msn_input.crew_sets,
            aircraft_costs=ac,
            epr_matrix=epr_tuples,
            pricing_config=config,
            crew_config=crew_cfg,
        )

        monthly_cost = breakdown.total_cost_per_bh * msn_input.mgh
        monthly_revenue = breakdown.final_rate_per_bh * msn_input.mgh
        monthly_pnl = monthly_revenue - monthly_cost

        # Convert service ComponentBreakdown to Pydantic schema
        breakdown_schema = ComponentBreakdownSchema(
            aircraft_eur_per_bh=breakdown.aircraft_eur_per_bh,
            crew_eur_per_bh=breakdown.crew_eur_per_bh,
            maintenance_eur_per_bh=breakdown.maintenance_eur_per_bh,
            insurance_eur_per_bh=breakdown.insurance_eur_per_bh,
            doc_eur_per_bh=breakdown.doc_eur_per_bh,
            other_cogs_eur_per_bh=breakdown.other_cogs_eur_per_bh,
            overhead_eur_per_bh=breakdown.overhead_eur_per_bh,
            total_cost_per_bh=breakdown.total_cost_per_bh,
            revenue_per_bh=breakdown.revenue_per_bh,
            margin_percent=breakdown.margin_percent,
            final_rate_per_bh=breakdown.final_rate_per_bh,
        )

        msn_results.append(
            MsnPnlResult(
                msn=msn_input.msn,
                aircraft_type=aircraft["aircraft_type"],
                breakdown=breakdown_schema,
                monthly_cost=monthly_cost,
                monthly_revenue=monthly_revenue,
                monthly_pnl=monthly_pnl,
            )
        )

    # Aggregate total if multiple MSNs
    total = None
    if len(msn_results) > 1:
        agg_input = [
            {
                "mgh": next(
                    inp.mgh for inp in body.msn_inputs if inp.msn == r.msn
                ),
                "monthly_cost": r.monthly_cost,
                "monthly_revenue": r.monthly_revenue,
                "monthly_pnl": r.monthly_pnl,
            }
            for r in msn_results
        ]
        agg = calculate_project_pnl(agg_input)
        if agg:
            total = ComponentBreakdownSchema(
                aircraft_eur_per_bh=Decimal("0"),
                crew_eur_per_bh=Decimal("0"),
                maintenance_eur_per_bh=Decimal("0"),
                insurance_eur_per_bh=Decimal("0"),
                doc_eur_per_bh=Decimal("0"),
                other_cogs_eur_per_bh=Decimal("0"),
                overhead_eur_per_bh=Decimal("0"),
                total_cost_per_bh=agg.get("weighted_avg_cost_per_bh", Decimal("0")),
                revenue_per_bh=agg.get("weighted_avg_rate_per_bh", Decimal("0")),
                margin_percent=body.margin_percent,
                final_rate_per_bh=agg.get("weighted_avg_rate_per_bh", Decimal("0")),
            )

    return CalculateResponse(msn_results=msn_results, total=total)


# ---- Pricing Config Endpoints ----


@router.get("/config", response_model=PricingConfigResponse)
async def get_pricing_config(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Get the current (active) pricing configuration."""
    repo = PricingConfigRepository(db)
    config = await repo.get_current()
    if not config:
        raise HTTPException(status_code=404, detail="No pricing config found")
    return config


@router.get("/config/{version_id}", response_model=PricingConfigResponse)
async def get_pricing_config_version(
    version_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Get a specific pricing config version by id."""
    repo = PricingConfigRepository(db)
    config = await repo.get_version(version_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config version not found")
    return config


@router.put("/config", response_model=PricingConfigResponse)
async def update_pricing_config(
    body: UpdatePricingConfigRequest,
    admin_user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    """Create a new pricing config version (admin only, append-only)."""
    repo = PricingConfigRepository(db)
    fields = body.model_dump(exclude_none=True)
    new_config = await repo.create_version(created_by=admin_user["id"], **fields)
    return new_config


# ---- Crew Config Endpoints ----


@router.get("/crew-config", response_model=list[CrewConfigResponse])
async def get_crew_config(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Get all current crew configs (A320 + A321)."""
    repo = CrewConfigRepository(db)
    configs = await repo.get_all_current()
    return configs


@router.put("/crew-config", response_model=CrewConfigResponse)
async def update_crew_config(
    body: UpdateCrewConfigRequest,
    admin_user: dict = Depends(require_admin),
    db: asyncpg.Connection = Depends(get_db),
):
    """Create a new crew config version for an aircraft type (admin only)."""
    repo = CrewConfigRepository(db)
    fields = body.model_dump(exclude_none=True)
    aircraft_type = fields.pop("aircraft_type")
    new_config = await repo.create_version(
        aircraft_type=aircraft_type,
        created_by=admin_user["id"],
        **fields,
    )
    return new_config


# ---- Project Endpoints ----


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    body: CreateProjectRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Create a new pricing project with auto-attached config version IDs."""
    pricing_repo = PricingConfigRepository(db)
    crew_repo = CrewConfigRepository(db)
    project_repo = ProjectRepository(db)

    # Auto-attach current config versions
    pricing_config = await pricing_repo.get_current()
    config_version_id = pricing_config["id"] if pricing_config else None

    crew_configs = await crew_repo.get_all_current()
    crew_config_a320_id = None
    crew_config_a321_id = None
    for cc in crew_configs:
        if cc["aircraft_type"] == "A320":
            crew_config_a320_id = cc["id"]
        elif cc["aircraft_type"] == "A321":
            crew_config_a321_id = cc["id"]

    project = await project_repo.create_project(
        created_by=current_user["id"],
        name=body.name,
        config_version_id=config_version_id,
        crew_config_a320_id=crew_config_a320_id,
        crew_config_a321_id=crew_config_a321_id,
    )

    return ProjectResponse(
        id=project["id"],
        name=project.get("name"),
        exchange_rate=project.get("exchange_rate", Decimal("0.85")),
        margin_percent=project.get("margin_percent", Decimal("0")),
        config_version_id=project.get("config_version_id"),
        msn_inputs=[],
    )


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """List the current user's pricing projects."""
    project_repo = ProjectRepository(db)
    projects = await project_repo.list_projects(current_user["id"])

    result = []
    for p in projects:
        # Fetch MSN inputs for each project
        msn_inputs = await project_repo.get_msn_inputs(p["id"])
        result.append(
            ProjectResponse(
                id=p["id"],
                name=p.get("name"),
                exchange_rate=p.get("exchange_rate", Decimal("0.85")),
                margin_percent=p.get("margin_percent", Decimal("0")),
                config_version_id=p.get("config_version_id"),
                msn_inputs=[MsnInputResponse(**mi) for mi in msn_inputs],
            )
        )
    return result


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Get a project with its MSN inputs."""
    project_repo = ProjectRepository(db)
    project = await project_repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    msn_inputs = await project_repo.get_msn_inputs(project_id)

    return ProjectResponse(
        id=project["id"],
        name=project.get("name"),
        exchange_rate=project.get("exchange_rate", Decimal("0.85")),
        margin_percent=project.get("margin_percent", Decimal("0")),
        config_version_id=project.get("config_version_id"),
        msn_inputs=[MsnInputResponse(**mi) for mi in msn_inputs],
    )


# ---- MSN Input Endpoints ----


@router.post("/projects/{project_id}/msn", response_model=MsnInputResponse)
async def add_msn_input(
    project_id: int,
    body: AddMsnInputRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Add an MSN input to a pricing project."""
    project_repo = ProjectRepository(db)

    # Verify project exists
    project = await project_repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    msn_input = await project_repo.add_msn_input(
        project_id,
        aircraft_id=body.aircraft_id,
        mgh=body.mgh,
        cycle_ratio=body.cycle_ratio,
        environment=body.environment,
        period_months=body.period_months,
        lease_type=body.lease_type,
        crew_sets=body.crew_sets,
    )
    return msn_input


@router.put(
    "/projects/{project_id}/msn/{input_id}",
    response_model=MsnInputResponse,
)
async def update_msn_input(
    project_id: int,
    input_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Update an MSN input within a project."""
    project_repo = ProjectRepository(db)

    updated = await project_repo.update_msn_input(input_id, **body)
    if not updated:
        raise HTTPException(status_code=404, detail="MSN input not found")
    return updated


@router.delete("/projects/{project_id}/msn/{input_id}")
async def delete_msn_input(
    project_id: int,
    input_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Remove an MSN input from a project."""
    project_repo = ProjectRepository(db)
    await project_repo.delete_msn_input(input_id)
    return {"status": "deleted"}
