import json
import logging
import re
import time
import unicodedata
from datetime import datetime, timezone
from typing import Any

from src.core.config import settings
from src.integrations.openai_client import get_openai_client
from src.integrations.redis_client import get_redis_client
from src.services.chat_pipeline.prompts import (
    insufficient_context_answer,
    synthesis_system_prompt,
)
from src.services.chat_pipeline.types import PipelineState

logger = logging.getLogger(__name__)

SYNTHESIS_MAX_TOKENS = 1200

# --- LLM concurrency guard (Redis-based semaphore) ---
_LLM_CONCURRENCY_KEY = "llm_concurrency:counter"
_LLM_MAX_CONCURRENT = 10
_LLM_BACKOFF_BASE = 0.1  # 100 ms
_LLM_BACKOFF_MAX = 3.0   # cap each wait at 3 s
_LLM_ACQUIRE_TIMEOUT = 8.0  # total wait before giving up


def _acquire_llm_slot() -> bool:
    """Try to reserve an LLM call slot.  Returns True if acquired."""
    try:
        redis = get_redis_client()
        deadline = time.monotonic() + _LLM_ACQUIRE_TIMEOUT
        attempt = 0
        while True:
            current = redis.incr(_LLM_CONCURRENCY_KEY)
            if current <= _LLM_MAX_CONCURRENT:
                return True
            # Over limit — release and back off
            redis.decr(_LLM_CONCURRENCY_KEY)
            if time.monotonic() >= deadline:
                logger.warning("llm_concurrency_timeout after_attempts=%s", attempt)
                return False
            wait = min(_LLM_BACKOFF_BASE * (2 ** attempt), _LLM_BACKOFF_MAX)
            time.sleep(wait)
            attempt += 1
    except Exception:
        # Redis unavailable — proceed without guard (fail-open)
        return True


def _release_llm_slot() -> None:
    try:
        redis = get_redis_client()
        redis.decr(_LLM_CONCURRENCY_KEY)
    except Exception:
        pass


def run_synthesis(state: PipelineState) -> PipelineState:
    if not state.context_block:
        state.answer = insufficient_context_answer()
        state.confidence = 0.25
        state.follow_up_suggestions = _fallback_suggestions(state)
        return state

    temporal_gap_answer = _build_scholarship_temporal_gap_answer(state)
    if temporal_gap_answer:
        state.answer = temporal_gap_answer
        state.confidence = 0.25
        state.follow_up_suggestions = _fallback_suggestions(state)
        return state

    # --- LLM concurrency guard ---
    if not _acquire_llm_slot():
        # Too many LLM calls in flight — serve deterministic fallback or busy message
        fallback = _build_deterministic_context_answer(state)
        if fallback:
            state.answer = fallback
            state.confidence = 0.65
            state.follow_up_suggestions = _fallback_suggestions(state)
            return state
        state.answer = (
            "Hệ thống đang xử lý nhiều câu hỏi cùng lúc. "
            "Bạn vui lòng đợi vài giây rồi gửi lại câu hỏi nhé."
        )
        state.confidence = 0.3
        state.follow_up_suggestions = _fallback_suggestions(state)
        return state

    client = get_openai_client()

    try:
        try:
            logger.info(
                "chat_pipeline_synthesis_prompt_size prompt_chars=%s context_chars=%s evidence_count=%s conversation_id=%s lead_id=%s",
                len(state.grounded_prompt or ""),
                len(state.context_block or ""),
                len(state.reranked or []),
                state.conversation_id,
                state.lead_id,
            )
            response = client.chat.completions.create(
                model=settings.OPENAI_CHAT_MODEL,
                temperature=0.2,
                max_tokens=SYNTHESIS_MAX_TOKENS,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": synthesis_system_prompt(),
                    },
                    {
                        "role": "user",
                        "content": state.grounded_prompt,
                    },
                ],
            )
            raw = response.choices[0].message.content or "{}"
            payload = _safe_load_json(raw)

            answer = _normalize_answer(payload.get("answer"))
            suggestions = _normalize_suggestions(
                payload.get("follow_up_suggestions"),
                state=state,
            )

            if not answer:
                raise ValueError("Empty answer from model")

            state.answer = _strip_inline_source_tags(answer)
            state.confidence = _compute_confidence(state)
            state.follow_up_suggestions = _blend_profile_follow_up(
                suggestions or _fallback_suggestions(state),
                state,
            )
        finally:
            _release_llm_slot()
    except Exception:
        state.answer = "Hiện tại hệ thống gặp lỗi khi tạo câu trả lời. Bạn thử lại sau nhé."
        state.confidence = 0.2
        state.follow_up_suggestions = _fallback_suggestions(state)
        fallback_answer = _build_deterministic_context_answer(state)
        if fallback_answer:
            state.answer = fallback_answer
            state.confidence = 0.78

    return state


def _build_deterministic_context_answer(state: PipelineState) -> str | None:
    if state.intent != "scholarship_lookup":
        return None
    if not _is_global_scholarship_overview_request(state):
        return None

    scope = str((state.resolved_context or {}).get("scope") or "").strip().lower()
    if scope == "global_scholarship":
        return _build_global_scholarship_answer(state)
    return None


