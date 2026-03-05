"""Wave 0 test stubs for aircraft API (ACFT-01 through ACFT-04).

All tests are skipped — Plan 02 (API router) will unskip and implement them.
These stubs define the expected behavior for the aircraft endpoints that will
be built in Phase 2, Plan 02.
"""
from __future__ import annotations

import pytest


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_list_aircraft(async_client, test_admin_user, test_aircraft_data):
    """GET /aircraft returns list of aircraft with rates.

    Expected: 200 OK with JSON array of aircraft objects, each containing
    id, msn, aircraft_type, registration, and fixed rate fields.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_search_aircraft_by_msn(async_client, test_admin_user, test_aircraft_data):
    """GET /aircraft?search=3055 returns filtered results by MSN substring.

    Expected: 200 OK with only aircraft whose MSN contains '3055'.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_search_aircraft_by_registration(async_client, test_admin_user, test_aircraft_data):
    """GET /aircraft?search=LZ returns filtered results by registration substring.

    Expected: 200 OK with only aircraft whose registration contains 'LZ'.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_get_aircraft_detail(async_client, test_admin_user, test_aircraft_data):
    """GET /aircraft/{msn} returns full detail with EPR matrix.

    Expected: 200 OK with full aircraft object including all rate fields,
    escalation rates, and epr_matrix array.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_get_aircraft_not_found(async_client, test_admin_user):
    """GET /aircraft/9999 returns 404 for unknown MSN.

    Expected: 404 Not Found with detail message.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_update_rates_as_admin(async_client, test_admin_user, test_aircraft_data):
    """PUT /aircraft/{msn}/rates updates rates (admin user).

    Expected: 200 OK with updated aircraft detail. Admin can modify
    any rate field via partial update.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_update_rates_forbidden(async_client, test_regular_user, test_aircraft_data):
    """PUT /aircraft/{msn}/rates returns 403 for non-admin.

    Expected: 403 Forbidden. Only admin role can update rates.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_update_rates_reflected(async_client, test_admin_user, test_aircraft_data):
    """Updated rates are returned in subsequent GET.

    Expected: After PUT to update lease_rent_usd, GET /aircraft/{msn}
    returns the new value.
    """
    pass


@pytest.mark.skip("Wave 0 -- Plan 02 will unskip")
async def test_seed_data_present(test_aircraft_data):
    """Verifies seed data structure is correct.

    Expected: test_aircraft_data fixture provides 2 aircraft with
    rates and EPR matrix rows. Data uses Decimal types.
    """
    pass
