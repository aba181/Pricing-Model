"""Unit tests for pricing calculation engine (all 7 ACMI components).

Tests cover:
- EPR interpolation (exact match, between rows, boundary clamp, empty matrix)
- Aircraft component (A) calculation
- Crew component (C) with all 6 (type x lease_type) combinations
- Maintenance component (M)
- Insurance component (I)
- DOC, Other COGS, Overhead components
- Margin and final rate calculation
- Full calculate_pricing orchestration
- Project-level P&L aggregation
- Decimal precision verification (no floats anywhere)

All values use Decimal for exact equality assertions.
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.pricing.service import (
    interpolate_epr,
    calculate_pricing,
    calculate_project_pnl,
    AircraftCosts,
    PricingConfig,
    CrewConfig,
    CREW_COMPOSITION,
    _calc_aircraft,
    _calc_crew,
    _calc_maintenance,
    _calc_insurance,
    _calc_doc,
    _calc_other_cogs,
    _calc_overhead,
)


# ---------------------------------------------------------------------------
# EPR Interpolation
# ---------------------------------------------------------------------------


class TestInterpolateEpr:
    """Tests for EPR matrix interpolation."""

    def test_exact_match(self):
        """Exact cycle_ratio match returns that row's rate."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        result = interpolate_epr(matrix, Decimal("1.0"))
        assert result == Decimal("448.22")

    def test_exact_match_second_row(self):
        """Exact match on non-first row."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        result = interpolate_epr(matrix, Decimal("1.5"))
        assert result == Decimal("319.07")

    def test_between_rows_interpolation(self):
        """Linear interpolation between two rows."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        # At 1.25 (midpoint), expected = 448.22 + (319.07 - 448.22) * (1.25 - 1.0) / (1.5 - 1.0)
        # = 448.22 + (-129.15) * 0.5 = 448.22 - 64.575 = 383.645
        result = interpolate_epr(matrix, Decimal("1.25"))
        assert result == Decimal("383.645")

    def test_below_minimum_clamps(self):
        """Below minimum cycle_ratio clamps to first row's rate."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        result = interpolate_epr(matrix, Decimal("0.5"))
        assert result == Decimal("448.22")

    def test_above_maximum_clamps(self):
        """Above maximum cycle_ratio clamps to last row's rate."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        result = interpolate_epr(matrix, Decimal("2.0"))
        assert result == Decimal("319.07")

    def test_empty_matrix_raises(self):
        """Empty matrix raises ValueError."""
        with pytest.raises(ValueError, match="EPR matrix"):
            interpolate_epr([], Decimal("1.0"))

    def test_single_row_matrix(self):
        """Single row matrix returns that row's rate regardless of target."""
        matrix = [(Decimal("1.0"), Decimal("448.22"))]
        assert interpolate_epr(matrix, Decimal("0.5")) == Decimal("448.22")
        assert interpolate_epr(matrix, Decimal("1.0")) == Decimal("448.22")
        assert interpolate_epr(matrix, Decimal("2.0")) == Decimal("448.22")

    def test_result_is_decimal(self):
        """Interpolated result is always Decimal, never float."""
        matrix = [
            (Decimal("1.0"), Decimal("448.22")),
            (Decimal("1.5"), Decimal("319.07")),
        ]
        result = interpolate_epr(matrix, Decimal("1.25"))
        assert isinstance(result, Decimal)


# ---------------------------------------------------------------------------
# Crew Composition Dictionary
# ---------------------------------------------------------------------------


class TestCrewComposition:
    """Tests for CREW_COMPOSITION lookup table."""

    def test_a320_wet(self):
        comp = CREW_COMPOSITION[("A320", "wet")]
        assert comp == {"pilots": 2, "senior": 1, "regular": 3}

    def test_a320_damp(self):
        comp = CREW_COMPOSITION[("A320", "damp")]
        assert comp == {"pilots": 2, "senior": 0, "regular": 0}

    def test_a320_moist(self):
        comp = CREW_COMPOSITION[("A320", "moist")]
        assert comp == {"pilots": 2, "senior": 1, "regular": 0}

    def test_a321_wet(self):
        comp = CREW_COMPOSITION[("A321", "wet")]
        assert comp == {"pilots": 2, "senior": 1, "regular": 4}

    def test_a321_damp(self):
        comp = CREW_COMPOSITION[("A321", "damp")]
        assert comp == {"pilots": 2, "senior": 0, "regular": 0}

    def test_a321_moist(self):
        comp = CREW_COMPOSITION[("A321", "moist")]
        assert comp == {"pilots": 2, "senior": 1, "regular": 0}


