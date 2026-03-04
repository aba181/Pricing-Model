from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import HTTPException
from pwdlib import PasswordHash

from app.config import settings

# Module-level password hasher — Argon2 by default (IETF-recommended)
password_hash = PasswordHash.recommended()

SECRET_KEY = settings.jwt_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT with sub=str(user_id), role, and 7-day expiry."""
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT. Raises HTTPException(401) on any error."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plaintext password against its Argon2 hash."""
    return password_hash.verify(plain, hashed)


def hash_password(plain: str) -> str:
    """Hash a plaintext password using Argon2."""
    return password_hash.hash(plain)
