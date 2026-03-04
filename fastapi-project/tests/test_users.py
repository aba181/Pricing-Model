"""User management endpoint tests covering AUTH-04.

Tests for /admin/users CRUD endpoints gated behind require_admin dependency.
"""
from __future__ import annotations

import pytest


async def test_create_user_as_admin(async_client, test_admin_user):
    """AUTH-04: POST /admin/users creates user when called by admin."""
    # Login as admin
    login_response = await async_client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "adminpass123"},
    )
    assert login_response.status_code == 200
    cookies = {"access_token": login_response.cookies["access_token"]}

    # Create a new user via admin endpoint
    response = await async_client.post(
        "/admin/users",
        json={
            "email": "newuser@test.com",
            "password": "newuserpass123",
            "role": "user",
            "full_name": "New User",
        },
        cookies=cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "user"
    assert "id" in data
    # Ensure hashed_password is not in the response
    assert "hashed_password" not in data


async def test_create_user_forbidden(async_client, test_regular_user):
    """AUTH-04: POST /admin/users returns 403 when called by non-admin."""
    # Login as regular user
    login_response = await async_client.post(
        "/auth/login",
        data={"username": "user@test.com", "password": "userpass123"},
    )
    assert login_response.status_code == 200
    cookies = {"access_token": login_response.cookies["access_token"]}

    # Attempt to create user — should be forbidden
    response = await async_client.post(
        "/admin/users",
        json={
            "email": "forbidden@test.com",
            "password": "somepass123",
        },
        cookies=cookies,
    )
    assert response.status_code == 403
