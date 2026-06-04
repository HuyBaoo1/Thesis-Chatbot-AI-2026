from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer

from src.core.security import decode_token, get_password_fingerprint
from src.db import session
from src.models.staff import Staff


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _resolve_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: session = Depends(session.get_db),
):
    # Prefer cookie-based auth: HttpOnly access_token cookie set by backend
    token_value = request.cookies.get("access_token") or token
    if not token_value:
        return None
    payload = decode_token(token_value)
    if not payload:
        return None
    if payload.get("token_type") != "access":
        return None

    user = db.get(Staff, payload.get("sub"))
    if not user:
        return None
    if not user.is_active:
        return None
    if payload.get("pwd") != get_password_fingerprint(user.password):
        return None

    payload.pop("exp", None)
    payload.pop("token_type", None)
    payload.pop("pwd", None)
    return payload


def get_optional_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: session = Depends(session.get_db),
):
    return _resolve_current_user(request, token, db)


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: session = Depends(session.get_db),
):
    user = _resolve_current_user(request, token, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_role(roles: list):
    def role_checker(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return user

    return role_checker
