import re
import unicodedata
from datetime import datetime
from uuid import UUID

from src.models.faq_analytics import FAQAnalytics
from src.services import embedding_service, qdrant_service


FAQ_SIMILARITY_THRESHOLD = 0.86
MIN_SEMANTIC_QUESTION_CHARS = 12
MIN_SEMANTIC_QUESTION_WORDS = 3
SEMANTIC_TRACKING_INTENTS = {
    "tuition_lookup",
    "scholarship_lookup",
    "timeline_process",
    "admission_requirement",
    "program_info",
    "school_info",
}
LOW_VALUE_QUESTIONS = {
    "ok",
    "oke",
    "yes",
    "no",
    "có",
    "không",
    "khong",
    "thanks",
    "thank you",
    "cảm ơn",
    "cam on",
    "rồi",
    "roi",
}


def normalize_question(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = _normalize_common_question_typos(normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def track_question(
    db,
    *,
    question: str,
    intent: str,
    is_fallback: bool,
    conversation_id: UUID | None = None,
    user_message_id: UUID | None = None,
    assistant_message_id: UUID | None = None,
    auto_commit: bool = True,
) -> FAQAnalytics:
    normalized = normalize_question(question)
    item = db.query(FAQAnalytics).filter(FAQAnalytics.normalized == normalized).first()

    if not item:
        item = _find_canonical_question_match(db, normalized=normalized)

    vector = _try_generate_embedding(question) if _should_use_semantic_tracking(normalized, intent) else None
    if item:
        _update_existing_question(
            item,
            question=question,
            normalized=normalized,
            intent=intent,
            is_fallback=is_fallback,
            conversation_id=conversation_id,
            user_message_id=user_message_id,
            assistant_message_id=assistant_message_id,
        )
    elif vector:
        item = _find_semantic_match(db, vector=vector, intent=intent)
        if item:
            _update_existing_question(
                item,
                question=question,
                normalized=normalized,
                intent=intent,
                is_fallback=is_fallback,
                conversation_id=conversation_id,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
            )

    if not item:
        item = FAQAnalytics(
            question=question.strip(),
            normalized=normalized,
            intent=intent,
            count=1,
            is_fallback=is_fallback,
            last_conversation_id=conversation_id,
            last_user_message_id=user_message_id,
            last_assistant_message_id=assistant_message_id,
        )
        db.add(item)
        db.flush()

    if vector:
        _safe_upsert_faq_vector(item, vector=vector)

    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item


def _normalize_common_question_typos(value: str) -> str:
    replacements = {
        r"\bnghanh\b": "nganh",
        r"\bnghanhs\b": "nganh",
        r"\bsau dao hoc\b": "sau dai hoc",
        r"\bthac sy\b": "thac si",
        r"\bvin\s+uni\b": "vinuni",
        r"\bviuni\b": "vinuni",
        r"\bvinuniversity\b": "vinuni",
        r"\bvin\s+university\b": "vinuni",
    }
    normalized = value
    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)
    return normalized


def _find_canonical_question_match(db, *, normalized: str) -> FAQAnalytics | None:
    for item in db.query(FAQAnalytics).all():
        if normalize_question(item.normalized) == normalized:
            return item
        if normalize_question(item.question) == normalized:
            return item
    return None


def _find_semantic_match(db, *, vector: list[float], intent: str) -> FAQAnalytics | None:
    try:
        points = qdrant_service.search_faq_vectors(vector=vector, intent=intent, limit=1)
    except Exception:
        return None

    if not points:
        return None

    point = points[0]
    score = float(getattr(point, "score", 0.0) or 0.0)
    if score < FAQ_SIMILARITY_THRESHOLD:
        return None

    payload = point.payload or {}
    faq_id = payload.get("faq_id") or getattr(point, "id", None)
    if not faq_id:
        return None

    try:
        return db.get(FAQAnalytics, UUID(str(faq_id)))
    except (TypeError, ValueError):
        return None


def _update_existing_question(
    item: FAQAnalytics,
    *,
    question: str,
    normalized: str,
    intent: str,
    is_fallback: bool,
    conversation_id: UUID | None,
    user_message_id: UUID | None,
    assistant_message_id: UUID | None,
) -> None:
    item.question = question.strip()
    item.normalized = normalized
    item.intent = intent
    item.count = (item.count or 0) + 1
    item.is_fallback = is_fallback
    item.last_conversation_id = conversation_id
    item.last_user_message_id = user_message_id
    item.last_assistant_message_id = assistant_message_id
    item.last_asked_at = datetime.utcnow()


def _safe_upsert_faq_vector(item: FAQAnalytics, *, vector: list[float]) -> None:
    try:
        qdrant_service.upsert_faq_vector(
            item.id,
            vector,
            {
                "faq_id": str(item.id),
                "question": item.question,
                "normalized": item.normalized,
                "intent": item.intent,
                "count": item.count,
                "is_fallback": item.is_fallback,
                "last_conversation_id": (
                    str(item.last_conversation_id)
                    if item.last_conversation_id
                    else None
                ),
                "last_user_message_id": (
                    str(item.last_user_message_id)
                    if item.last_user_message_id
                    else None
                ),
                "last_assistant_message_id": (
                    str(item.last_assistant_message_id)
                    if item.last_assistant_message_id
                    else None
                ),
            },
        )
    except Exception:
        return


def _try_generate_embedding(question: str) -> list[float] | None:
    try:
        return embedding_service.generate_embedding(question)
    except Exception:
        return None


def _should_use_semantic_tracking(normalized: str, intent: str) -> bool:
    if not normalized:
        return False
    if intent not in SEMANTIC_TRACKING_INTENTS:
        return False
    if normalized in LOW_VALUE_QUESTIONS:
        return False
    if len(normalized) < MIN_SEMANTIC_QUESTION_CHARS:
        return False
    if len(normalized.split()) < MIN_SEMANTIC_QUESTION_WORDS:
        return False
    return True
