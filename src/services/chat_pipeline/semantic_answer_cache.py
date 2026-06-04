import hashlib
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from qdrant_client.http import models as rest
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from redis.exceptions import RedisError

from src.core.config import settings
from src.integrations.qdrant_client import qdrant_client
from src.integrations.redis_client import get_redis_client
from src.services import embedding_service
from src.services.chat_pipeline.prompts import synthesis_system_prompt
from src.services.chat_pipeline.types import PipelineState

logger = logging.getLogger(__name__)

_PAYLOAD_KEY_PREFIX = "semantic_answer_cache:payload:"
_PROMPT_VERSION = "v1"
_CACHE_COLLECTION_ENSURED = False
_YEAR_RE = re.compile(r"\b(20\d{2})\b")
_NON_CACHEABLE_ANSWER_PREFIXES = (
    "Hiện tại hệ thống gặp lỗi",
    "Hệ thống đang xử lý nhiều câu hỏi cùng lúc.",
    "Hiện mình chưa tìm thấy nguồn dữ liệu phù hợp",
    "Mình chưa đủ dữ liệu để trả lời chính xác.",
)


def run_semantic_answer_cache_lookup(state: PipelineState) -> PipelineState:
    state.answer_cache_hit = False
    state.answer_cache_id = None
    state.answer_cache_score = None

    if not _can_lookup(state):
        return state

    fingerprint_text = _build_fingerprint_text(state)
    metadata = _build_cache_metadata(state)
    if not fingerprint_text or not metadata.get("evidence_signature"):
        return state

    try:
        vector = embedding_service.generate_embedding(fingerprint_text)
        state.answer_cache_vector = vector
        points = _search_cache_candidates(vector=vector, metadata=metadata)
        for point in points:
            point_payload = getattr(point, "payload", {}) or {}
            cache_id = str(point_payload.get("cache_id") or "")
            score = float(getattr(point, "score", 0.0) or 0.0)
            if score < settings.SEMANTIC_ANSWER_CACHE_SCORE_THRESHOLD:
                continue
            if _is_expired(point_payload.get("expires_at")):
                _delete_cache_point(cache_id)
                continue

            payload = _get_payload_from_redis(cache_id)
            if payload is None:
                _delete_cache_point(cache_id)
                continue
            if _is_expired(payload.get("expires_at")):
                _delete_cache_payload(cache_id)
                _delete_cache_point(cache_id)
                continue

            state.answer = str(payload.get("answer") or "").strip()
            state.confidence = float(payload.get("confidence") or 0.0)
            state.follow_up_suggestions = _coerce_suggestions(
                payload.get("follow_up_suggestions")
            )
            state.answer_cache_hit = True
            state.answer_cache_id = str(payload.get("cache_id") or cache_id)
            state.answer_cache_score = score
            logger.info(
                "semantic_answer_cache_hit intent=%s answer_mode=%s cache_id=%s score=%.4f conversation_id=%s lead_id=%s",
                state.intent,
                state.answer_mode,
                state.answer_cache_id,
                score,
                state.conversation_id,
                state.lead_id,
            )
            return state
    except Exception:
        logger.exception(
            "semantic_answer_cache_lookup_failed conversation_id=%s lead_id=%s",
            state.conversation_id,
            state.lead_id,
        )

    logger.info(
        "semantic_answer_cache_miss intent=%s answer_mode=%s conversation_id=%s lead_id=%s",
        state.intent,
        state.answer_mode,
        state.conversation_id,
        state.lead_id,
    )
    return state


def run_semantic_answer_cache_store(state: PipelineState) -> PipelineState:
    if not _can_store(state):
        return state

    fingerprint_text = _build_fingerprint_text(state)
    metadata = _build_cache_metadata(state)
    if not fingerprint_text or not metadata.get("evidence_signature"):
        return state

    try:
        vector = state.answer_cache_vector or embedding_service.generate_embedding(fingerprint_text)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(
            seconds=max(1, int(settings.SEMANTIC_ANSWER_CACHE_TTL_SECONDS))
        )
        cache_id = _build_cache_id(fingerprint_text=fingerprint_text, metadata=metadata)
        payload = {
            "cache_id": cache_id,
            "answer": state.answer.strip(),
            "confidence": float(state.confidence or 0.0),
            "follow_up_suggestions": state.follow_up_suggestions[:3],
            "intent": state.intent,
            "answer_mode": state.answer_mode,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "prompt_version": _PROMPT_VERSION,
            "model": settings.OPENAI_CHAT_MODEL,
            "evidence_signature": metadata["evidence_signature"],
        }
        metadata["expires_at"] = expires_at.isoformat()

        _store_payload_in_redis(cache_id, payload)
        _upsert_cache_vector(cache_id=cache_id, vector=vector, metadata=metadata)
        logger.info(
            "semantic_answer_cache_store intent=%s answer_mode=%s cache_id=%s conversation_id=%s lead_id=%s",
            state.intent,
            state.answer_mode,
            cache_id,
            state.conversation_id,
            state.lead_id,
        )
    except Exception:
        logger.exception(
            "semantic_answer_cache_store_failed conversation_id=%s lead_id=%s",
            state.conversation_id,
            state.lead_id,
        )

    return state


