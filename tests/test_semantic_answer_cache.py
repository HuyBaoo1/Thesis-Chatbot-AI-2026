import json
from types import SimpleNamespace

import pytest

from src.services.chat_pipeline import semantic_answer_cache as cache
from src.services.chat_pipeline.types import PipelineState


_ENGLISH_PROMPT = "- Required response language: English for this answer."
_FUTURE_EXPIRY = "2999-01-01T00:00:00+00:00"


class _FakePoint:
    def __init__(self, payload: dict, score: float = 1.0):
        self.payload = payload
        self.score = score


class _FakeQdrant:
    def __init__(self):
        self.points: list[_FakePoint] = []
        self.upserts: list = []
        self.last_filter_values: dict = {}

    def query_points(self, *, query_filter, limit, **kwargs):
        self.last_filter_values = _filter_values(query_filter)
        matches = [
            point
            for point in self.points
            if all(point.payload.get(key) == value for key, value in self.last_filter_values.items())
        ]
        return SimpleNamespace(points=matches[:limit])

    def upsert(self, *, points, **kwargs):
        self.upserts.extend(points)


class _FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def get(self, key: str):
        return self.store.get(key)

    def setex(self, key: str, ttl: int, value: str):
        self.store[key] = value

    def delete(self, key: str):
        self.store.pop(key, None)


@pytest.fixture()
def cache_env(monkeypatch):
    fake_qdrant = _FakeQdrant()
    fake_redis = _FakeRedis()
    fake_settings = SimpleNamespace(
        SEMANTIC_ANSWER_CACHE_ENABLED=True,
        SEMANTIC_ANSWER_CACHE_SCORE_THRESHOLD=0.92,
        SEMANTIC_ANSWER_CACHE_TOP_K=5,
        SEMANTIC_ANSWER_CACHE_TTL_SECONDS=43_200,
        QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION="semantic_answer_cache",
        EMBEDDING_DIMENSION=3,
        OPENAI_CHAT_MODEL="test-model",
    )

    monkeypatch.setattr(cache, "settings", fake_settings)
    monkeypatch.setattr(cache.embedding_service, "generate_embedding", lambda text: [0.1, 0.2, 0.3])
    monkeypatch.setattr(cache, "qdrant_client", fake_qdrant)
    monkeypatch.setattr(cache, "get_redis_client", lambda: fake_redis)
    monkeypatch.setattr(cache, "ensure_semantic_answer_cache_collection", lambda: None)
    monkeypatch.setattr(cache, "_prompt_signature", lambda: "prompt-sig")

    return SimpleNamespace(qdrant=fake_qdrant, redis=fake_redis)


