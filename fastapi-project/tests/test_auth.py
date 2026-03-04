"""Auth endpoint tests covering AUTH-01, AUTH-02, AUTH-03.

These are stub tests for Wave 0. Each test is skipped because the auth
endpoints do not exist yet -- Plan 02 will implement the endpoints and
make these tests pass.
"""
from __future__ import annotations

import pytest


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_login_success(async_client, test_regular_user):
    """AUTH-01: POST /auth/login returns 200 and sets cookie on valid credentials."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_login_unknown_email(async_client):
    """AUTH-01: POST /auth/login returns 401 'Email not found' for unknown email."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_login_wrong_password(async_client, test_regular_user):
    """AUTH-01: POST /auth/login returns 401 'Wrong password' for wrong password."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_get_me_with_valid_cookie(async_client, test_regular_user):
    """AUTH-02: GET /auth/me returns user data when valid cookie present."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_get_me_no_cookie(async_client):
    """AUTH-02: GET /auth/me returns 401 when no cookie present."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_logout_clears_cookie(async_client, test_regular_user):
    """AUTH-03: POST /auth/logout clears the access_token cookie."""
    raise NotImplementedError
