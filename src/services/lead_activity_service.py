from uuid import UUID

from src.models.lead_activity import LeadActivity
from src.services.lead_service import get_lead_or_404, recompute_lead_scoring


def create_lead_activity(
    db,
    *,
    lead_id: UUID,
    action: str,
    score_delta: int = 0,
    extra_data: dict | None = None,
    auto_commit: bool = True,
) -> LeadActivity:
    get_lead_or_404(db, lead_id)
    activity = LeadActivity(
        lead_id=lead_id,
        action=action,
        score_delta=score_delta,
        extra_data=extra_data or {},
    )
    db.add(activity)
    if auto_commit:
        db.flush()
        recompute_lead_scoring(db, lead_id=lead_id, auto_commit=False)
        db.commit()
        db.refresh(activity)
    else:
        db.flush()
    return activity


def record_chat_turn_activity(
    db,
    *,
    lead_id: UUID,
    intent: str,
    answer_mode: str,
    is_fallback: bool,
    blocked: bool = False,
    query: str | None = None,
    auto_commit: bool = True,
) -> LeadActivity | None:
    if blocked:
        return create_lead_activity(
            db,
            lead_id=lead_id,
            action="BLOCKED_QUERY",
            score_delta=-5,
            extra_data={"query": query},
            auto_commit=auto_commit,
        )

    if answer_mode == "handoff":
        return create_lead_activity(
            db,
            lead_id=lead_id,
            action="HANDOFF_REQUESTED",
            score_delta=1,
            extra_data={"intent": intent},
            auto_commit=auto_commit,
        )

    if answer_mode in {"direct", "history", "clarify"}:
        return None

    if is_fallback:
        return create_lead_activity(
            db,
            lead_id=lead_id,
            action="FALLBACK_ANSWER",
            score_delta=-2,
            extra_data={"intent": intent},
            auto_commit=auto_commit,
        )

    if answer_mode == "retrieve":
        return create_lead_activity(
            db,
            lead_id=lead_id,
            action="ANSWERED_SUCCESS",
            score_delta=3,
            extra_data={"intent": intent},
            auto_commit=auto_commit,
        )

    return None


def list_lead_activities(
    db,
    *,
    lead_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    get_lead_or_404(db, lead_id)
    normalized_limit = max(1, min(limit, 200))
    normalized_offset = max(0, offset)
    query = db.query(LeadActivity).filter(LeadActivity.lead_id == lead_id)
    total = query.count()
    rows = (
        query
        .order_by(LeadActivity.created_at.desc())
        .offset(normalized_offset)
        .limit(normalized_limit)
        .all()
    )
    return {
        "items": rows,
        "total": total,
        "limit": normalized_limit,
        "offset": normalized_offset,
        "has_more": normalized_offset + len(rows) < total,
    }
