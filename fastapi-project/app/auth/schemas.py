from __future__ import annotations

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str  # OAuth2PasswordRequestForm uses 'username' field
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    full_name: str | None
    is_active: bool