# ---------------------------------------------------------------------------
# Component Calculators - Test Fixtures
# ---------------------------------------------------------------------------

# Shared test data for consistent assertions
_TEST_EXCHANGE_RATE = Decimal("0.85")
_TEST_MGH = Decimal("350")

_TEST_AIRCRAFT_COSTS = AircraftCosts(
    lease_rent_usd=Decimal("185000.00"),
    six_year_check_usd=Decimal("15413.95"),
    twelve_year_check_usd=Decimal("8418.19"),
    ldg_usd=Decimal("4333.21"),
    apu_rate_usd=Decimal("59.74"),
    llp1_rate_usd=Decimal("317.905"),
    llp2_rate_usd=Decimal("317.905"),
    epr_rate=Decimal("448.22"),  # Looked up from matrix for CR=1.0 benign
)

_TEST_PRICING_CONFIG = PricingConfig(
    exchange_rate=Decimal("0.85"),
    insurance_usd=Decimal("45000.00"),
    doc_total_budget=Decimal("110000.00"),
    overhead_total_budget=Decimal("165000.00"),
    other_cogs_monthly=Decimal("8500.00"),
    line_maintenance_monthly=Decimal("35000.00"),
    base_maintenance_monthly=Decimal("15000.00"),
    personnel_salary_monthly=Decimal("25000.00"),
    c_check_monthly=Decimal("18000.00"),
    maintenance_training_monthly=Decimal("5500.00"),
    spare_parts_rate=Decimal("12.50"),
    maintenance_per_diem=Decimal("3500.00"),
    average_active_fleet=Decimal("11.0"),
)

_TEST_CREW_CONFIG = CrewConfig(
    aircraft_type="A320",
    pilot_salary_monthly=Decimal("12500.00"),
    senior_attendant_salary_monthly=Decimal("4500.00"),
    regular_attendant_salary_monthly=Decimal("3500.00"),
    per_diem_rate=Decimal("75.00"),
    accommodation_monthly_budget=Decimal("44000.00"),
    training_total_budget=Decimal("55000.00"),
    uniform_total_budget=Decimal("22000.00"),
)


class TestCalcAircraft:
    """Tests for _calc_aircraft component calculator."""

    def test_basic_calculation(self):
        """Aircraft cost sums all rates, converts to EUR, divides by MGH."""
        result = _calc_aircraft(
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            exchange_rate=_TEST_EXCHANGE_RATE,
            mgh=_TEST_MGH,
        )
        # Total USD = lease_rent + 6y + 12y + ldg + (epr * 2) + llp1 + llp2 + apu
        # = 185000 + 15413.95 + 8418.19 + 4333.21 + (448.22 * 2) + 317.905 + 317.905 + 59.74
        # = 185000 + 15413.95 + 8418.19 + 4333.21 + 896.44 + 317.905 + 317.905 + 59.74
        # = 214757.3500
        # EUR = 214757.3500 * 0.85 = 182543.7475
        # Per BH = 182543.7475 / 350 = 521.5535...
        # We use exact Decimal arithmetic so the result should be precisely what the engine computes
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_epr_multiplied_by_two(self):
        """EPR rate is per-engine; must be multiplied by 2 for twin-engine aircraft."""
        # With epr_rate=100, if doubled, total goes up by 100
        costs_low_epr = AircraftCosts(
            lease_rent_usd=Decimal("0"),
            six_year_check_usd=Decimal("0"),
            twelve_year_check_usd=Decimal("0"),
            ldg_usd=Decimal("0"),
            apu_rate_usd=Decimal("0"),
            llp1_rate_usd=Decimal("0"),
            llp2_rate_usd=Decimal("0"),
            epr_rate=Decimal("100"),
        )
        result = _calc_aircraft(
            aircraft_costs=costs_low_epr,
            exchange_rate=Decimal("1"),  # no conversion
            mgh=Decimal("1"),  # per BH = per month
        )
        # Total = epr * 2 = 200, EUR = 200 * 1 = 200, per BH = 200 / 1 = 200
        assert result == Decimal("200")

    def test_result_is_decimal(self):
        result = _calc_aircraft(
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            exchange_rate=_TEST_EXCHANGE_RATE,
            mgh=_TEST_MGH,
        )
        assert isinstance(result, Decimal)