def _can_lookup(state: PipelineState) -> bool:
    return bool(
        settings.SEMANTIC_ANSWER_CACHE_ENABLED
        and state.answer_mode == "retrieve"
        and state.needs_retrieval
        and state.grounded_prompt.strip()
        and state.context_block.strip()
        and state.reranked
    )


def _can_store(state: PipelineState) -> bool:
    if not settings.SEMANTIC_ANSWER_CACHE_ENABLED:
        return False
    if state.answer_mode != "retrieve" or not state.needs_retrieval:
        return False
    if state.answer_cache_hit:
        return False
    if state.blocked or not state.reranked:
        return False
    answer = (state.answer or "").strip()
    if not answer:
        return False
    if state.confidence < 0.55:
        return False
    if answer.startswith(_NON_CACHEABLE_ANSWER_PREFIXES):
        return False
    return True


def _build_fingerprint_text(state: PipelineState) -> str:
    context = state.resolved_context or {}
    parts = [
        f"intent={state.intent}",
        f"answer_mode={state.answer_mode}",
        f"resolved_query={(state.resolved_query or state.query or '').strip()}",
        f"topic={str(context.get('topic') or '').strip()}",
        f"scope={str(context.get('scope') or '').strip()}",
        f"major_id={str(context.get('major_id') or '').strip()}",
        f"major_name={str(context.get('major_name') or '').strip()}",
        f"level={str(context.get('level') or '').strip()}",
    ]
    year = _extract_year(state)
    if year is not None:
        parts.append(f"year={year}")
    parts.append(f"selected_tools={','.join(state.selected_tools or [])}")
    parts.append(f"evidence_signature={_build_evidence_signature(state)}")
    return "\n".join(parts)


