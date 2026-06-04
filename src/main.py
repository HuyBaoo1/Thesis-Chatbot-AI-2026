import asyncio
import logging
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from src.api.router import api_router
from src.core.config import settings
from src.db import session
from src.services.handoff_ai_fallback_scheduler import (
    run_handoff_ai_fallback_scheduler,
)
from src.services.message_chunk_usage_retention_scheduler import (
    run_message_chunk_usage_retention_scheduler,
)
from src.services.semantic_answer_cache_cleanup_scheduler import (
    run_semantic_answer_cache_cleanup_scheduler,
)
from src.services.bootstrap_service import ensure_default_admin
from src.services.realtime import run_redis_realtime_listener
from src.services.telegram_service import start_polling, stop_polling, close_http_client
from src.services.zalo_service import (
    start_polling as start_zalo_polling,
    stop_polling as stop_zalo_polling,
    close_http_client as close_zalo_http_client,
)
from src.db.session import SessionLocal

logger = logging.getLogger(__name__)

_polling_task = None
_zalo_polling_task = None
_realtime_task = None
_retention_task = None
_handoff_ai_fallback_task = None
_semantic_answer_cache_cleanup_task = None


def _ensure_notificationtarget_enum():
    """Add STAFF to notificationtarget enum if missing (idempotent).

    Uses exec_driver_sql on the raw connection to bypass SQLAlchemy's
    transaction wrapping — ALTER TYPE ... ADD VALUE cannot run inside
    a transaction block.
    """
    db = SessionLocal()
    try:
        conn = db.connection()
        conn.exec_driver_sql(
            "ALTER TYPE notificationtarget ADD VALUE IF NOT EXISTS 'STAFF'"
        )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _polling_task, _zalo_polling_task, _realtime_task, _retention_task, _handoff_ai_fallback_task
    global _semantic_answer_cache_cleanup_task
    _ensure_notificationtarget_enum()
    ensure_default_admin()
    _realtime_task = asyncio.create_task(run_redis_realtime_listener())
    _retention_task = asyncio.create_task(run_message_chunk_usage_retention_scheduler())
    _handoff_ai_fallback_task = asyncio.create_task(
        run_handoff_ai_fallback_scheduler()
    )
    _semantic_answer_cache_cleanup_task = asyncio.create_task(
        run_semantic_answer_cache_cleanup_scheduler()
    )
    # Start Telegram polling (optional).
    # NOTE: Telegram getUpdates allows only ONE active consumer. In dev with `--reload`
    # or multi-worker deployments, enabling polling here will cause 409 conflicts.
    if settings.TELEGRAM_POLLING_ENABLED:
        _polling_task = asyncio.create_task(start_polling())
        logger.info("Telegram polling started")
    # Start Zalo polling (optional). Like Telegram getUpdates, do NOT enable this
    # when a webhook is configured — Zalo stops returning updates via getUpdates.
    if settings.ZALO_POLLING_ENABLED:
        _zalo_polling_task = asyncio.create_task(start_zalo_polling())
        logger.info("Zalo polling started")
    yield
    if _realtime_task:
        _realtime_task.cancel()
        try:
            await _realtime_task
        except asyncio.CancelledError:
            pass
    if _retention_task:
        _retention_task.cancel()
        try:
            await _retention_task
        except asyncio.CancelledError:
            pass
    if _handoff_ai_fallback_task:
        _handoff_ai_fallback_task.cancel()
        try:
            await _handoff_ai_fallback_task
        except asyncio.CancelledError:
            pass
    if _semantic_answer_cache_cleanup_task:
        _semantic_answer_cache_cleanup_task.cancel()
        try:
            await _semantic_answer_cache_cleanup_task
        except asyncio.CancelledError:
            pass
    # Shutdown: cancel polling
    if settings.TELEGRAM_POLLING_ENABLED:
        await stop_polling()
        if _polling_task:
            _polling_task.cancel()
            try:
                await _polling_task
            except asyncio.CancelledError:
                pass
        logger.info("Telegram polling stopped")
    if settings.ZALO_POLLING_ENABLED:
        await stop_zalo_polling()
        if _zalo_polling_task:
            _zalo_polling_task.cancel()
            try:
                await _zalo_polling_task
            except asyncio.CancelledError:
                pass
        logger.info("Zalo polling stopped")
    close_http_client()
    close_zalo_http_client()
    logger.info("Telegram & Zalo HTTP clients closed")


async def _fix_scheme(request: Request, call_next):
    """Override request.scheme from X-Forwarded-Proto so redirects use https://."""
    proto = request.headers.get("x-forwarded-proto", "")
    if proto in ("https", "http"):
        request.scope["scheme"] = proto
    return await call_next(request)


app = FastAPI(lifespan=lifespan, redirect_slashes=True)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
# Trust X-Forwarded-* headers so redirects use https:// when behind Railway proxy
app.add_middleware(BaseHTTPMiddleware, dispatch=_fix_scheme)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s %(message)s",
)


class CSRFOriginMiddleware(BaseHTTPMiddleware):
    """Verify Origin header on state-changing requests when SameSite=None.

    When COOKIE_SECURE is True (production), cookies use SameSite=None which
    removes default CSRF protection. This middleware verifies that the Origin
    header matches an explicitly allowed origin for POST/PUT/PATCH/DELETE requests.
    Wildcard origins are rejected. Webhook paths are whitelisted since they come
    from external services without Origin headers.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    WEBHOOK_PATHS = {"/api/telegram/webhook", "/api/zalo/webhook"}

    async def dispatch(self, request: Request, call_next):
        if not settings.COOKIE_SECURE:
            return await call_next(request)

        if request.method in self.SAFE_METHODS:
            return await call_next(request)

        # Whitelist webhook paths — external services don't send Origin.
        # Exact match only to prevent prefix-based bypass.
        if request.url.path in self.WEBHOOK_PATHS:
            return await call_next(request)

        allowed = settings.cors_allow_origins

        # Check Origin header — wildcard is not accepted for CSRF (defeats the purpose)
        origin = request.headers.get("origin")
        if origin:
            if origin in allowed:
                return await call_next(request)
            return Response(status_code=403, content="CSRF: Origin not allowed")

        # No Origin header — block. Referer fallback is intentionally omitted
        # because modern browsers always send Origin on cross-origin state-changing
        # requests. Absence of Origin suggests a non-browser client or legacy env
        # which should not carry SameSite=None cookies anyway.
        return Response(status_code=403, content="CSRF: Origin header required")


# CORS must be outermost (added first = outer in Starlette) to handle
# browser preflight OPTIONS before CSRF middleware checks run.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)
app.add_middleware(CSRFOriginMiddleware)

app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health():
    return {"status": "ok"}
