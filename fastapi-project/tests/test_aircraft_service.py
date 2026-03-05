"""TDD RED: Tests for aircraft service layer (EUR conversion) and router registration.

Verifies:
- apply_eur_conversion correctly converts USD fields to EUR using DEFAULT_ADJ_RATE
- EUR conversion handles None values gracefully
- Aircraft router is registered in the FastAPI app
"""
from __future__ import annotations

from decimal import Decimal

import pytest


class TestEurConversion:
    """Tests for the EUR conversion service."""

    def test_default_adj_rate_is_decimal(self):
        """DEFAULT_ADJ_RATE should be Decimal('0.85')."""
        from app.aircraft.service import DEFAULT_ADJ_RATE

        assert DEFAULT_ADJ_RATE == Decimal("0.85")
        assert isinstance(DEFAULT_ADJ_RATE, Decimal)

    def test_apply_eur_conversion_basic(self):
        """apply_eur_conversion adds _eur fields for each _usd field."""
        from app.aircraft.service import apply_eur_conversion

        rates = {
            "lease_rent_usd": Decimal("185000.00"),
            "six_year_check_usd": Decimal("15413.95"),
        }
        result = apply_eur_conversion(rates)
        assert "lease_rent_eur" in result
        assert "six_year_check_eur" in result
        assert result["lease_rent_eur"] == Decimal("185000.00") * Decimal("0.85")
        assert result["six_year_check_eur"] == Decimal("15413.95") * Decimal("0.85")
        # Original USD fields preserved
        assert result["lease_rent_usd"] == Decimal("185000.00")

    def test_apply_eur_conversion_handles_none(self):
        """apply_eur_conversion skips None USD values."""
        from app.aircraft.service import apply_eur_conversion

        rates = {
            "lease_rent_usd": Decimal("185000.00"),
            "six_year_check_usd": None,
        }
        result = apply_eur_conversion(rates)
        assert "lease_rent_eur" in result
        assert "six_year_check_eur" not in result

    def test_apply_eur_conversion_all_usd_fields(self):
        """apply_eur_conversion processes all 7 USD rate fields."""
        from app.aircraft.service import apply_eur_conversion

        rates = {
            "lease_rent_usd": Decimal("100.00"),
            "six_year_check_usd": Decimal("200.00"),
            "twelve_year_check_usd": Decimal("300.00"),
            "ldg_usd": Decimal("400.00"),
            "apu_rate_usd": Decimal("50.00"),
            "llp1_rate_usd": Decimal("60.00"),
            "llp2_rate_usd": Decimal("70.00"),
        }
        result = apply_eur_conversion(rates)
        assert result["lease_rent_eur"] == Decimal("85.00")
        assert result["six_year_check_eur"] == Decimal("170.00")
        assert result["twelve_year_check_eur"] == Decimal("255.00")
        assert result["ldg_eur"] == Decimal("340.00")
        assert result["apu_rate_eur"] == Decimal("42.50")
        assert result["llp1_rate_eur"] == Decimal("51.00")
        assert result["llp2_rate_eur"] == Decimal("59.50")

    def test_apply_eur_conversion_custom_rate(self):
        """apply_eur_conversion accepts custom adj_rate."""
        from app.aircraft.service import apply_eur_conversion

        rates = {"lease_rent_usd": Decimal("100.00")}
        result = apply_eur_conversion(rates, adj_rate=Decimal("0.90"))
        assert result["lease_rent_eur"] == Decimal("90.00")

    def test_apply_eur_conversion_preserves_non_usd_fields(self):
        """apply_eur_conversion does not modify non-USD fields."""
        from app.aircraft.service import apply_eur_conversion

        rates = {
            "id": 1,
            "msn": 3055,
            "aircraft_type": "A320",
            "lease_rent_usd": Decimal("100.00"),
        }
        result = apply_eur_conversion(rates)
        assert result["id"] == 1
        assert result["msn"] == 3055
        assert result["aircraft_type"] == "A320"


class TestRouterRegistration:
    """Tests for aircraft router being registered in the app."""

    def test_aircraft_routes_registered(self):
        """Aircraft list, detail, and update routes should be in the app."""
        from app.main import app

        route_paths = [r.path for r in app.routes]
        assert "/aircraft" in route_paths or "/aircraft/" in route_paths
        assert "/aircraft/{msn}" in route_paths
        assert "/aircraft/{msn}/rates" in route_paths
