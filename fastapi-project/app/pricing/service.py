"""Pure Python pricing calculation engine for all 7 ACMI components.

All arithmetic uses decimal.Decimal -- never float. Functions are pure
(no I/O, no side effects): they receive pre-fetched data and return results.

Components:
  A (Aircraft):   Lease rent + all MR rates (6Y, 12Y, LDG, EPR*2, LLP, APU)
  C (Crew):       Fixed salaries + variable per diems, by aircraft type and lease type
  M (Maintenance):Fixed (line, base, personnel, c-check, training) + variable (spares, per diem)
  I (Insurance):  Fixed USD amount converted to EUR
  DOC:            Total budget / average active fleet / MGH
  Other COGS:     Monthly amount / MGH
  Overhead:       Total budget / average active fleet / MGH

All arithmetic uses Decimal. All internal functions prefixed with _ (private).
Module-level CREW_COMPOSITION dict maps (aircraft_type, lease_type) to crew counts.

Exports:
  - calculate_pricing: Orchestrates all 7 components + margin calculation
  - calculate_project_pnl: Aggregates multiple MSN results into project totals
  - interpolate_epr: EPR matrix interpolation with boundary clamping
  - AircraftCosts, PricingConfig, CrewConfig: Dataclasses for structured inputs
  - CREW_COMPOSITION: Crew count lookup table
"""
from __future__ import annotations

import bisect
from dataclasses import dataclass
from decimal import Decimal


# ---------------------------------------------------------------------------
# Data Classes (internal calculation types -- not Pydantic)
# ---------------------------------------------------------------------------


@dataclass
class AircraftCosts:
    """Aircraft cost data fetched from DB (Phase 2 aircraft_rates table).

    All values are monthly USD amounts except epr_rate which is the
    interpolated per-engine rate from the EPR matrix.
    """
    lease_rent_usd: Decimal
    six_year_check_usd: Decimal
    twelve_year_check_usd: Decimal
    ldg_usd: Decimal
    apu_rate_usd: Decimal
    llp1_rate_usd: Decimal
    llp2_rate_usd: Decimal
    epr_rate: Decimal  # Already interpolated per-engine rate


@dataclass
class PricingConfig:
    """Pricing configuration from the pricing_config table.

    Contains exchange rate, insurance, maintenance, DOC, overhead,
    and other COGS parameters.
    """
    exchange_rate: Decimal
    insurance_usd: Decimal
    doc_total_budget: Decimal
    overhead_total_budget: Decimal
    other_cogs_monthly: Decimal
    line_maintenance_monthly: Decimal
    base_maintenance_monthly: Decimal
    personnel_salary_monthly: Decimal
    c_check_monthly: Decimal
    maintenance_training_monthly: Decimal
    spare_parts_rate: Decimal
    maintenance_per_diem: Decimal
    average_active_fleet: Decimal


@dataclass
class CrewConfig:
    """Crew configuration from the crew_config table.

    Per aircraft_type (A320 vs A321) to handle different cabin crew compositions.
    """
    aircraft_type: str
    pilot_salary_monthly: Decimal
    senior_attendant_salary_monthly: Decimal
    regular_attendant_salary_monthly: Decimal
    per_diem_rate: Decimal
    accommodation_monthly_budget: Decimal
    training_total_budget: Decimal
    uniform_total_budget: Decimal


# ---------------------------------------------------------------------------
# Component Breakdown Result
# ---------------------------------------------------------------------------


@dataclass
class ComponentBreakdown:
    """Per-BH cost breakdown for all 7 ACMI components (EUR).

    This is the internal calculation result. The router layer converts
    this to the Pydantic schema for API responses.
    """
    aircraft_eur_per_bh: Decimal
    crew_eur_per_bh: Decimal
    maintenance_eur_per_bh: Decimal
    insurance_eur_per_bh: Decimal
    doc_eur_per_bh: Decimal
    other_cogs_eur_per_bh: Decimal
    overhead_eur_per_bh: Decimal
    total_cost_per_bh: Decimal
    revenue_per_bh: Decimal
    margin_percent: Decimal
    final_rate_per_bh: Decimal


# ---------------------------------------------------------------------------
# Crew Composition Lookup
# Source: Excel C sheet -- crew count by aircraft type and lease type
# ---------------------------------------------------------------------------