def _is_global_scholarship_overview_request(state: PipelineState) -> bool:
    original = _normalize_for_matching(state.query or "")
    resolved = _normalize_for_matching(state.resolved_query or "")
    combined = f"{original} {resolved}".strip()

    procedural_markers = [
        "lam the nao",
        "lam sao",
        "cach nao",
        "cach de",
        "nhan duoc",
        "dat duoc",
        "apply",
        "how to",
        "eligible",
        "eligibility",
        "dieu kien",
        "tieu chi",
        "yeu cau",
    ]
    if any(marker in combined for marker in procedural_markers):
        return False

    overview_markers = [
        "tat ca",
        "toan bo",
        "cac loai",
        "nhung loai",
        "danh sach",
        "hoc bong nao",
        "co hoc bong",
        "muon biet ve hoc bong",
        "biet ve hoc bong",
        "tell me about scholarships",
        "what scholarships",
    ]
    return any(marker in combined for marker in overview_markers)


def _build_global_scholarship_answer(state: PipelineState) -> str | None:
    # Scholarship policies must be answered only from retrieved/imported
    # official context. The old source-specific deterministic shortcut is
    # intentionally disabled to avoid carrying unsupported figures into the configured university.
    return None


def _build_scholarship_temporal_gap_answer(state: PipelineState) -> str | None:
    if state.intent != "scholarship_lookup":
        return None

    requested_year = _extract_requested_year(state)
    if requested_year is None:
        return None

    scholarship_evidence = [
        item
        for item in state.reranked or []
        if _is_scholarship_evidence(item)
    ]
    if any(requested_year in _evidence_years(item) for item in scholarship_evidence):
        return None

    available_years = sorted(
        {
            year
            for item in scholarship_evidence
            for year in _evidence_years(item)
            if year != requested_year
        }
    )
    if scholarship_evidence and not available_years and not _is_future_year(requested_year):
        return None

    year_note = f" cho năm {requested_year}"
    if available_years:
        year_note += f"; các bằng chứng học bổng hiện có trong context chỉ nêu năm {', '.join(str(year) for year in available_years)}"

    return (
        "Tôi chưa tìm thấy thông tin này trong kho dữ liệu chính thức hiện có"
        f": thông tin học bổng{year_note}. "
        f"Vì vậy, mình không thể xác nhận điều kiện IELTS, khả năng nhận học bổng, "
        f"mức/tỷ lệ học bổng hoặc tiêu chí học bổng cho năm {requested_year}. "
        f"Bạn nên kiểm tra website chính thức của {settings.UNIVERSITY_NAME.strip() or settings.UNIVERSITY_SHORT_NAME.strip()} "
        f"({settings.UNIVERSITY_WEBSITE.strip() or 'DATA_REQUIRED'}) hoặc liên hệ bộ phận phụ trách để được xác nhận."
    )


def _extract_requested_year(state: PipelineState) -> int | None:
    for value in (state.query, state.resolved_query):
        match = re.search(r"\b(20\d{2})\b", str(value or ""))
        if match:
            return int(match.group(1))
    return None


def _is_scholarship_evidence(item: dict[str, Any]) -> bool:
    category = str(item.get("category") or "").strip().upper()
    if category == "SCHOLARSHIP":
        return True

    text = _normalize_for_matching(
        " ".join(
            str(item.get(field) or "")
            for field in ("title", "source", "source_url")
        )
    )
    return any(
        marker in text
        for marker in (
            "hoc bong",
            "scholarship",
            "full merit",
            "merit scholarship",
            "wus",
            "daad",
            "clmt",
        )
    )


def _evidence_years(item: dict[str, Any]) -> set[int]:
    years: set[int] = set()
    raw_year = item.get("year")
    if raw_year not in (None, ""):
        try:
            years.add(int(raw_year))
        except (TypeError, ValueError):
            pass

    source_fields = " ".join(
        str(item.get(field) or "")
        for field in ("title", "source", "source_url")
    )
    for match in re.finditer(r"\b(20\d{2})\b", source_fields):
        years.add(int(match.group(1)))
    return years


def _is_future_year(year: int) -> bool:
    return year > datetime.now(timezone.utc).year


def _combined_candidate_text(state: PipelineState) -> str:
    parts: list[str] = []
    for item in state.reranked or []:
        content = str(item.get("content") or "").strip()
        if content:
            parts.append(content)
    return "\n\n".join(parts)


def _compute_confidence(state: PipelineState) -> float:
    if not state.reranked:
        return 0.25

    retrieval_score = sum(float(item.get("score", 0)) for item in state.reranked) / len(
        state.reranked
    )

    context_length = len(state.context_block or "")
    context_coverage = min(context_length / 1000, 1.0)

    count_bonus = min(0.08 * len(state.reranked), 0.25)

    raw_confidence = retrieval_score * 0.5 + context_coverage * 0.25 + count_bonus + 0.25

    return min(0.95, round(raw_confidence, 2))


