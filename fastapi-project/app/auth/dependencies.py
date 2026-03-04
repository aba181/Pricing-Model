from __future__ import annotations

import asyncpg
from fastapi import Cookie, Depends, HTTPException

from app.db.database import get_db
from app.auth.service import decode_access_token
from app.users.repository import UserRepository


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Extract JWT from cookie, decode it, and return the user dict.

    Raises HTTPException(401) if:
    - No access_token cookie present
    - Token is invalid or expired
    - User ID from token not found in database
    - User account is deactivated
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(access_token)
    user_id = int(payload["sub"])
    user_repo = UserRepository(db)
    user = await user_repo.fetch_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account deactivated")
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has admin role.

    Raises HTTPException(403) if user is not an admin.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
