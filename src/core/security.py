from datetime import datetime, timedelta, timezone
from hashlib import sha256

from jose import jwt
from passlib.context import CryptContext

from src.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_fingerprint(hashed_password: str) -> str:
    return sha256(hashed_password.encode("utf-8")).hexdigest()


def _create_token(data: dict, *, expires_minutes: int, token_type: str):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes
    )
    to_encode.update({"exp": expire, "token_type": token_type})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_access_token(data: dict):
    return _create_token(
        data,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type="access",
    )


def create_refresh_token(data: dict):
    return _create_token(
        data,
        expires_minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        token_type="refresh",
    )


def create_conversation_access_token(data: dict):
    return _create_token(
        data,
        expires_minutes=settings.CONVERSATION_ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type="conversation_access",
    )


def decode_token(token: str):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.JWTError:
        return None