def _safe_load_json(raw: str) -> dict[str, Any]:
    try:
        loaded = json.loads(raw)
        return loaded if isinstance(loaded, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _normalize_answer(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return _format_answer_object(value)
    if isinstance(value, list):
        return "\n".join(
            f"- {_format_answer_value(item)}"
            for item in value
            if _format_answer_value(item)
        ).strip()
    return str(value or "").strip()


def _format_answer_object(value: dict[str, Any]) -> str:
    lines: list[str] = []
    for key, item in value.items():
        label = str(key or "").strip()
        text = _format_answer_value(item)
        if not label or not text:
            continue
        lines.append(f"**{label}:** {text}")
    return "\n\n".join(lines).strip()


def _format_answer_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        parts = [_format_answer_value(item) for item in value]
        return ", ".join(part for part in parts if part)
    if isinstance(value, dict):
        parts = []
        for key, item in value.items():
            text = _format_answer_value(item)
            if text:
                parts.append(f"{key}: {text}")
        return "; ".join(parts)
    return str(value or "").strip()


def _normalize_suggestions(value: Any, *, state: PipelineState | None = None) -> list[str]:
    if not isinstance(value, list):
        return []

    results: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = str(item or "").strip()
        if not text:
            continue
        key = _suggestion_key(text)
        if _asks_for_known_profile_field(key, state):
            continue
        if key in seen:
            continue
        seen.add(key)
        results.append(text)
        if len(results) >= 3:
            break
    return results


def _blend_profile_follow_up(suggestions: list[str], state: PipelineState) -> list[str]:
    normalized = _normalize_suggestions(suggestions, state=state)
    profile_question = (state.profile_follow_up_question or "").strip()
    if not profile_question:
        return normalized[:3]

    profile_key = _suggestion_key(profile_question)
    if _asks_for_known_profile_field(profile_key, state):
        return normalized[:3]

    existing_keys = {_suggestion_key(item) for item in normalized}
    if profile_key in existing_keys:
        return normalized[:3]

    if len(normalized) >= 3:
        normalized = normalized[:2] + [profile_question]
    else:
        normalized.append(profile_question)
    return _normalize_suggestions(normalized, state=state)[:3]


def _asks_for_known_profile_field(key: str, state: PipelineState | None) -> bool:
    if state is None or not key.startswith("profile:"):
        return False

    field = key.split(":", 1)[1]
    profile = state.lead_profile or {}

    if field in {"email", "phone"} and (profile.get("email") or profile.get("phone")):
        return True

    value = profile.get(field)
    if isinstance(value, str):
        return bool(value.strip())
    return value is not None


def _suggestion_key(text: str) -> str:
    normalized = _normalize_for_matching(text)
    field_markers = {
        "profile:high_school": [
            "truong thpt",
            "truong cap 3",
            "high school",
            "dang hoc truong",
        ],
        "profile:province": [
            "tinh/thanh",
            "tinh thanh",
            "tinh nao",
            "thanh pho",
            "province",
            "city",
        ],
        "profile:gpa": ["gpa", "diem trung binh", "diem tb"],
        "profile:ielts": ["ielts"],
        "profile:sat": ["sat"],
        "profile:act": ["act"],
        "profile:email": ["email", "dia chi email"],
        "profile:phone": ["so dien thoai", "sdt", "phone"],
    }
    for key, markers in field_markers.items():
        if any(marker in normalized for marker in markers):
            return key
    return normalized


def _normalize_for_matching(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())


def _strip_inline_source_tags(answer: str) -> str:
    cleaned = re.sub(r"\s*\[(?:SOURCE|EVIDENCE)\s*\d+\]", "", answer, flags=re.IGNORECASE)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _fallback_suggestions(state: PipelineState) -> list[str]:
    query = _normalize_for_matching(state.query or "")

    if any(token in query for token in ["hoc phi", "tuition", "chi phi"]):
        suggestions = [
            "Bạn muốn xem học bổng hoặc hỗ trợ tài chính cho chương trình này không?",
            "Bạn muốn mình so sánh học phí giữa các ngành bạn đang quan tâm không?",
        ]
        return _blend_profile_follow_up(suggestions, state)

    if any(token in query for token in ["hoc bong", "scholarship", "ho tro tai chinh"]):
        suggestions = [
            "Bạn muốn mình kiểm tra các học bổng phù hợp với chương trình này không?",
            "Bạn muốn xem điều kiện ứng tuyển học bổng không?",
        ]
        return _blend_profile_follow_up(suggestions, state)

    if any(token in query for token in ["nganh", "chuong trinh", "program", "major"]):
        suggestions = [
            "Bạn muốn xem học phí của chương trình này không?",
            "Bạn muốn mình gợi ý chương trình theo sở thích học tập của bạn không?",
        ]
        return _blend_profile_follow_up(suggestions, state)

    suggestions = [
        "Bạn muốn mình làm rõ thêm phần nào?",
        "Bạn muốn hỏi tiếp về ngành, học phí, học bổng hay điều kiện tuyển sinh?",
    ]
    return _blend_profile_follow_up(suggestions, state)
