from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from jwt import PyJWTError
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

ALGORITHM = "HS256"
password_hasher = PasswordHash((Argon2Hasher(), BcryptHasher()))


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(plain_password, password_hash)
    except (TypeError, ValueError):
        return False


def get_password_hash(password: str) -> str:
    return password_hasher.hash(password)


def _create_token(subject: UUID, expires_delta: timedelta, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(subject),
        "type": token_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: UUID) -> str:
    return _create_token(
        subject=subject,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES),
        token_type="access",
    )


def create_refresh_token(subject: UUID) -> str:
    return _create_token(
        subject=subject,
        expires_delta=timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS),
        token_type="refresh",
    )


def decode_token(token: str, expected_type: str = "access") -> UUID:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except PyJWTError as exc:
        raise ValueError("Invalid token") from exc

    if payload.get("type") != expected_type:
        raise ValueError("Invalid token type")

    subject = payload.get("sub")
    if not subject:
        raise ValueError("Missing subject")

    return UUID(subject)