def _build_cache_metadata(state: PipelineState) -> dict[str, Any]:
    context = state.resolved_context or {}
    topic = str(context.get("topic") or "").strip()
    scope = str(context.get("scope") or "").strip()
    major_id = str(context.get("major_id") or "").strip()
    year = _extract_year(state)
    evidence_signature = _build_evidence_signature(state)
    prompt_signature = _prompt_signature()
    return {
        "intent": state.intent,
        "answer_mode": state.answer_mode,
        "topic": topic or None,
        "scope": scope or None,
        "major_id": major_id or None,
        "year": year,
        "evidence_signature": evidence_signature,
        "prompt_signature": prompt_signature,
        "model": settings.OPENAI_CHAT_MODEL,
        "prompt_version": _PROMPT_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_cache_id(*, fingerprint_text: str, metadata: dict[str, Any]) -> str:
    stable_payload = {
        "fingerprint_text": fingerprint_text,
        "intent": metadata["intent"],
        "answer_mode": metadata["answer_mode"],
        "topic": metadata.get("topic"),
        "scope": metadata.get("scope"),
        "major_id": metadata.get("major_id"),
        "year": metadata.get("year"),
        "evidence_signature": metadata["evidence_signature"],
        "prompt_signature": metadata["prompt_signature"],
        "prompt_version": metadata["prompt_version"],
        "model": metadata["model"],
    }
    raw = json.dumps(stable_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _extract_year(state: PipelineState) -> int | None:
    for source in (state.resolved_query, state.query):
        if not source:
            continue
        match = _YEAR_RE.search(source)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass
    years = []
    for item in state.reranked or []:
        year = item.get("year")
        if year in (None, ""):
            continue
        try:
            years.append(int(year))
        except (TypeError, ValueError):
            continue
    unique = sorted(set(years))
    return unique[0] if len(unique) == 1 else None


def _build_evidence_signature(state: PipelineState) -> str:
    fingerprints: list[str] = []
    for item in (state.reranked or [])[:5]:
        chunk_id = str(item.get("chunk_id") or "").strip()
        if chunk_id:
            fingerprints.append(f"chunk:{chunk_id}")
            continue
        tool_payload = item.get("tool_payload") or {}
        major_id = str(tool_payload.get("major_id") or "").strip()
        year = str(item.get("year") or tool_payload.get("year") or "").strip()
        source = str(item.get("source") or "").strip()
        category = str(item.get("category") or "").strip()
        path = str(item.get("path") or "").strip()
        content = str(item.get("content") or "").strip()[:240]
        fingerprints.append(
            json.dumps(
                {
                    "path": path,
                    "source": source,
                    "category": category,
                    "major_id": major_id,
                    "year": year,
                    "content": content,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
    raw = "||".join(fingerprints)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest() if raw else ""


def _prompt_signature() -> str:
    return hashlib.sha256(synthesis_system_prompt().encode("utf-8")).hexdigest()


def _search_cache_candidates(*, vector: list[float], metadata: dict[str, Any]):
    ensure_semantic_answer_cache_collection()
    query_filter = _build_query_filter(metadata)
    result = qdrant_client.query_points(
        collection_name=settings.QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION,
        query=vector,
        query_filter=query_filter,
        limit=max(1, int(settings.SEMANTIC_ANSWER_CACHE_TOP_K)),
        with_payload=True,
    )
    return result.points


def _build_query_filter(metadata: dict[str, Any]) -> Filter:
    must = [
        FieldCondition(key="intent", match=MatchValue(value=metadata["intent"])),
        FieldCondition(key="answer_mode", match=MatchValue(value=metadata["answer_mode"])),
        FieldCondition(
            key="evidence_signature",
            match=MatchValue(value=metadata["evidence_signature"]),
        ),
        FieldCondition(
            key="prompt_signature",
            match=MatchValue(value=metadata["prompt_signature"]),
        ),
        FieldCondition(
            key="prompt_version",
            match=MatchValue(value=metadata["prompt_version"]),
        ),
        FieldCondition(key="model", match=MatchValue(value=metadata["model"])),
    ]

    if metadata.get("topic"):
        must.append(FieldCondition(key="topic", match=MatchValue(value=metadata["topic"])))
    if metadata.get("scope"):
        must.append(FieldCondition(key="scope", match=MatchValue(value=metadata["scope"])))
    if metadata.get("major_id"):
        must.append(FieldCondition(key="major_id", match=MatchValue(value=metadata["major_id"])))
    if metadata.get("year") is not None:
        must.append(FieldCondition(key="year", match=MatchValue(value=metadata["year"])))
    return Filter(must=must)


def _get_payload_from_redis(cache_id: str) -> dict[str, Any] | None:
    if not cache_id:
        return None
    try:
        raw = get_redis_client().get(_payload_key(cache_id))
    except RedisError:
        logger.exception("semantic_answer_cache_payload_get_failed cache_id=%s", cache_id)
        return None
    decoded = _decode_redis_payload(raw)
    if not decoded:
        return None
    try:
        loaded = json.loads(decoded)
        return loaded if isinstance(loaded, dict) else None
    except (json.JSONDecodeError, TypeError, ValueError):
        logger.warning("semantic_answer_cache_payload_invalid_json cache_id=%s", cache_id)
        return None


def _delete_cache_payload(cache_id: str) -> None:
    if not cache_id:
        return
    try:
        get_redis_client().delete(_payload_key(cache_id))
    except RedisError:
        logger.exception("semantic_answer_cache_payload_delete_failed cache_id=%s", cache_id)


def _store_payload_in_redis(cache_id: str, payload: dict[str, Any]) -> None:
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    get_redis_client().setex(
        _payload_key(cache_id),
        max(1, int(settings.SEMANTIC_ANSWER_CACHE_TTL_SECONDS)),
        encoded,
    )


def _upsert_cache_vector(*, cache_id: str, vector: list[float], metadata: dict[str, Any]) -> None:
    ensure_semantic_answer_cache_collection()
    point = PointStruct(
        id=_point_id(cache_id),
        vector=vector,
        payload={"cache_id": cache_id, **metadata},
    )
    qdrant_client.upsert(
        collection_name=settings.QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION,
        points=[point],
    )


def _delete_cache_point(cache_id: str) -> None:
    if not cache_id:
        return
    try:
        qdrant_client.delete(
            collection_name=settings.QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION,
            points_selector=rest.PointIdsList(points=[_point_id(cache_id)]),
        )
    except Exception:
        logger.exception("semantic_answer_cache_point_delete_failed cache_id=%s", cache_id)


def ensure_semantic_answer_cache_collection() -> None:
    global _CACHE_COLLECTION_ENSURED
    if _CACHE_COLLECTION_ENSURED:
        return
    collection_name = settings.QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION
    collections = qdrant_client.get_collections().collections
    names = {collection.name for collection in collections}
    if collection_name not in names:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
    _ensure_payload_indexes(collection_name)
    _CACHE_COLLECTION_ENSURED = True


def _ensure_payload_indexes(collection_name: str) -> None:
    keyword_fields = (
        "intent",
        "answer_mode",
        "topic",
        "scope",
        "major_id",
        "evidence_signature",
        "prompt_signature",
        "prompt_version",
        "model",
    )
    for field_name in keyword_fields:
        qdrant_client.create_payload_index(
            collection_name=collection_name,
            field_name=field_name,
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )

    qdrant_client.create_payload_index(
        collection_name=collection_name,
        field_name="year",
        field_schema=rest.PayloadSchemaType.INTEGER,
    )
    qdrant_client.create_payload_index(
        collection_name=collection_name,
        field_name="expires_at",
        field_schema=rest.PayloadSchemaType.DATETIME,
    )


def _payload_key(cache_id: str) -> str:
    return f"{_PAYLOAD_KEY_PREFIX}{cache_id}"


def _point_id(cache_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, cache_id))


def _decode_redis_payload(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return None
    if isinstance(value, str):
        return value
    return str(value)


def _is_expired(value: Any) -> bool:
    if not value:
        return False
    try:
        expires_at = datetime.fromisoformat(str(value))
    except ValueError:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


def _coerce_suggestions(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned = [str(item).strip() for item in value if str(item).strip()]
    return cleaned[:3]
