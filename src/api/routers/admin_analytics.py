from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from src.api.deps import require_role
from src.db import session
from src.models.enums import StaffRole
from src.services import admin_analytics_service


router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])
admin_required = require_role([StaffRole.ADMIN, StaffRole.COUNSELOR])

#
@router.get("/daily")
def get_daily_analytics(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    days: int = Query(default=30, ge=1, le=366),
    limit: int = Query(default=31, ge=1, le=366),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.list_daily_analytics(
        db,
        from_date=from_date,
        to_date=to_date,
        days=days,
        limit=limit,
        offset=offset,
    )

#
@router.get("/daily/summary")
def get_daily_analytics_summary(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    days: int = Query(default=7, ge=1, le=366),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_daily_analytics_summary(
        db,
        from_date=from_date,
        to_date=to_date,
        days=days,
    )

@router.get("/daily/today")
def get_today_analytics(
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_daily_analytic_by_date(db, date.today())


# 
@router.get("/daily/{target_date}")
def get_daily_analytics_by_date(
    target_date: date,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_daily_analytic_by_date(db, target_date)


#
@router.get("/conversation-stats")
def get_conversation_stats(
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_conversation_stats(db)

#
@router.get("/conversion-funnel")
def get_conversion_funnel(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_conversion_funnel(
        db,
        from_date=from_date,
        to_date=to_date,
    )

#
@router.get("/hot-questions/summary")
def get_hot_questions_summary(
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_hot_questions_summary(db)

#
@router.get("/hot-questions")
def get_hot_questions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    intent: str | None = Query(default=None),
    fallback_only: bool | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1),
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.list_hot_questions(
        db,
        limit=limit,
        offset=offset,
        intent=intent,
        fallback_only=fallback_only,
        q=q,
    )

#
@router.get("/hot-questions/{question_id}")
def get_hot_question_detail(
    question_id: UUID,
    user: dict = Depends(admin_required),
    db: session = Depends(session.get_db),
):
    return admin_analytics_service.get_hot_question_detail(db, question_id)