CREW_COMPOSITION: dict[tuple[str, str], dict[str, int]] = {
    # A320: 2 pilots, 1 senior, 3 regular cabin attendants (wet)
    ("A320", "wet"):   {"pilots": 2, "senior": 1, "regular": 3},
    ("A320", "damp"):  {"pilots": 2, "senior": 0, "regular": 0},
    ("A320", "moist"): {"pilots": 2, "senior": 1, "regular": 0},
    # A321: 2 pilots, 1 senior, 4 regular cabin attendants (wet)
    ("A321", "wet"):   {"pilots": 2, "senior": 1, "regular": 4},
    ("A321", "damp"):  {"pilots": 2, "senior": 0, "regular": 0},
    ("A321", "moist"): {"pilots": 2, "senior": 1, "regular": 0},
}


# ---------------------------------------------------------------------------
# EPR Interpolation
# Source: EPR matrix rows table (cycle_ratio -> rate)
# ---------------------------------------------------------------------------


def interpolate_epr(
    matrix: list[tuple[Decimal, Decimal]],
    target_cr: Decimal,
) -> Decimal:
    """Interpolate EPR rate from matrix for a given cycle ratio.

    Uses bisect for O(log n) lookup. Handles:
    - Exact match: return that row's rate
    - Between two rows: linear interpolation
    - Below minimum: clamp to first row's rate
    - Above maximum: clamp to last row's rate
    - Empty matrix: raise ValueError

    Args:
        matrix: List of (cycle_ratio, rate) tuples, sorted by cycle_ratio.
        target_cr: The target cycle ratio to look up.

    Returns:
        Interpolated EPR rate as Decimal.

    Raises:
        ValueError: If matrix is empty.
    """
    if not matrix:
        raise ValueError("EPR matrix is empty -- cannot interpolate")

    # Extract cycle ratios for bisect
    crs = [row[0] for row in matrix]

    # Single row: always return it
    if len(matrix) == 1:
        return matrix[0][1]

    # Clamp to boundaries
    if target_cr <= crs[0]:
        return matrix[0][1]
    if target_cr >= crs[-1]:
        return matrix[-1][1]

    # Find insertion point
    idx = bisect.bisect_left(crs, target_cr)

    # Exact match
    if idx < len(crs) and crs[idx] == target_cr:
        return matrix[idx][1]

    # Linear interpolation between matrix[idx-1] and matrix[idx]
    cr_low, rate_low = matrix[idx - 1]
    cr_high, rate_high = matrix[idx]
    fraction = (target_cr - cr_low) / (cr_high - cr_low)
    return rate_low + (rate_high - rate_low) * fraction


# ---------------------------------------------------------------------------
# Component Calculators
# ---------------------------------------------------------------------------


def _calc_aircraft(
    aircraft_costs: AircraftCosts,
    exchange_rate: Decimal,
    mgh: Decimal,
) -> Decimal:
    """Calculate Aircraft (A) component: EUR per block hour.

    Source: Cost Forecast sheet, Aircraft section.
    Formula: Sum all aircraft cost rates (EPR * 2 for twin-engine),
             convert USD to EUR, divide by MGH.

    Note: EPR matrix stores per-engine rates; multiply by 2 per Phase 2 decision.
    """
    total_usd = (
        aircraft_costs.lease_rent_usd
        + aircraft_costs.six_year_check_usd
        + aircraft_costs.twelve_year_check_usd
        + aircraft_costs.ldg_usd
        + aircraft_costs.epr_rate * 2  # Per-engine * 2 engines
        + aircraft_costs.llp1_rate_usd
        + aircraft_costs.llp2_rate_usd
        + aircraft_costs.apu_rate_usd
    )
    total_eur = total_usd * exchange_rate
    return total_eur / mgh


