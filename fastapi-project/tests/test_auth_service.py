"""Unit tests for auth service functions (Task 1 TDD RED).

Tests create_access_token, decode_access_token, verify_password, hash_password
without requiring a database connection.
"""
from __future__ import annotations

import pytest


def test_create_access_token_returns_string():
    """create_access_token(user_id, role) returns a non-empty JWT string."""
    from app.auth.service import create_access_token

    token = create_access_token(1, "admin")
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_access_token_returns_payload():
    """decode_access_token(token) returns dict with 'sub' and 'role' keys."""
    from app.auth.service import create_access_token, decode_access_token

    token = create_access_token(42, "user")
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "user"


def test_decode_access_token_invalid_raises():
    """decode_access_token raises HTTPException(401) on invalid token."""
    from fastapi import HTTPException
    from app.auth.service import decode_access_token

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("not-a-valid-token")
    assert exc_info.value.status_code == 401


def test_hash_and_verify_password_roundtrip():
    """hash_password + verify_password round-trip returns True."""
    from app.auth.service import hash_password, verify_password

    hashed = hash_password("testpassword123")
    assert isinstance(hashed, str)
    assert hashed != "testpassword123"
    assert verify_password("testpassword123", hashed) is True


def test_verify_password_wrong_returns_false():
    """verify_password returns False for wrong password."""
    from app.auth.service import hash_password, verify_password

    hashed = hash_password("correctpassword")
    assert verify_password("wrongpassword", hashed) is False