def test_english_methods_query_does_not_reuse_vietnamese_eligibility_cached_answer(cache_env):
    state = _methods_state()
    metadata = cache._build_cache_metadata(state)
    cache_id = "incompatible-cache"
    cache_env.qdrant.points.append(
        _FakePoint(
            {
                **metadata,
                "cache_id": cache_id,
                "answer_language": "default",
                "query_semantics": "admission_eligibility",
                "expires_at": _FUTURE_EXPIRY,
            }
        )
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "Phuong thuc tuyen sinh dai hoc VGU bao gom cac dieu kien xet tuyen.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is False
    assert cache_env.qdrant.last_filter_values["request_language"] == "en"
    assert cache_env.qdrant.last_filter_values["answer_language"] == "en"
    assert cache_env.qdrant.last_filter_values["query_semantics"] == "admission_methods"


def test_compatible_repeated_request_can_still_use_cache(cache_env):
    state = _methods_state()
    metadata = cache._build_cache_metadata(state)
    cache_id = "compatible-cache"
    cache_env.qdrant.points.append(
        _FakePoint({**metadata, "cache_id": cache_id, "expires_at": _FUTURE_EXPIRY})
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "There are five admission methods in the retrieved context.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is True
    assert result.answer == "There are five admission methods in the retrieved context."
    assert result.answer_cache_id == cache_id


def test_language_scoped_entries_do_not_cross_hit(cache_env):
    state = _methods_state()
    metadata = cache._build_cache_metadata(state)
    cache_id = "wrong-language-cache"
    cache_env.qdrant.points.append(
        _FakePoint(
            {
                **metadata,
                "cache_id": cache_id,
                "request_language": "default",
                "answer_language": "default",
                "expires_at": _FUTURE_EXPIRY,
            }
        )
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "Phuong thuc tuyen sinh dai hoc VGU.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is False


def test_methods_query_does_not_cross_hit_eligibility_cache_entry(cache_env):
    state = _methods_state()
    metadata = cache._build_cache_metadata(state)
    cache_id = "eligibility-cache"
    cache_env.qdrant.points.append(
        _FakePoint(
            {
                **metadata,
                "cache_id": cache_id,
                "query_semantics": "admission_eligibility",
                "expires_at": _FUTURE_EXPIRY,
            }
        )
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "Applicants must satisfy the admission requirements in the retrieved context.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is False


def test_contextual_tuition_follow_up_does_not_reuse_admission_requirement_cache(cache_env):
    state = _tuition_state(
        context_topic="curriculum",
        major_id=None,
        category="REQUIREMENT",
        source="https://vgu.edu.vn/admission/bachelor/admission-requirements",
        content="BBA admission code 7340101 and subject combinations.",
    )
    metadata = cache._build_cache_metadata(state)
    cache_id = "bba-admission-requirement-cache"
    cache_env.qdrant.points.append(
        _FakePoint({**metadata, "cache_id": cache_id, "expires_at": _FUTURE_EXPIRY})
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "BBA admission requirements include subject combinations and direct admission.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is False
    assert result.answer == ""
    assert cache_env.qdrant.last_filter_values == {}


def test_compatible_contextual_tuition_cache_reuse_still_hits(cache_env):
    state = _tuition_state()
    metadata = cache._build_cache_metadata(state)
    cache_id = "bba-tuition-cache"
    cache_env.qdrant.points.append(
        _FakePoint({**metadata, "cache_id": cache_id, "expires_at": _FUTURE_EXPIRY})
    )
    cache_env.redis.store[cache._payload_key(cache_id)] = _payload(
        cache_id,
        "BBA tuition is 46,600,000 VND per semester for Vietnamese students.",
    )

    result = cache.run_semantic_answer_cache_lookup(state)

    assert result.answer_cache_hit is True
    assert "46,600,000 VND" in result.answer
    assert result.answer_cache_id == cache_id


def test_tuition_lookup_with_requirement_evidence_is_not_stored(cache_env):
    state = _tuition_state(
        context_topic="curriculum",
        major_id=None,
        category="REQUIREMENT",
        source="https://vgu.edu.vn/admission/bachelor/admission-requirements",
        content="BBA admission code 7340101 and subject combinations.",
        answer="BBA admission requirements include subject combinations.",
    )

    cache.run_semantic_answer_cache_store(state)

    assert cache_env.qdrant.upserts == []
    assert cache_env.redis.store == {}


def test_language_mismatched_answer_is_not_stored_for_english_request(cache_env):
    state = _methods_state(
        answer="Phuong thuc tuyen sinh dai hoc VGU bao gom cac dieu kien xet tuyen.",
    )

    cache.run_semantic_answer_cache_store(state)

    assert cache_env.qdrant.upserts == []
    assert cache_env.redis.store == {}


def test_language_compatible_answer_is_stored_with_cache_scope_metadata(cache_env):
    state = _methods_state(
        answer="There are five admission methods in the retrieved context.",
    )

    cache.run_semantic_answer_cache_store(state)

    assert len(cache_env.qdrant.upserts) == 1
    stored_payload = cache_env.qdrant.upserts[0].payload
    assert stored_payload["request_language"] == "en"
    assert stored_payload["answer_language"] == "en"
    assert stored_payload["query_semantics"] == "admission_methods"
    assert len(cache_env.redis.store) == 1


def _methods_state(answer: str = "") -> PipelineState:
    return PipelineState(
        query="What are the 2026 bachelor admission methods for VGU?",
        intent="admission_requirement",
        answer_mode="retrieve",
        needs_retrieval=True,
        resolved_query="what are the 2026 bachelor admission methods for vgu?",
        selected_tools=["search_hybrid"],
        context_block="official context",
        grounded_prompt=f"system\n{_ENGLISH_PROMPT}\ncontext",
        resolved_context={
            "topic": "admission",
            "scope": "bachelor",
            "level": "undergraduate",
        },
        reranked=[
            {
                "chunk_id": "requirements-methods",
                "source": "https://vgu.edu.vn/admission/bachelor/admission-requirements",
                "category": "REQUIREMENT",
                "content": "Admission requirements and methods.",
                "year": 2026,
            }
        ],
        answer=answer,
        confidence=0.89,
    )


def _tuition_state(
    *,
    context_topic: str = "tuition",
    major_id: str | None = "BBA",
    category: str = "TUITION_POLICY",
    source: str = "tuition_policy_table",
    content: str = "BBA tuition is 46,600,000 VND per semester for Vietnamese students.",
    answer: str = "",
) -> PipelineState:
    return PipelineState(
        query="Con BBA thi sao?",
        intent="tuition_lookup",
        answer_mode="retrieve",
        needs_retrieval=True,
        selected_tools=["get_tuition_by_major", "search_vector"],
        context_block="official context",
        grounded_prompt="system\ncontext",
        resolved_context={
            "topic": context_topic,
            "scope": "bachelor",
            "major_id": major_id,
            "major_name": "Business Administration" if major_id else None,
            "level": "undergraduate",
        },
        reranked=[
            {
                "chunk_id": f"{category.lower()}-bba-2026",
                "source": source,
                "category": category,
                "content": content,
                "year": 2026,
            }
        ],
        answer=answer,
        confidence=0.95,
    )


def _payload(cache_id: str, answer: str) -> str:
    return json.dumps(
        {
            "cache_id": cache_id,
            "answer": answer,
            "confidence": 0.89,
            "follow_up_suggestions": [],
            "expires_at": _FUTURE_EXPIRY,
        }
    )


def _filter_values(query_filter) -> dict:
    values = {}
    for condition in query_filter.must:
        values[condition.key] = condition.match.value
    return values