def _calc_crew(
    aircraft_type: str,
    lease_type: str,
    crew_sets: float,
    crew_config: CrewConfig,
    mgh: Decimal,
    average_active_fleet: Decimal,
) -> Decimal:
    """Calculate Crew (C) component: EUR per block hour.

    Source: C sheet in Excel workbook.
    Formula:
      Fixed = (pilot_salary * pilots + senior_salary * senior + regular_salary * regular)
              * crew_sets + training_budget / fleet + uniform_budget / fleet
      Variable = per_diem_rate * total_crew_count * crew_sets + accommodation_budget / fleet
      Result = (Fixed + Variable) / MGH
    """
    comp = CREW_COMPOSITION[(aircraft_type, lease_type)]
    pilots = comp["pilots"]
    senior = comp["senior"]
    regular = comp["regular"]
    total_crew = pilots + senior + regular
    crew_sets_d = Decimal(str(crew_sets))

    # Fixed costs
    salary_cost = (
        crew_config.pilot_salary_monthly * Decimal(str(pilots))
        + crew_config.senior_attendant_salary_monthly * Decimal(str(senior))
        + crew_config.regular_attendant_salary_monthly * Decimal(str(regular))
    ) * crew_sets_d

    training_per_ac = crew_config.training_total_budget / average_active_fleet
    uniform_per_ac = crew_config.uniform_total_budget / average_active_fleet
    fixed = salary_cost + training_per_ac + uniform_per_ac

    # Variable costs
    per_diem_cost = crew_config.per_diem_rate * Decimal(str(total_crew)) * crew_sets_d
    accommodation_per_ac = crew_config.accommodation_monthly_budget / average_active_fleet
    variable = per_diem_cost + accommodation_per_ac

    return (fixed + variable) / mgh


def _calc_maintenance(
    mgh: Decimal,
    config: PricingConfig,
) -> Decimal:
    """Calculate Maintenance (M) component: EUR per block hour.

    Source: M/I/Overhead & Other COGS sheet.
    Formula:
      Fixed = line + base + personnel + c_check + training (all monthly)
      Variable = spare_parts_rate * MGH + maintenance_per_diem
      Result = (Fixed + Variable) / MGH
    """
    fixed = (
        config.line_maintenance_monthly
        + config.base_maintenance_monthly
        + config.personnel_salary_monthly
        + config.c_check_monthly
        + config.maintenance_training_monthly
    )
    variable = config.spare_parts_rate * mgh + config.maintenance_per_diem
    return (fixed + variable) / mgh


def _calc_insurance(
    config: PricingConfig,
    exchange_rate: Decimal,
    mgh: Decimal,
) -> Decimal:
    """Calculate Insurance (I) component: EUR per block hour.

    Source: M/I/Overhead & Other COGS sheet.
    Formula: insurance_usd * exchange_rate / MGH
    """
    return config.insurance_usd * exchange_rate / mgh


def _calc_doc(
    config: PricingConfig,
    mgh: Decimal,
) -> Decimal:
    """Calculate DOC (Direct Operating Costs) component: EUR per block hour.

    Source: M/I/Overhead & Other COGS sheet.
    Formula: doc_total_budget / average_active_fleet / MGH
    """
    return config.doc_total_budget / config.average_active_fleet / mgh


def _calc_other_cogs(
    config: PricingConfig,
    mgh: Decimal,
) -> Decimal:
    """Calculate Other COGS component: EUR per block hour.

    Source: M/I/Overhead & Other COGS sheet.
    Formula: other_cogs_monthly / MGH
    """
    return config.other_cogs_monthly / mgh


def _calc_overhead(
    config: PricingConfig,
    mgh: Decimal,
) -> Decimal:
    """Calculate Overhead component: EUR per block hour.

    Source: M/I/Overhead & Other COGS sheet.
    Formula: overhead_total_budget / average_active_fleet / MGH
    """
    return config.overhead_total_budget / config.average_active_fleet / mgh


# ---------------------------------------------------------------------------
# Main Calculation Orchestrator
# ---------------------------------------------------------------------------


