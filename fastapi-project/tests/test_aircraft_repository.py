"""TDD RED: Tests for AircraftRepository and Pydantic schemas.

These tests verify the aircraft data layer: repository methods, schema
validation, and Decimal precision for monetary fields.
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.aircraft.repository import AircraftRepository
from app.aircraft.schemas import (
    AircraftDetailResponse,
    AircraftListResponse,
    EprMatrixRow,
    UpdateRatesRequest,
)


# ---- Schema Tests ----


class TestSchemas:
    """Verify Pydantic schemas use Decimal types correctly."""

    def test_list_response_decimal_fields(self):
        """AircraftListResponse should accept and preserve Decimal values."""
        data = AircraftListResponse(
            id=1,
            msn=3055,
            aircraft_type="A320",
            registration=None,
            lease_rent_usd=Decimal("185000.00"),
            six_year_check_usd=Decimal("15413.95"),
            twelve_year_check_usd=Decimal("8418.19"),
            ldg_usd=Decimal("4333.21"),
        )
        assert data.lease_rent_usd == Decimal("185000.00")
        assert data.msn == 3055
        assert data.registration is None

    def test_detail_response_includes_all_rate_fields(self):
        """AircraftDetailResponse should include variable rates and escalation."""
        data = AircraftDetailResponse(
            id=1,
            msn=3055,
            aircraft_type="A320",
            registration=None,
            lease_rent_usd=Decimal("185000.00"),
            six_year_check_usd=Decimal("15413.95"),
            twelve_year_check_usd=Decimal("8418.19"),
            ldg_usd=Decimal("4333.21"),
            apu_rate_usd=Decimal("59.74"),
            llp1_rate_usd=Decimal("317.905"),
            llp2_rate_usd=Decimal("317.905"),
            epr_escalation=Decimal("0.05"),
            llp_escalation=Decimal("0.08"),
            af_apu_escalation=Decimal("0.03"),
            epr_matrix=[
                EprMatrixRow(
                    cycle_ratio=Decimal("1.0"),
                    benign_rate=Decimal("448.22"),
                    hot_rate=Decimal("672.33"),
                )
            ],
        )
        assert data.apu_rate_usd == Decimal("59.74")
        assert data.epr_escalation == Decimal("0.05")
        assert len(data.epr_matrix) == 1

    def test_epr_matrix_row_decimal(self):
        """EprMatrixRow should use Decimal for all numeric fields."""
        row = EprMatrixRow(
            cycle_ratio=Decimal("1.5"),
            benign_rate=Decimal("319.07"),
            hot_rate=Decimal("478.61"),
        )
        assert isinstance(row.cycle_ratio, Decimal)
        assert isinstance(row.benign_rate, Decimal)

    def test_update_rates_request_optional_fields(self):
        """UpdateRatesRequest should allow partial updates."""
        req = UpdateRatesRequest(lease_rent_usd=Decimal("200000.00"))
        assert req.lease_rent_usd == Decimal("200000.00")
        assert req.six_year_check_usd is None

    def test_list_response_no_float(self):
        """Monetary fields must never silently convert to float."""
        data = AircraftListResponse(
            id=1,
            msn=3055,
            aircraft_type="A320",
            registration=None,
            lease_rent_usd=Decimal("185000.00"),
            six_year_check_usd=Decimal("15413.95"),
            twelve_year_check_usd=Decimal("8418.19"),
            ldg_usd=Decimal("4333.21"),
        )
        # Pydantic should keep Decimal, not convert to float
        assert isinstance(data.lease_rent_usd, Decimal)


# ---- Repository Tests (using mock connection) ----


@pytest.fixture
def aircraft_store():
    """In-memory store for aircraft mock data."""
    return {
        "users": [],
        "aircraft": [
            {
                "id": 1,
                "msn": 3055,
                "aircraft_type": "A320",
                "registration": None,
            },
            {
                "id": 2,
                "msn": 3378,
                "aircraft_type": "A320",
                "registration": "LZ-AWA",
            },
        ],
        "aircraft_rates": [
            {
                "id": 1,
                "aircraft_id": 1,
                "lease_rent_usd": Decimal("185000.00"),
                "six_year_check_usd": Decimal("15413.95"),
                "twelve_year_check_usd": Decimal("8418.19"),
                "ldg_usd": Decimal("4333.21"),
                "apu_rate_usd": Decimal("59.74"),
                "llp1_rate_usd": Decimal("317.905"),
                "llp2_rate_usd": Decimal("317.905"),
                "epr_escalation": Decimal("0.05"),
                "llp_escalation": Decimal("0.08"),
                "af_apu_escalation": Decimal("0.03"),
            },
            {
                "id": 2,
                "aircraft_id": 2,
                "lease_rent_usd": Decimal("185000.00"),
                "six_year_check_usd": Decimal("14334.75"),
                "twelve_year_check_usd": Decimal("7513.065"),
                "ldg_usd": Decimal("4864.50"),
                "apu_rate_usd": Decimal("53.82"),
                "llp1_rate_usd": Decimal("341.775"),
                "llp2_rate_usd": Decimal("353.13495"),
                "epr_escalation": Decimal("0.03"),
                "llp_escalation": Decimal("0.085"),
                "af_apu_escalation": Decimal("0.035"),
            },
        ],
        "epr_matrix_rows": [
            {
                "id": 1,
                "aircraft_id": 1,
                "cycle_ratio": Decimal("1.0"),
                "benign_rate": Decimal("448.22"),
                "hot_rate": Decimal("672.33"),
            },
            {
                "id": 2,
                "aircraft_id": 1,
                "cycle_ratio": Decimal("1.5"),
                "benign_rate": Decimal("319.07"),
                "hot_rate": Decimal("478.61"),
            },
            {
                "id": 3,
                "aircraft_id": 2,
                "cycle_ratio": Decimal("0.62"),
                "benign_rate": Decimal("669.32"),
                "hot_rate": Decimal("870.73"),
            },
        ],
    }


@pytest.fixture
def aircraft_mock_db(aircraft_store):
    """MockConnection extended for aircraft tables."""
    from tests.conftest import MockConnection

    return MockConnection(aircraft_store)


@pytest.fixture
def repo(aircraft_mock_db):
    """AircraftRepository instance with mock connection."""
    return AircraftRepository(aircraft_mock_db)


class TestAircraftRepository:
    """Tests for AircraftRepository methods."""

    @pytest.mark.asyncio
    async def test_list_aircraft_returns_all(self, repo):
        """list_aircraft() returns all aircraft joined with rates, ordered by MSN."""
        result = await repo.list_aircraft()
        assert len(result) == 2
        assert result[0]["msn"] == 3055
        assert result[1]["msn"] == 3378

    @pytest.mark.asyncio
    async def test_list_aircraft_search_by_msn(self, repo):
        """list_aircraft(search='3055') filters by MSN substring."""
        result = await repo.list_aircraft(search="3055")
        assert len(result) == 1
        assert result[0]["msn"] == 3055

    @pytest.mark.asyncio
    async def test_list_aircraft_search_by_registration(self, repo):
        """list_aircraft(search='LZ') filters by registration substring."""
        result = await repo.list_aircraft(search="LZ")
        assert len(result) == 1
        assert result[0]["msn"] == 3378

    @pytest.mark.asyncio
    async def test_fetch_by_msn_found(self, repo):
        """fetch_by_msn(3055) returns aircraft with all rate fields."""
        result = await repo.fetch_by_msn(3055)
        assert result is not None
        assert result["msn"] == 3055
        assert "lease_rent_usd" in result
        assert "epr_escalation" in result

    @pytest.mark.asyncio
    async def test_fetch_by_msn_not_found(self, repo):
        """fetch_by_msn(9999) returns None for unknown MSN."""
        result = await repo.fetch_by_msn(9999)
        assert result is None

    @pytest.mark.asyncio
    async def test_fetch_epr_matrix(self, repo):
        """fetch_epr_matrix returns rows ordered by cycle_ratio."""
        result = await repo.fetch_epr_matrix(1)
        assert len(result) == 2
        assert result[0]["cycle_ratio"] == Decimal("1.0")
        assert result[1]["cycle_ratio"] == Decimal("1.5")

    @pytest.mark.asyncio
    async def test_update_rates(self, repo):
        """update_rates updates specified fields and returns updated row."""
        result = await repo.update_rates(
            1, lease_rent_usd=Decimal("200000.00")
        )
        assert result is not None
        assert result["lease_rent_usd"] == Decimal("200000.00")
