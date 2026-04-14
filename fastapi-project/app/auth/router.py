from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.config import settings
from app.db.database import get_db
from app.auth.schemas import AzureLoginRequest, UserResponse
from app.auth.service import create_access_token, verify_password
from app.auth.dependencies import get_current_user
from app.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: asyncpg.Connection = Depends(get_db),
):
    """Authenticate user with email/password and set httpOnly JWT cookie."""
    user_repo = UserRepository(db)
    user = await user_repo.fetch_by_email(form_data.username)

    if not user:
        raise HTTPException(status_code=401, detail="Email not found")

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Wrong password")

    token = create_access_token(user["id"], user["role"])

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=7 * 24 * 3600,  # 7 days in seconds
        path="/",
    )
    return {"message": "Logged in"}


@router.post("/logout")
async def logout(response: Response):
    """Clear the access_token cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out"}


@router.post("/azure")
async def azure_login(
    body: AzureLoginRequest,
    response: Response,
    db: asyncpg.Connection = Depends(get_db),
):
    """Create or find an Azure AD user and issue a JWT cookie."""
    user_repo = UserRepository(db)

    # Try to find by azure_id first, then by email
    user = await user_repo.fetch_by_azure_id(body.azure_id)
    if not user:
        user = await user_repo.fetch_by_email(body.email)
        if user:
            # Link existing email user to Azure
            user = await user_repo.update_user(user["id"], azure_id=body.azure_id)
        else:
            # Create new Azure user
            user = await user_repo.create_azure_user(
                email=body.email,
                azure_id=body.azure_id,
                full_name=body.full_name,
            )

    token = create_access_token(user["id"], user["role"])

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/",
    )
    return {"message": "Logged in", "token": token}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current authenticated user's profile."""
    return current_user
