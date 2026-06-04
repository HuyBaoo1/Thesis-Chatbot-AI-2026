from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_

from src.models.daily_analytic import DailyAnalytic
from src.models.enums import LeadStatus, LeadTemperature
from src.models.faq_analytics import FAQAnalytics
from src.models.lead import Lead
from src.models.lead_activity import LeadActivity
from src.models.lead_major_interest import LeadMajorInterest
from src.models.conversation import Conversation


def list_daily_analytics(
    db,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    days: int = 30,
    limit: int = 31,
    offset: int = 0,
):
    start_date, end_date = _resolve_date_range(
        from_date=from_date,
        to_date=to_date,
        days=days,
    )
    normalized_limit = max(1, min(limit, 366))
    normalized_offset = max(0, offset)
    query = (
        db.query(DailyAnalytic)
        .filter(DailyAnalytic.date >= start_date)
        .filter(DailyAnalytic.date <= end_date)
    )
    total = query.count()
    rows = (
        query
        .order_by(DailyAnalytic.date.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": [_serialize_daily_analytic(row) for row in rows],
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "from": start_date,
        "to": end_date,
        "has_more": normalized_offset + len(rows) < total,
    }


def get_daily_analytics_summary(
    db,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    days: int = 1,
):
    start_date, end_date = _resolve_date_range(
        from_date=from_date,
        to_date=to_date,
        days=days,
    )
    rows = (
        db.query(DailyAnalytic)
        .filter(DailyAnalytic.date >= start_date)
        .filter(DailyAnalytic.date <= end_date)
        .all()
    )
    total_chats = sum(int(row.total_chats or 0) for row in rows)
    new_leads = sum(int(row.new_leads or 0) for row in rows)
    fallbacks = sum(int(row.fallbacks or 0) for row in rows)
    top_intents: dict[str, int] = {}

    for row in rows:
        for intent, count in (row.top_intents or {}).items():
            top_intents[str(intent)] = top_intents.get(str(intent), 0) + int(count or 0)

    sorted_intents = sorted(top_intents.items(), key=lambda item: item[1], reverse=True)
    return {
        "from": start_date,
        "to": end_date,
        "days": (end_date - start_date).days + 1,
        "active_days": len(rows),
        "total_chats": total_chats,
        "new_leads": new_leads,
        "fallbacks": fallbacks,
        "fallback_rate": round(fallbacks / total_chats, 4) if total_chats else 0.0,
        "top_intents": [
            {"intent": intent, "count": count}
            for intent, count in sorted_intents[:10]
        ],
    }


def get_daily_analytic_by_date(db, target_date: date):
    row = db.query(DailyAnalytic).filter(DailyAnalytic.date == target_date).first()
    if not row:
        return _empty_daily_analytic(target_date)
    return _serialize_daily_analytic(row)


def get_lead_score_history(db, lead_id: UUID):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    rows = (
        db.query(LeadActivity)
        .filter(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.asc())
        .all()
    )
    running_score = 0
    items = []
    for row in rows:
        running_score = max(0, min(100, running_score + int(row.score_delta or 0)))
        items.append(
            {
                "id": row.id,
                "action": row.action,
                "score_delta": row.score_delta,
                "running_activity_score": running_score,
                "extra_data": row.extra_data or {},
                "created_at": row.created_at,
            }
        )
    return {
        "lead_id": lead.id,
        "current_score": lead.score,
        "temperature": lead.temperature.value if lead.temperature else None,
        "items": items,
        "total": len(items),
    }


def get_conversation_stats(db):
    total = db.query(Conversation).count()
    by_status = (
        db.query(Conversation.status, func.count(Conversation.id))
        .group_by(Conversation.status)
        .all()
    )
    by_channel = (
        db.query(Conversation.channel, func.count(Conversation.id))
        .group_by(Conversation.channel)
        .all()
    )
    return {
        "total": total,
        "by_status": [
            {"status": status.value if status else None, "count": count}
            for status, count in by_status
        ],
        "by_channel": [
            {"channel": channel.value if channel else None, "count": count}
            for channel, count in by_channel
        ],
    }


def get_conversion_funnel(
    db,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
):
    # Each stage issues a separate COUNT query. At university-admissions scale
    # (<100K leads) with indexed columns, 7 simple counts complete in <100ms.
    # Conditional aggregation (CASE … COUNT) would reduce round-trips but makes
    # the code harder to read and maintain for negligible real-world gain.
    base = db.query(Lead)
    if from_date:
        base = base.filter(Lead.created_at >= from_date)
    if to_date:
        base = base.filter(Lead.created_at <= to_date)

    total_leads = base.count()
    with_contact = (
        base.filter(or_(Lead.email.isnot(None), Lead.phone.isnot(None))).count()
    )
    interacted = (
        base.filter(Lead.last_interaction_at.isnot(None)).count()
    )
    # This stage joins LeadMajorInterest which requires DISTINCT and a different
    # query root — it cannot reuse the `base` Lead query directly like the others.
    interested_base = (
        db.query(LeadMajorInterest.lead_id)
        .join(Lead, LeadMajorInterest.lead_id == Lead.id)
    )
    if from_date:
        interested_base = interested_base.filter(Lead.created_at >= from_date)
    if to_date:
        interested_base = interested_base.filter(Lead.created_at <= to_date)
    interested = interested_base.distinct().count()
    hot = base.filter(Lead.temperature == LeadTemperature.HOT).count()
    assigned = base.filter(Lead.assigned_staff_id.isnot(None)).count()
    contacted = base.filter(Lead.status != LeadStatus.NEW).count()

    stages = [
        {"stage": "lead_created", "count": total_leads},
        {"stage": "contact_collected", "count": with_contact},
        {"stage": "chat_interacted", "count": interacted},
        {"stage": "interest_detected", "count": interested},
        {"stage": "hot_lead", "count": hot},
        {"stage": "assigned", "count": assigned},
        {"stage": "contacted_or_later", "count": contacted},
    ]
    previous = None
    for item in stages:
        item["conversion_from_previous"] = (
            round(item["count"] / previous, 4)
            if previous
            else None
        )
        previous = item["count"]
    return {"stages": stages}


def get_hot_questions_summary(db):
    total_questions = db.query(FAQAnalytics).count()
    total_asks = db.query(func.coalesce(func.sum(FAQAnalytics.count), 0)).scalar() or 0
    fallback_questions = (
        db.query(FAQAnalytics)
        .filter(FAQAnalytics.is_fallback.is_(True))
        .count()
    )
    fallback_asks = (
        db.query(func.coalesce(func.sum(FAQAnalytics.count), 0))
        .filter(FAQAnalytics.is_fallback.is_(True))
        .scalar()
        or 0
    )
    top_intents = (
        db.query(
            FAQAnalytics.intent,
            func.coalesce(func.sum(FAQAnalytics.count), 0).label("count"),
        )
        .filter(FAQAnalytics.intent.isnot(None))
        .group_by(FAQAnalytics.intent)
        .order_by(func.coalesce(func.sum(FAQAnalytics.count), 0).desc())
        .limit(10)
        .all()
    )
    return {
        "total_questions": total_questions,
        "total_asks": int(total_asks),
        "fallback_questions": fallback_questions,
        "fallback_asks": int(fallback_asks),
        "top_intents": [
            {"intent": intent, "count": int(count or 0)}
            for intent, count in top_intents
        ],
    }


def list_hot_questions(
    db,
    *,
    limit: int = 20,
    offset: int = 0,
    intent: str | None = None,
    fallback_only: bool | None = None,
    q: str | None = None,
):
    normalized_limit = max(1, min(limit, 100))
    normalized_offset = max(0, offset)
    query = db.query(FAQAnalytics)

    if intent:
        query = query.filter(FAQAnalytics.intent == intent)
    if fallback_only is not None:
        query = query.filter(FAQAnalytics.is_fallback.is_(fallback_only))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                FAQAnalytics.question.ilike(pattern),
                FAQAnalytics.normalized.ilike(pattern),
                FAQAnalytics.intent.ilike(pattern),
            )
        )

    total = query.count()
    rows = (
        query
        .order_by(FAQAnalytics.count.desc(), FAQAnalytics.last_asked_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": [_serialize_faq_question(row) for row in rows],
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(rows) < total,
    }


def get_hot_question_detail(db, question_id: UUID):
    row = db.get(FAQAnalytics, question_id)
    if not row:
        raise HTTPException(status_code=404, detail="Hot question not found")
    return _serialize_faq_question(row)


def _serialize_faq_question(row: FAQAnalytics) -> dict:
    return {
        "id": row.id,
        "question": row.question,
        "normalized": row.normalized,
        "intent": row.intent,
        "count": row.count,
        "is_fallback": row.is_fallback,
        "last_conversation_id": row.last_conversation_id,
        "last_user_message_id": row.last_user_message_id,
        "last_assistant_message_id": row.last_assistant_message_id,
        "last_asked_at": row.last_asked_at,
        "created_at": row.created_at,
    }


def _resolve_date_range(
    *,
    from_date: date | None,
    to_date: date | None,
    days: int,
) -> tuple[date, date]:
    end_date = to_date or date.today()
    if from_date is not None:
        start_date = from_date
    else:
        safe_days = max(1, min(days, 366))
        start_date = end_date - timedelta(days=safe_days - 1)
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="'from' date must be before or equal to 'to' date")
    return start_date, end_date


def _serialize_daily_analytic(row: DailyAnalytic) -> dict:
    return {
        "id": row.id,
        "date": row.date,
        "total_chats": int(row.total_chats or 0),
        "new_leads": int(row.new_leads or 0),
        "fallbacks": int(row.fallbacks or 0),
        "fallback_rate": round((row.fallbacks or 0) / (row.total_chats or 1), 4) if row.total_chats else 0.0,
        "top_intents": row.top_intents or {},
    }


def _empty_daily_analytic(target_date: date) -> dict:
    return {
        "id": None,
        "date": target_date,
        "total_chats": 0,
        "new_leads": 0,
        "fallbacks": 0,
        "fallback_rate": 0.0,
        "top_intents": {},
    }
