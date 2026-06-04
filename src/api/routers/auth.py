from fastapi import APIRouter, Depends, Request, Response

from src.api.deps import get_current_user
from src.core.config import settings
from src.db import session
from src.schemas.auth import ChangePassword, StaffLogin
from src.services import auth_service
from src.services.rate_limit_service import check_rate_limit


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(
    request: Request,
    data: StaffLogin,
    response: Response,
    db: session = Depends(session.get_db),
):
    check_rate_limit(
        request=request,
        scope="auth:login:ip",
        identifier=None,
        limit=5,
        window_seconds=60,
    )
    check_rate_limit(
        request=request,
        scope="auth:login:email",
        identifier=f"email:{data.email}",
        limit=10,
        window_seconds=3600,
    )
    return auth_service.login(data, response, db)


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user


@router.post("/refresh-token")
def refresh_token(
    request: Request,
    response: Response,
    db: session = Depends(session.get_db),
):
    return auth_service.refresh_token(request, response, db)


@router.patch("/change-password")
def change_password(
    data: ChangePassword,
    user=Depends(get_current_user),
    db: session = Depends(session.get_db),
):
    return auth_service.change_password(data, user, db)


@router.post("/logout")
def logout(response: Response):
    return auth_service.logout(response)
