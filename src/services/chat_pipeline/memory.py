from typing import Any

from src.models.conversation import Conversation
from src.models.lead import Lead
from src.models.lead_activity import LeadActivity
from src.models.lead_major_interest import LeadMajorInterest
from src.services.chat_pipeline.types import PipelineState


def load_memory_context(state: PipelineState, db) -> PipelineState:
    lead = db.get(Lead, state.lead_id) if state.lead_id else None
    conversation = db.get(Conversation, state.conversation_id) if state.conversation_id else None

    state.lead_profile = _serialize_lead_profile(lead)
    state.conversation_summary = (conversation.summary or "").strip() if conversation else ""
    state.long_term_memory = {
        "profile": state.lead_profile,
        "major_interests": _load_major_interests(db, lead_id=state.lead_id),
    }
    state.episodic_memory = _load_recent_episodes(
        db,
        lead_id=state.lead_id,
        current_query=state.query,
    )
    state.semantic_memory = [
        {
            "type": "admissions_knowledge_base",
            "description": "Use retrieval tools for factual VinUniversity admissions, program, tuition, scholarship, and timeline details.",
        }
    ]
    state.memory_context = _format_memory_context(
        profile=state.lead_profile,
        profile_follow_up_question=state.profile_follow_up_question,
        summary=state.conversation_summary,
        interests=state.long_term_memory["major_interests"],
        episodes=state.episodic_memory,
    )
    return state


def _serialize_lead_profile(lead: Lead | None) -> dict[str, Any]:
    if lead is None:
        return {}

    fields = [
        "full_name",
        "email",
        "phone",
        "high_school",
        "province",
        "status",
        "temperature",
        "score",
        "gpa",
        "ielts",
        "sat",
        "act",
    ]
    profile: dict[str, Any] = {}
    for field in fields:
        value = getattr(lead, field, None)
        if value in (None, ""):
            continue
        profile[field] = value.value if hasattr(value, "value") else value
    return profile


def _load_major_interests(db, *, lead_id) -> list[dict[str, Any]]:
    if not lead_id:
        return []

    rows = (
        db.query(LeadMajorInterest)
        .filter(LeadMajorInterest.lead_id == lead_id)
        .order_by(LeadMajorInterest.priority.desc())
        .limit(5)
        .all()
    )
    results: list[dict[str, Any]] = []
    for row in rows:
        major = row.major
        results.append(
            {
                "major_id": str(row.major_id),
                "major_code": major.code if major else None,
                "major_name": major.name if major else None,
                "priority": row.priority,
            }
        )
    return results


def _load_recent_episodes(db, *, lead_id, current_query: str | None) -> list[dict[str, Any]]:
    if not lead_id:
        return []

    rows = (
        db.query(LeadActivity)
        .filter(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.desc())
        .limit(8)
        .all()
    )
    results: list[dict[str, Any]] = []
    skipped_current_query = False
    normalized_current_query = (current_query or "").strip()
    for row in rows:
        extra_data = row.extra_data or {}
        if (
            not skipped_current_query
            and row.action == "USER_QUERY"
            and normalized_current_query
            and str(extra_data.get("query") or "").strip() == normalized_current_query
        ):
            skipped_current_query = True
            continue
        results.append(
            {
                "action": row.action,
                "score_delta": row.score_delta,
                "extra_data": extra_data,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )
    return results


def _format_memory_context(
    *,
    profile: dict[str, Any],
    profile_follow_up_question: str | None,
    summary: str,
    interests: list[dict[str, Any]],
    episodes: list[dict[str, Any]],
) -> str:
    sections: list[str] = []
    if profile:
        sections.append("Lead profile:\n" + _format_key_values(profile))
    if profile_follow_up_question:
        sections.append(f"Suggested profile follow-up:\n{profile_follow_up_question}")
    if summary:
        sections.append(f"Conversation summary:\n{summary}")
    if interests:
        lines = []
        for item in interests:
            label = item.get("major_name") or item.get("major_code") or item.get("major_id")
            lines.append(f"- {label} (priority={item.get('priority')})")
        sections.append("Known major interests:\n" + "\n".join(lines))
    if episodes:
        lines = []
        for item in episodes:
            extra = item.get("extra_data") or {}
            query = extra.get("query")
            suffix = f": {query}" if query else ""
            lines.append(f"- {item.get('action')}{suffix}")
        sections.append("Recent lead episodes:\n" + "\n".join(lines))
    sections.append(
        "Semantic memory:\n"
        "- Admissions knowledge is retrieved from the knowledge base only when the router selects retrieval."
    )

    return "\n\n".join(sections) if sections else "No lead memory available."


def _format_key_values(items: dict[str, Any]) -> str:
    lines = []
    for key, value in items.items():
        lines.append(f"- {key}: {value}")
    return "\n".join(lines)