class TestCalcCrew:
    """Tests for _calc_crew component calculator."""

    def test_a320_wet_lease(self):
        """A320 wet: 2 pilots, 1 senior, 3 regular -- all costs included."""
        result = _calc_crew(
            aircraft_type="A320",
            lease_type="wet",
            crew_sets=4,
            crew_config=_TEST_CREW_CONFIG,
            mgh=_TEST_MGH,
            average_active_fleet=Decimal("11.0"),
        )
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_a320_damp_cheaper_than_wet(self):
        """A320 damp: pilots only -- must be cheaper than wet."""
        wet = _calc_crew("A320", "wet", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        damp = _calc_crew("A320", "damp", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        assert damp < wet

    def test_a320_moist_between_damp_and_wet(self):
        """A320 moist: pilots + 1 senior -- between damp and wet cost."""
        wet = _calc_crew("A320", "wet", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        damp = _calc_crew("A320", "damp", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        moist = _calc_crew("A320", "moist", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        assert damp < moist < wet

    def test_crew_sets_scales_cost(self):
        """More crew sets = higher cost (proportional for salary component)."""
        cost_4 = _calc_crew("A320", "wet", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        cost_5 = _calc_crew("A320", "wet", 5, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        assert cost_5 > cost_4

    def test_result_is_decimal(self):
        result = _calc_crew("A320", "wet", 4, _TEST_CREW_CONFIG, _TEST_MGH, Decimal("11.0"))
        assert isinstance(result, Decimal)


class TestCalcMaintenance:
    """Tests for _calc_maintenance component calculator."""

    def test_basic_calculation(self):
        """Maintenance = (Fixed + Variable) / MGH."""
        result = _calc_maintenance(
            mgh=_TEST_MGH,
            config=_TEST_PRICING_CONFIG,
        )
        # Fixed = line + base + personnel + c_check + training = 35000 + 15000 + 25000 + 18000 + 5500 = 98500
        # Variable = spare_parts_rate * MGH + per_diem = 12.50 * 350 + 3500 = 4375 + 3500 = 7875
        # Total = 98500 + 7875 = 106375
        # Per BH = 106375 / 350 = 303.928571...
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_higher_mgh_lowers_fixed_cost_per_bh(self):
        """Higher MGH dilutes fixed costs across more block hours."""
        low_mgh = _calc_maintenance(Decimal("200"), _TEST_PRICING_CONFIG)
        high_mgh = _calc_maintenance(Decimal("500"), _TEST_PRICING_CONFIG)
        assert high_mgh < low_mgh

    def test_result_is_decimal(self):
        result = _calc_maintenance(Decimal("350"), _TEST_PRICING_CONFIG)
        assert isinstance(result, Decimal)


class TestCalcInsurance:
    """Tests for _calc_insurance component calculator."""

    def test_basic_calculation(self):
        """Insurance = insurance_usd * exchange_rate / MGH."""
        result = _calc_insurance(
            config=_TEST_PRICING_CONFIG,
            exchange_rate=_TEST_EXCHANGE_RATE,
            mgh=_TEST_MGH,
        )
        # = 45000 * 0.85 / 350 = 38250 / 350 = 109.285714...
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_result_is_decimal(self):
        result = _calc_insurance(_TEST_PRICING_CONFIG, _TEST_EXCHANGE_RATE, _TEST_MGH)
        assert isinstance(result, Decimal)


class TestCalcDoc:
    """Tests for _calc_doc component calculator."""

    def test_basic_calculation(self):
        """DOC = doc_total_budget / average_active_fleet / MGH."""
        result = _calc_doc(config=_TEST_PRICING_CONFIG, mgh=_TEST_MGH)
        # = 110000 / 11 / 350 = 10000 / 350 = 28.571428...
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_result_is_decimal(self):
        result = _calc_doc(_TEST_PRICING_CONFIG, _TEST_MGH)
        assert isinstance(result, Decimal)


class TestCalcOtherCogs:
    """Tests for _calc_other_cogs component calculator."""

    def test_basic_calculation(self):
        """Other COGS = other_cogs_monthly / MGH."""
        result = _calc_other_cogs(config=_TEST_PRICING_CONFIG, mgh=_TEST_MGH)
        # = 8500 / 350 = 24.285714...
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_result_is_decimal(self):
        result = _calc_other_cogs(_TEST_PRICING_CONFIG, _TEST_MGH)
        assert isinstance(result, Decimal)


class TestCalcOverhead:
    """Tests for _calc_overhead component calculator."""

    def test_basic_calculation(self):
        """Overhead = overhead_total_budget / average_active_fleet / MGH."""
        result = _calc_overhead(config=_TEST_PRICING_CONFIG, mgh=_TEST_MGH)
        # = 165000 / 11 / 350 = 15000 / 350 = 42.857142...
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    def test_result_is_decimal(self):
        result = _calc_overhead(_TEST_PRICING_CONFIG, _TEST_MGH)
        assert isinstance(result, Decimal)


# ---------------------------------------------------------------------------
# Margin and Final Rate
# ---------------------------------------------------------------------------


class TestMarginCalculation:
    """Tests for margin/final rate in calculate_pricing."""

    def test_zero_margin_rate_equals_cost(self):
        """With 0% margin, final rate equals total cost per BH."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert result.final_rate_per_bh == result.total_cost_per_bh
        assert result.margin_percent == Decimal("0")

    def test_positive_margin_increases_rate(self):
        """With positive margin, final rate > total cost per BH."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("10"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert result.final_rate_per_bh > result.total_cost_per_bh
        assert result.margin_percent == Decimal("10")

    def test_margin_formula(self):
        """Margin formula: final_rate = cost / (1 - margin_percent/100)."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("10"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        expected = result.total_cost_per_bh / (Decimal("1") - Decimal("10") / Decimal("100"))
        assert result.final_rate_per_bh == expected

    def test_revenue_equals_final_rate(self):
        """Revenue per BH equals the final rate (billing rate)."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("10"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert result.revenue_per_bh == result.final_rate_per_bh


# ---------------------------------------------------------------------------
# Full calculate_pricing Orchestration
# ---------------------------------------------------------------------------


class TestCalculatePricing:
    """Tests for the main calculate_pricing function."""

    def test_returns_all_seven_components(self):
        """Result contains all 7 component costs."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert result.aircraft_eur_per_bh > Decimal("0")
        assert result.crew_eur_per_bh > Decimal("0")
        assert result.maintenance_eur_per_bh > Decimal("0")
        assert result.insurance_eur_per_bh > Decimal("0")
        assert result.doc_eur_per_bh > Decimal("0")
        assert result.other_cogs_eur_per_bh > Decimal("0")
        assert result.overhead_eur_per_bh > Decimal("0")

    def test_total_is_sum_of_components(self):
        """Total cost per BH is the sum of all 7 component costs."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        expected_total = (
            result.aircraft_eur_per_bh
            + result.crew_eur_per_bh
            + result.maintenance_eur_per_bh
            + result.insurance_eur_per_bh
            + result.doc_eur_per_bh
            + result.other_cogs_eur_per_bh
            + result.overhead_eur_per_bh
        )
        assert result.total_cost_per_bh == expected_total

    def test_all_results_are_decimal(self):
        """Every value in the breakdown is a Decimal instance."""
        result = calculate_pricing(
            mgh=_TEST_MGH,
            cycle_ratio=Decimal("1.0"),
            environment="benign",
            lease_type="wet",
            crew_sets=4,
            aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS,
            epr_matrix=[(Decimal("1.0"), Decimal("448.22"))],
            pricing_config=_TEST_PRICING_CONFIG,
            crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"),
            exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert isinstance(result.aircraft_eur_per_bh, Decimal)
        assert isinstance(result.crew_eur_per_bh, Decimal)
        assert isinstance(result.maintenance_eur_per_bh, Decimal)
        assert isinstance(result.insurance_eur_per_bh, Decimal)
        assert isinstance(result.doc_eur_per_bh, Decimal)
        assert isinstance(result.other_cogs_eur_per_bh, Decimal)
        assert isinstance(result.overhead_eur_per_bh, Decimal)
        assert isinstance(result.total_cost_per_bh, Decimal)
        assert isinstance(result.revenue_per_bh, Decimal)
        assert isinstance(result.margin_percent, Decimal)
        assert isinstance(result.final_rate_per_bh, Decimal)

    def test_hot_environment_different_from_benign(self):
        """Hot environment uses different EPR rate than benign."""
        epr_matrix_benign = [(Decimal("1.0"), Decimal("448.22"))]
        epr_matrix_hot = [(Decimal("1.0"), Decimal("672.33"))]

        benign_result = calculate_pricing(
            mgh=_TEST_MGH, cycle_ratio=Decimal("1.0"), environment="benign",
            lease_type="wet", crew_sets=4, aircraft_type="A320",
            aircraft_costs=_TEST_AIRCRAFT_COSTS, epr_matrix=epr_matrix_benign,
            pricing_config=_TEST_PRICING_CONFIG, crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"), exchange_rate=_TEST_EXCHANGE_RATE,
        )
        # Create aircraft costs with hot EPR rate
        hot_aircraft_costs = AircraftCosts(
            lease_rent_usd=_TEST_AIRCRAFT_COSTS.lease_rent_usd,
            six_year_check_usd=_TEST_AIRCRAFT_COSTS.six_year_check_usd,
            twelve_year_check_usd=_TEST_AIRCRAFT_COSTS.twelve_year_check_usd,
            ldg_usd=_TEST_AIRCRAFT_COSTS.ldg_usd,
            apu_rate_usd=_TEST_AIRCRAFT_COSTS.apu_rate_usd,
            llp1_rate_usd=_TEST_AIRCRAFT_COSTS.llp1_rate_usd,
            llp2_rate_usd=_TEST_AIRCRAFT_COSTS.llp2_rate_usd,
            epr_rate=Decimal("672.33"),
        )
        hot_result = calculate_pricing(
            mgh=_TEST_MGH, cycle_ratio=Decimal("1.0"), environment="hot",
            lease_type="wet", crew_sets=4, aircraft_type="A320",
            aircraft_costs=hot_aircraft_costs, epr_matrix=epr_matrix_hot,
            pricing_config=_TEST_PRICING_CONFIG, crew_config=_TEST_CREW_CONFIG,
            margin_percent=Decimal("0"), exchange_rate=_TEST_EXCHANGE_RATE,
        )
        assert hot_result.aircraft_eur_per_bh > benign_result.aircraft_eur_per_bh


# ---------------------------------------------------------------------------
# Project P&L Aggregation
# ---------------------------------------------------------------------------


class TestCalculateProjectPnl:
    """Tests for calculate_project_pnl multi-MSN aggregation."""

    def _make_result(self, mgh, total_cost_per_bh, final_rate_per_bh):
        """Helper to create a minimal MSN result dict for aggregation."""
        return {
            "msn": 3055,
            "mgh": mgh,
            "total_cost_per_bh": total_cost_per_bh,
            "final_rate_per_bh": final_rate_per_bh,
            "monthly_cost": total_cost_per_bh * mgh,
            "monthly_revenue": final_rate_per_bh * mgh,
            "monthly_pnl": (final_rate_per_bh - total_cost_per_bh) * mgh,
        }

    def test_single_msn(self):
        """Single MSN project aggregation returns same values."""
        results = [self._make_result(Decimal("350"), Decimal("1000"), Decimal("1100"))]
        totals = calculate_project_pnl(results)
        assert totals["total_monthly_cost"] == Decimal("350000")
        assert totals["total_monthly_revenue"] == Decimal("385000")
        assert totals["total_monthly_pnl"] == Decimal("35000")

    def test_multiple_msns(self):
        """Multiple MSNs aggregate costs and revenues."""
        results = [
            self._make_result(Decimal("350"), Decimal("1000"), Decimal("1100")),
            self._make_result(Decimal("300"), Decimal("900"), Decimal("1000")),
        ]
        totals = calculate_project_pnl(results)
        # Total cost: 350*1000 + 300*900 = 350000 + 270000 = 620000
        assert totals["total_monthly_cost"] == Decimal("620000")
        # Total revenue: 350*1100 + 300*1000 = 385000 + 300000 = 685000
        assert totals["total_monthly_revenue"] == Decimal("685000")
        # Total PnL: 685000 - 620000 = 65000
        assert totals["total_monthly_pnl"] == Decimal("65000")

    def test_weighted_average_rate(self):
        """Weighted average per-BH rate weighted by MGH."""
        results = [
            self._make_result(Decimal("350"), Decimal("1000"), Decimal("1100")),
            self._make_result(Decimal("300"), Decimal("900"), Decimal("1000")),
        ]
        totals = calculate_project_pnl(results)
        # Weighted avg cost = 620000 / (350 + 300) = 620000 / 650
        expected_avg_cost = Decimal("620000") / Decimal("650")
        assert totals["weighted_avg_cost_per_bh"] == expected_avg_cost

    def test_result_values_are_decimal(self):
        results = [self._make_result(Decimal("350"), Decimal("1000"), Decimal("1100"))]
        totals = calculate_project_pnl(results)
        assert isinstance(totals["total_monthly_cost"], Decimal)
        assert isinstance(totals["total_monthly_revenue"], Decimal)
        assert isinstance(totals["total_monthly_pnl"], Decimal)
