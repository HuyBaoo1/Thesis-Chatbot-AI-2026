import json
import logging
import unicodedata
from typing import Any

from src.core.config import settings
from src.integrations.openai_client import get_openai_client
from src.services.chat_pipeline.prompts import history_response_system_prompt
from src.services.chat_pipeline.types import PipelineState
from src.services.chat_pipeline.utils import format_chat_history

logger = logging.getLogger(__name__)


def run_history_response(state: PipelineState) -> PipelineState:
    state.retrieval_mode = "history"
    state.selected_tools = []
    state.candidates = []
    state.reranked = []
    state.context_block = ""
    state.grounded_prompt = ""

    history_block = format_chat_history(state.chat_history)
    memory_block = state.memory_context or "No lead memory available."

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": history_response_system_prompt()},
                {
                    "role": "system",
                    "content": f"Recent Conversation History:\n{history_block}",
                },
                {
                    "role": "system",
                    "content": f"Lead Memory:\n{memory_block}",
                },
                {"role": "user", "content": state.query},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        payload = _safe_load_json(raw)
        state.answer = str(payload.get("answer") or "").strip()
        state.follow_up_suggestions = _coerce_suggestions(
            payload.get("follow_up_suggestions")
        )
        state.confidence = 0.85 if state.answer else 0.2
    except Exception:
        logger.exception("history_response_llm_failed")
        _fallback_history_response(state)

    if not state.answer:
        _fallback_history_response(state)

    return state


def _fallback_history_response(state: PipelineState) -> None:
    query = _normalize_for_matching(state.query)

    profile_answer = _profile_history_answer(state, query)
    if profile_answer:
        state.answer = profile_answer
        state.confidence = 0.75
    elif _asks_about_major_history(query):
        state.answer = _major_history_answer(state)
        state.confidence = 0.7 if _has_known_major_interests(state) else 0.4
    elif _asks_about_recent_questions(query):
        state.answer = _recent_questions_answer(state)
        state.confidence = 0.7 if _recent_user_messages(state) else 0.4
    elif not state.chat_history and not (state.lead_profile or {}):
        state.answer = "Mình chưa có đủ lịch sử trò chuyện hoặc thông tin đã lưu để trả lời câu này."
        state.confidence = 0.35
    else:
        state.answer = (
            "Mình chưa đọc được chính xác thông tin bạn hỏi trong lịch sử trò chuyện hiện có."
        )
        state.confidence = 0.35

    state.follow_up_suggestions = _default_history_suggestions()


def _profile_history_answer(state: PipelineState, query: str) -> str | None:
    profile = state.lead_profile or {}
    field_rules = [
        (
            "full_name",
            [
                "ten toi",
                "ten cua toi",
                "toi ten gi",
                "ban biet ten toi",
            ],
            "Theo thông tin mình đang có, tên của bạn là {value}.",
        ),
        (
            "email",
            ["email cua toi", "email toi"],
            "Theo thông tin mình đang có, email của bạn là {value}.",
        ),
        (
            "phone",
            ["sdt cua toi", "so dien thoai cua toi", "phone cua toi"],
            "Theo thông tin mình đang có, số điện thoại của bạn là {value}.",
        ),
        (
            "gpa",
            ["gpa cua toi", "gpa toi"],
            "Theo thông tin mình đang có, GPA của bạn là {value}.",
        ),
        (
            "ielts",
            ["ielts cua toi", "ielts toi"],
            "Theo thông tin mình đang có, IELTS của bạn là {value}.",
        ),
        (
            "sat",
            ["sat cua toi", "sat toi"],
            "Theo thông tin mình đang có, SAT của bạn là {value}.",
        ),
        (
            "act",
            ["act cua toi", "act toi"],
            "Theo thông tin mình đang có, ACT của bạn là {value}.",
        ),
        (
            "high_school",
            ["toi hoc truong nao", "truong cua toi", "truong toi"],
            "Theo thông tin mình đang có, trường của bạn là {value}.",
        ),
        (
            "province",
            ["tinh cua toi", "tinh toi", "toi o tinh nao", "toi o thanh pho nao"],
            "Theo thông tin mình đang có, tỉnh/thành của bạn là {value}.",
        ),
    ]

    for field, markers, template in field_rules:
        if not any(marker in query for marker in markers):
            continue
        value = profile.get(field)
        if value not in (None, ""):
            return template.format(value=value)
        return "Mình chưa thấy thông tin này trong hồ sơ hoặc lịch sử trò chuyện hiện có."

    return None


