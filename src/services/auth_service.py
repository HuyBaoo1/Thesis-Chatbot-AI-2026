from fastapi import HTTPException, Request, Response

from src.core.config import settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_fingerprint,
    hash_password,
    verify_password,
)
from src.models.staff import Staff


def build_token_payload(staff: Staff) -> dict:
    return {
        "sub": str(staff.id),
        "name": staff.name,
        "email": staff.email,
        "role": staff.role,
        "pwd": get_password_fingerprint(staff.password),
    }


def public_user_payload(payload: dict) -> dict:
    return {key: value for key, value in payload.items() if key != "pwd"}


def _cookie_samesite() -> str:
    # Browsers reject SameSite=None cookies unless Secure is also enabled.
    # In local HTTP development we fall back to Lax so refresh cookies survive F5.
    return "none" if settings.COOKIE_SECURE else "lax"


def set_access_token_cookie(response: Response, token: str) -> None:
    """Set access_token as HttpOnly cookie for XSS protection."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_cookie_samesite(),
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_cookie_samesite(),
        path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    )


def login(data, response: Response, db):
    staff = db.query(Staff).filter(Staff.email == data.email).first()
    if not staff or not verify_password(data.password, staff.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not staff.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    payload = build_token_payload(staff)
    token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    set_access_token_cookie(response, token)
    set_refresh_cookie(response, refresh_token)
    return {"access_token": token, "user": public_user_payload(payload)}


def refresh_token(request: Request, response: Response, db):
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        raise HTTPException(
            status_code=401,
            detail="Session expired, please log in again",
        )

    payload = decode_token(refresh_token_value)
    if not payload or payload.get("token_type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    staff = db.get(Staff, payload.get("sub"))
    if not staff:
        raise HTTPException(status_code=401, detail="User not found")
    if not staff.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if payload.get("pwd") != get_password_fingerprint(staff.password):
        raise HTTPException(status_code=401, detail="Session is no longer valid")

    token_payload = build_token_payload(staff)
    new_access_token = create_access_token(token_payload)
    new_refresh_token = create_refresh_token(token_payload)
    # Set BOTH cookies - access_token is needed for API calls
    set_access_token_cookie(response, new_access_token)
    set_refresh_cookie(response, new_refresh_token)
    return {"access_token": new_access_token, "user": public_user_payload(token_payload)}


def change_password(data, user, db):
    staff = db.query(Staff).filter(Staff.id == user["sub"]).first()
    if not staff:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.old_password, staff.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    staff.password = hash_password(data.new_password)
    db.commit()
    db.refresh(staff)
    return {"message": "Password changed successfully"}


def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_cookie_samesite(),
        path="/",
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_cookie_samesite(),
        path="/",
    )
    return {"message": "Logged out successfully"}

