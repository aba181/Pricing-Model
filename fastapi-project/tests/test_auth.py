"""Auth endpoint tests covering AUTH-01, AUTH-02, AUTH-03.

Tests for /auth/login, /auth/me, and /auth/logout endpoints.
Each test uses the async_client fixture and test user fixtures from conftest.
"""
from __future__ import annotations

import pytest


async def test_login_success(async_client, test_regular_user):
    """AUTH-01: POST /auth/login returns 200 and sets cookie on valid credentials."""
    response = await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "userpass123"},
    )
    assert response.status_code == 200
    # Check that Set-Cookie header contains access_token with httponly
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "httponly" in set_cookie.lower()


async def test_login_unknown_email(async_client):
    """AUTH-01: POST /auth/login returns 401 'Email not found' for unknown email."""
    response = await async_client.post(
        "/auth/login",
        data={"username": "nobody@test.com", "password": "whatever"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email not found"


async def test_login_wrong_password(async_client, test_regular_user):
    """AUTH-01: POST /auth/login returns 401 'Wrong password' for wrong password."""
    response = await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Wrong password"


async def test_get_me_with_valid_cookie(async_client, test_regular_user):
    """AUTH-02: GET /auth/me returns user data when valid cookie present."""
    # First login to get cookie
    login_response = await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "userpass123"},
    )
    assert login_response.status_code == 200

    # Extract access_token cookie from response and set it on client
    cookies = login_response.cookies
    response = await async_client.get(
        "/auth/me",
        cookies={"access_token": cookies["access_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@test.com"
    assert "id" in data


async def test_get_me_no_cookie(async_client):
    """AUTH-02: GET /auth/me returns 401 when no cookie present."""
    response = await async_client.get("/auth/me")
    assert response.status_code == 401


async def test_logout_clears_cookie(async_client, test_regular_user):
    """AUTH-03: POST /auth/logout clears the access_token cookie."""
    # First login
    await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "userpass123"},
    )

    # Logout
    response = await async_client.post("/auth/logout")
    assert response.status_code == 200

    # Check that the Set-Cookie header clears the cookie
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    # Cookie should be expired (max-age=0 or expires in the past)
    assert 'max-age=0' in set_cookie.lower() or '"0"' in set_cookie
