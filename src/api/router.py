from fastapi import APIRouter

from src.api.routers import (
    admin_analytics,
    application,
    auth,
    chat,
    knowledge_chunk,
    lead,
    major,
    notification,
    ocr_quick,
    realtime,
    scholarship_policy,
    staff,
    telegram,
    tuition_policy,
    crawl,
    zalo,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(lead.router)
api_router.include_router(application.router)
api_router.include_router(notification.router)
api_router.include_router(realtime.router)
api_router.include_router(staff.router)
api_router.include_router(major.router)
api_router.include_router(tuition_policy.router)
api_router.include_router(scholarship_policy.router)
api_router.include_router(knowledge_chunk.router)
api_router.include_router(telegram.router)
api_router.include_router(zalo.router)
api_router.include_router(ocr_quick.router)
api_router.include_router(crawl.router)
