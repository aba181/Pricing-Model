"""User management endpoint tests covering AUTH-04.

These are stub tests for Wave 0. Each test is skipped because the user
management endpoints do not exist yet -- Plan 02 will implement the
endpoints and make these tests pass.
"""
from __future__ import annotations

import pytest


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_create_user_as_admin(async_client, test_admin_user):
    """AUTH-04: POST /admin/users creates user when called by admin."""
    raise NotImplementedError


@pytest.mark.skip(reason="endpoint not yet implemented -- Plan 02")
async def test_create_user_forbidden(async_client, test_regular_user):
    """AUTH-04: POST /admin/users returns 403 when called by non-admin."""
    raise NotImplementedError
