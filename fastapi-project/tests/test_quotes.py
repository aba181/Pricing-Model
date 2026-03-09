"""Integration tests for quote API endpoints (QUOT-01 through QUOT-05).

Wave 0 test stubs: These tests exercise the full HTTP request/response cycle
through the FastAPI app with a mocked database. They will FAIL (RED) until
the quote router is registered in Plan 03.

Covers: create quote, immutability check, list with filters, get detail,
status update, and status update authorization.
"""
from __future__ import annotations

import pytest


async def _login(client, email: str, password: str) -> dict:
    """Helper: login and return cookies dict for subsequent requests."""
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return dict(resp.cookies)


# ---- QUOT-01: Create Quote ----


@pytest.mark.asyncio
async def test_create_quote(async_client, test_admin_user):
    """POST /quotes with valid payload returns 201 + quote_number."""
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    payload = {
        "client_name": "easyJet",
        "client_code": "EZJ",
        "dashboard_state": {
            "projectName": "EZJ Winter 2026",
            "exchangeRate": "0.8500",
            "marginPercent": "12.0",
        },
        "pricing_config_snapshot": {"insurance_usd": "45000.00"},
        "crew_config_snapshot": {"A320": {"pilot_salary_monthly": "12500.00"}},
        "costs_config_snapshot": {"doc_total_budget": "110000.00"},
        "msn_snapshots": [
            {
                "msn": 3055,
                "aircraft_type": "A320",
                "aircraft_id": 1,
                "msn_input": {"mgh": 300, "cycleRatio": "1.0", "crewSets": 4},
                "breakdown": {
                    "aircraft_eur_per_bh": "520.83",
                    "total_cost_per_bh": "2500.00",
                },
                "monthly_pnl": {
                    "months": [
                        {"month": 1, "revenue": "855000.00", "cost": "750000.00"}
                    ]
                },
            }
        ],
    }
    response = await async_client.post("/quotes", json=payload, cookies=cookies)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "quote_number" in data
    assert data["quote_number"].startswith("EZJ-")
    assert data["client_name"] == "easyJet"


# ---- QUOT-02: Immutability ----


@pytest.mark.asyncio
async def test_quote_immutable(async_client, test_admin_user, test_quote):
    """Verify no PUT endpoint exists for updating quote snapshot columns.

    Attempting to PUT on /quotes/{id} should return 405 Method Not Allowed
    (since only PATCH /quotes/{id}/status is provided for status changes).
    """
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    response = await async_client.put(
        "/quotes/1",
        json={"pricing_config_snapshot": {"modified": True}},
        cookies=cookies,
    )
    # No PUT endpoint should exist -- expect 405 Method Not Allowed
    assert response.status_code == 405, (
        f"Expected 405 for PUT on quote (immutability), got {response.status_code}"
    )


# ---- QUOT-03: List Quotes with Search ----


@pytest.mark.asyncio
async def test_list_quotes_filtered(async_client, test_admin_user, test_quote):
    """GET /quotes?search=EZJ returns filtered results matching client code."""
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    response = await async_client.get("/quotes?search=EZJ", cookies=cookies)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    assert len(data["items"]) >= 1
    assert data["items"][0]["client_code"] == "EZJ"


# ---- QUOT-04: Get Quote Detail ----


@pytest.mark.asyncio
async def test_get_quote_detail(
    async_client, test_admin_user, test_quote, test_quote_msn_snapshot
):
    """GET /quotes/{id} returns full quote with msn_snapshots."""
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    response = await async_client.get("/quotes/1", cookies=cookies)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["quote_number"] == "EZJ-001"
    assert "pricing_config_snapshot" in data
    assert "crew_config_snapshot" in data
    assert "dashboard_state" in data
    assert "msn_snapshots" in data
    assert len(data["msn_snapshots"]) >= 1
    assert data["msn_snapshots"][0]["msn"] == 3055


# ---- QUOT-05: Update Status ----


@pytest.mark.asyncio
async def test_update_status(async_client, test_admin_user, test_quote):
    """PATCH /quotes/{id}/status with valid status returns updated quote."""
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    response = await async_client.patch(
        "/quotes/1/status",
        json={"status": "sent"},
        cookies=cookies,
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "sent"


@pytest.mark.asyncio
async def test_update_status_unauthorized(
    async_client, test_admin_user, test_regular_user, test_quote
):
    """PATCH /quotes/{id}/status by non-creator non-admin gets 403.

    test_quote was created by admin (id=1). Regular user (id=2) should
    not be allowed to change the status.
    """
    cookies = await _login(async_client, "user@test.com", "userpass123")
    response = await async_client.patch(
        "/quotes/1/status",
        json={"status": "accepted"},
        cookies=cookies,
    )
    assert response.status_code == 403, (
        f"Expected 403 for non-creator status update, got {response.status_code}"
    )


# ---- QUOT-03 (additional): List by Status ----


@pytest.mark.asyncio
async def test_list_quotes_by_status(async_client, test_admin_user, test_quote):
    """GET /quotes?status=draft returns only draft quotes."""
    cookies = await _login(async_client, "admin@test.com", "adminpass123")
    response = await async_client.get("/quotes?status=draft", cookies=cookies)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, dict)
    assert "items" in data
    for item in data["items"]:
        assert item["status"] == "draft"