def _asks_about_major_history(query: str) -> bool:
    major_markers = ["nganh", "chuong trinh", "major", "program"]
    recall_markers = ["da hoi", "da de cap", "da nhac", "quan tam", "truoc do", "lich su"]
    return any(marker in query for marker in major_markers) and any(
        marker in query for marker in recall_markers
    )


def _major_history_answer(state: PipelineState) -> str:
    interests = _known_major_interest_labels(state)
    if interests:
        joined = ", ".join(interests)
        return f"Trong thông tin mình đang có, bạn đã quan tâm tới: {joined}."

    recent_major_questions = [
        message
        for message in _recent_user_messages(state)
        if any(marker in _normalize_for_matching(message) for marker in ["nganh", "major", "chuong trinh", "program"])
    ]
    if recent_major_questions:
        lines = "\n".join(f"- {message}" for message in recent_major_questions[-5:])
        return "Mình chưa tách được tên ngành cụ thể, nhưng trong lịch sử gần đây bạn đã hỏi:\n" + lines

    return "Mình chưa thấy ngành cụ thể nào được lưu trong lịch sử trò chuyện hiện có."


def _has_known_major_interests(state: PipelineState) -> bool:
    return bool(_known_major_interest_labels(state))


def _known_major_interest_labels(state: PipelineState) -> list[str]:
    interests = (state.long_term_memory or {}).get("major_interests") or []
    if not isinstance(interests, list):
        return []

    labels: list[str] = []
    seen: set[str] = set()
    for item in interests:
        if not isinstance(item, dict):
            continue
        label = str(item.get("major_name") or item.get("major_code") or "").strip()
        if not label or label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return labels[:5]


def _asks_about_recent_questions(query: str) -> bool:
    markers = [
        "toi da hoi gi",
        "da hoi gi",
        "hoi gi roi",
        "hoi nhung gi",
        "lich su",
        "doan chat",
        "cuoc tro chuyen",
        "truoc do toi hoi",
        "vua hoi",
    ]
    return any(marker in query for marker in markers)


def _recent_questions_answer(state: PipelineState) -> str:
    messages = _recent_user_messages(state)
    if not messages:
        return "Mình chưa thấy câu hỏi trước đó nào trong lịch sử trò chuyện hiện có."

    lines = "\n".join(f"- {message}" for message in messages[-5:])
    return "Trong lịch sử gần đây, bạn đã hỏi:\n" + lines


def _recent_user_messages(state: PipelineState) -> list[str]:
    messages: list[str] = []
    for item in state.chat_history or []:
        if str(item.get("role", "")).lower() != "user":
            continue
        content = " ".join(str(item.get("content") or "").split())
        if content:
            messages.append(content)
    return messages


def _coerce_suggestions(value: Any) -> list[str]:
    if not isinstance(value, list):
        return _default_history_suggestions()

    suggestions = [str(item).strip() for item in value if str(item).strip()]
    if not suggestions:
        return _default_history_suggestions()
    return suggestions[:3]


def _default_history_suggestions() -> list[str]:
    return [
        "Bạn muốn hỏi tiếp về ngành đã quan tâm không?",
        "Bạn muốn xem học phí hay học bổng?",
        "Bạn muốn mình tư vấn điều kiện tuyển sinh không?",
    ]


def _safe_load_json(raw: str) -> dict[str, Any]:
    try:
        loaded = json.loads(raw)
        return loaded if isinstance(loaded, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())