def calculate_pricing(
    mgh: Decimal,
    cycle_ratio: Decimal,
    environment: str,
    lease_type: str,
    crew_sets: int,
    aircraft_type: str,
    aircraft_costs: AircraftCosts,
    epr_matrix: list[tuple[Decimal, Decimal]],
    pricing_config: PricingConfig,
    crew_config: CrewConfig,
    margin_percent: Decimal,
    exchange_rate: Decimal,
) -> ComponentBreakdown:
    """Orchestrate all 7 component calculations + margin for a single MSN.

    This is the primary entry point for the pricing engine. It takes all
    required inputs and returns a full ComponentBreakdown with per-BH costs,
    total cost, margin, and final billing rate.

    Args:
        mgh: Monthly Guaranteed Hours (block hours per month).
        cycle_ratio: Flight cycles per flight hour.
        environment: "benign" or "hot" -- selects EPR rate column.
        lease_type: "wet", "damp", or "moist" -- affects crew composition.
        crew_sets: Number of crew sets (typically 4-5).
        aircraft_type: "A320" or "A321" -- affects crew composition.
        aircraft_costs: Pre-fetched aircraft rate data from DB.
                        The epr_rate field should already be the interpolated
                        rate for the target cycle_ratio and environment.
        epr_matrix: EPR matrix rows as (cycle_ratio, rate) tuples.
                    The rate should already be selected for the correct environment.
        pricing_config: Current pricing config from DB.
        crew_config: Current crew config for the aircraft type from DB.
        margin_percent: Target profit margin as percentage (e.g., 10 for 10%).
        exchange_rate: USD/EUR exchange rate.

    Returns:
        ComponentBreakdown with all 7 per-BH costs, total, margin, and final rate.
    """
    # Calculate all 7 components
    aircraft = _calc_aircraft(aircraft_costs, exchange_rate, mgh)
    crew = _calc_crew(
        aircraft_type, lease_type, crew_sets, crew_config, mgh,
        pricing_config.average_active_fleet,
    )
    maintenance = _calc_maintenance(mgh, pricing_config)
    insurance = _calc_insurance(pricing_config, exchange_rate, mgh)
    doc = _calc_doc(pricing_config, mgh)
    other_cogs = _calc_other_cogs(pricing_config, mgh)
    overhead = _calc_overhead(pricing_config, mgh)

    # Total cost per block hour
    total_cost = aircraft + crew + maintenance + insurance + doc + other_cogs + overhead

    # Margin and final rate
    # Formula: final_rate = total_cost / (1 - margin_percent / 100)
    # When margin is 0, final_rate = total_cost
    if margin_percent > Decimal("0"):
        margin_fraction = margin_percent / Decimal("100")
        final_rate = total_cost / (Decimal("1") - margin_fraction)
    else:
        final_rate = total_cost

    # Revenue per BH = final billing rate
    revenue = final_rate

    return ComponentBreakdown(
        aircraft_eur_per_bh=aircraft,
        crew_eur_per_bh=crew,
        maintenance_eur_per_bh=maintenance,
        insurance_eur_per_bh=insurance,
        doc_eur_per_bh=doc,
        other_cogs_eur_per_bh=other_cogs,
        overhead_eur_per_bh=overhead,
        total_cost_per_bh=total_cost,
        revenue_per_bh=revenue,
        margin_percent=margin_percent,
        final_rate_per_bh=final_rate,
    )


# ---------------------------------------------------------------------------
# Multi-MSN Project Aggregation
# ---------------------------------------------------------------------------


def calculate_project_pnl(msn_results: list[dict]) -> dict:
    """Aggregate multiple MSN P&L results into project totals.

    Takes a list of per-MSN result dicts and computes:
    - Total monthly cost, revenue, and P&L across all MSNs
    - Weighted average per-BH rates (weighted by MGH)

    Args:
        msn_results: List of dicts, each containing:
            - mgh: Decimal (monthly guaranteed hours)
            - total_cost_per_bh: Decimal
            - final_rate_per_bh: Decimal
            - monthly_cost: Decimal
            - monthly_revenue: Decimal
            - monthly_pnl: Decimal

    Returns:
        Dict with aggregated totals and weighted averages.
    """
    total_monthly_cost = sum(r["monthly_cost"] for r in msn_results)
    total_monthly_revenue = sum(r["monthly_revenue"] for r in msn_results)
    total_monthly_pnl = total_monthly_revenue - total_monthly_cost
    total_mgh = sum(r["mgh"] for r in msn_results)

    weighted_avg_cost = total_monthly_cost / total_mgh if total_mgh else Decimal("0")
    weighted_avg_rate = total_monthly_revenue / total_mgh if total_mgh else Decimal("0")

    return {
        "total_monthly_cost": total_monthly_cost,
        "total_monthly_revenue": total_monthly_revenue,
        "total_monthly_pnl": total_monthly_pnl,
        "total_mgh": total_mgh,
        "weighted_avg_cost_per_bh": weighted_avg_cost,
        "weighted_avg_rate_per_bh": weighted_avg_rate,
    }
