import json
import logging
import unicodedata
from typing import Any

from src.core.config import settings
from src.integrations.gemini_client import get_gemini_router_client
from src.integrations.openai_client import get_openai_client
from src.services.chat_pipeline.prompts import router_system_prompt
from src.services.chat_pipeline.types import PipelineState
from src.services.chat_pipeline.utils import format_chat_history

logger = logging.getLogger(__name__)


ALLOWED_INTENTS = {
    "tuition_lookup",
    "scholarship_lookup",
    "timeline_process",
    "admission_requirement",
    "program_info",
    "school_info",
    "general_question",
}

ALLOWED_ANSWER_MODES = {"direct", "retrieve", "clarify", "history"}


def run_router_agent(state: PipelineState) -> PipelineState:
    original_query = (state.query or "").strip()
    if not original_query:
        state.intent = "general_question"
        state.answer_mode = "clarify"
        state.needs_retrieval = False
        state.needs_tools = False
        state.needs_clarification = True
        state.clarification_question = "Bạn muốn hỏi thông tin tuyển sinh gì?"
        state.rewrite_query = False
        state.resolved_query = ""
        return state

    return run_router_llm(state)


def run_router_llm(state: PipelineState) -> PipelineState:
    original_query = (state.query or "").strip()
    resolved_query = (state.resolved_query or "").strip()
    semantic_query = resolved_query if state.rewrite_query and resolved_query else original_query

    if not original_query:
        return state

    history_block = format_chat_history(state.chat_history)
    memory_block = state.memory_context or "No lead memory available."

    try:
        gemini = get_gemini_router_client()
        if gemini is not None:
            client = gemini
            model = settings.GEMINI_ROUTER_MODEL
        else:
            client = get_openai_client()
            model = settings.OPENAI_CHAT_MODEL

        response = client.chat.completions.create(
            model=model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        router_system_prompt()
                        + f"\n\nRecent conversation history:\n{history_block}"
                        + f"\n\nLead memory:\n{memory_block}"
                        + f"\n\n{_semantic_routing_context(state, original_query, semantic_query)}"
                    ),
                },
                {"role": "user", "content": original_query},
            ],
        )

        raw = response.choices[0].message.content or "{}"
        route = _safe_load_json(raw)
        _apply_llm_route_to_state(state, route, original_query)

    except Exception:
        logger.exception("router_agent_llm_failed")
        _fallback_after_llm_failure(state, original_query, semantic_query)

    return state


def _apply_llm_route_to_state(
    state: PipelineState,
    route: dict[str, Any],
    query: str,
) -> None:
    intent = str(route.get("intent", "general_question")).strip()
    answer_mode = str(route.get("answer_mode", "retrieve")).strip().lower()
    existing_resolved_query = (state.resolved_query or "").strip()

    if intent not in ALLOWED_INTENTS:
        intent = "general_question"

    if answer_mode not in ALLOWED_ANSWER_MODES:
        answer_mode = "retrieve"

    rewrite_query = _coerce_bool(route.get("rewrite_query", False))
    llm_resolved_query = str(route.get("resolved_query", "") or "").strip()
    clarification_question = str(route.get("clarification_question", "") or "").strip()

    state.intent = intent
    state.answer_mode = answer_mode
    state.rewrite_query = rewrite_query

    if rewrite_query:
        next_query = _normalize_query(llm_resolved_query or existing_resolved_query or query)
        original_query = _normalize_query(query)
        state.rewrite_query = bool(next_query and next_query != original_query)
        state.resolved_query = next_query or original_query
    else:
        state.rewrite_query = False
        state.resolved_query = _normalize_query(query)

    _sync_flags_from_answer_mode(
        state,
        clarification_question=clarification_question,
    )


def _sync_flags_from_answer_mode(
    state: PipelineState,
    *,
    clarification_question: str = "",
) -> None:
    if state.answer_mode == "direct":
        state.needs_retrieval = False
        state.needs_tools = False
        state.needs_clarification = False
        state.clarification_question = None
        return

    if state.answer_mode == "history":
        state.needs_retrieval = False
        state.needs_tools = False
        state.needs_clarification = False
        state.clarification_question = None
        return

    if state.answer_mode == "clarify":
        state.needs_retrieval = False
        state.needs_tools = False
        state.needs_clarification = True
        state.clarification_question = (
            clarification_question
            or "Bạn cho mình thêm thông tin để mình tra cứu chính xác hơn nhé."
        )
        return

    state.answer_mode = "retrieve"
    state.needs_retrieval = True
    state.needs_tools = True
    state.needs_clarification = False
    state.clarification_question = None


def _fallback_after_llm_failure(
    state: PipelineState,
    original_query: str,
    semantic_query: str,
) -> None:
    if _looks_like_history_recall(original_query):
        _route_to_history(state, original_query)
        return

    if _looks_like_global_program_list(original_query) or _looks_like_global_program_list(semantic_query):
        _route_to_program_list(state, query=semantic_query or original_query)
        return

    if _deterministic_route(state, original_query=original_query, routing_query=semantic_query):
        return

    _route_to_retrieve(
        state,
        intent="general_question",
        query=semantic_query or original_query,
        rewrite=_normalize_query(semantic_query) != _normalize_query(original_query),
    )


def _route_to_retrieve(
    state: PipelineState,
    *,
    intent: str,
    query: str,
    rewrite: bool | None = None,
) -> None:
    existing_resolved_query = (state.resolved_query or "").strip()
    should_rewrite = bool(existing_resolved_query) if rewrite is None else bool(rewrite)
    next_query = existing_resolved_query if should_rewrite and existing_resolved_query else query

    state.intent = intent if intent in ALLOWED_INTENTS else "general_question"
    state.answer_mode = "retrieve"
    state.needs_retrieval = True
    state.needs_tools = True
    state.needs_clarification = False
    state.clarification_question = None
    state.rewrite_query = should_rewrite
    state.resolved_query = _normalize_query(next_query)


def _route_to_clarify(state: PipelineState, query: str, clarification_question: str) -> None:
    state.intent = _infer_intent_from_text(query) or "general_question"
    state.answer_mode = "clarify"
    state.needs_retrieval = False
    state.needs_tools = False
    state.needs_clarification = True
    state.clarification_question = clarification_question
    state.rewrite_query = False
    state.resolved_query = _normalize_query(query)


def _route_to_history(state: PipelineState, query: str) -> None:
    state.intent = "general_question"
    state.answer_mode = "history"
    state.needs_retrieval = False
    state.needs_tools = False
    state.needs_clarification = False
    state.clarification_question = None
    state.rewrite_query = False
    state.resolved_query = _normalize_query(query)


def _route_to_program_list(state: PipelineState, *, query: str | None = None) -> None:
    normalized = _normalize_for_matching(query)
    if any(token in normalized for token in ["sau dai hoc", "thac si", "tien si", "graduate", "master", "phd"]):
        resolved = "cac nganh sau dai hoc thac si tien si VinUniversity"
    elif any(token in normalized for token in ["dai hoc", "cu nhan", "undergraduate", "bachelor"]):
        resolved = "cac nganh dai hoc cu nhan VinUniversity"
    else:
        resolved = "tat ca cac nganh chuong trinh VinUniversity"
    state.intent = "program_info"
    state.answer_mode = "retrieve"
    state.needs_retrieval = True
    state.needs_tools = True
    state.needs_clarification = False
    state.clarification_question = None
    state.rewrite_query = True
    state.resolved_query = resolved


def _deterministic_route(
    state: PipelineState,
    *,
    original_query: str,
    routing_query: str,
) -> bool:
    original_normalized = _normalize_for_matching(original_query)
    routing_normalized = _normalize_for_matching(routing_query)
    resolved_query = (state.resolved_query or "").strip()
    effective_query = routing_query if routing_query else original_query
    effective_normalized = routing_normalized or original_normalized

    matched = _detect_all_intents(effective_normalized) or _detect_all_intents(original_normalized)
    if matched:
        has_resolved_context = bool(state.rewrite_query and resolved_query)
        if _should_clarify_tuition_query(
            original_normalized=original_normalized,
            effective_normalized=effective_normalized,
            has_resolved_context=has_resolved_context,
        ):
            _route_to_clarify(
                state,
                effective_query,
                "Bạn muốn xem học phí của ngành hoặc chương trình nào?",
            )
            _log_deterministic_route(state)
            return True

        # Ambiguous: multiple intents matched → let LLM disambiguate.
        if len(matched) > 1:
            logger.info(
                "router_agent_ambiguous_keywords intents=%s query=%s",
                matched,
                effective_normalized[:120],
            )
            return False

        intent = next(iter(matched))
        if intent not in {"tuition_lookup", "scholarship_lookup", "program_info", "admission_requirement", "timeline_process"}:
            return False

        _route_to_retrieve(
            state,
            intent=intent,
            query=effective_query,
            rewrite=has_resolved_context,
        )
        _log_deterministic_route(state)
        return True

    return False


def _log_deterministic_route(state: PipelineState) -> None:
    logger.info(
        "router_agent_deterministic_route intent=%s answer_mode=%s resolved_query=%s conversation_id=%s lead_id=%s",
        state.intent,
        state.answer_mode,
        state.resolved_query,
        state.conversation_id,
        state.lead_id,
    )


def _normalize_query(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _looks_like_history_recall(query: str | None) -> bool:
    q = _normalize_for_matching(query)
    if not q:
        return False

    conversation_markers = [
        "lich su",
        "doan chat",
        "cuoc tro chuyen",
        "chat history",
        "conversation history",
        "truoc do toi da",
        "truoc do minh da",
        "vua hoi gi",
        "hoi luc nay la gi",
        "toi da hoi",
        "toi da noi",
        "toi da de cap",
        "toi da nhac",
        "da hoi gi",
        "hoi gi roi",
        "hoi nhung gi",
        "da de cap nganh gi",
        "da hoi nganh gi",
        "nhung nganh toi",
        "cac nganh toi",
        "nganh nao toi",
        "ban con nho",
    ]
    if any(marker in q for marker in conversation_markers):
        return True

    profile_recall_markers = [
        "ten toi la gi",
        "ten cua toi la gi",
        "toi ten gi",
        "ban biet ten toi",
        "email cua toi la gi",
        "email toi la gi",
        "sdt cua toi la gi",
        "so dien thoai cua toi la gi",
        "phone cua toi la gi",
        "gpa cua toi bao nhieu",
        "gpa toi bao nhieu",
        "gpa cua toi la gi",
        "ielts cua toi bao nhieu",
        "ielts toi bao nhieu",
        "sat cua toi bao nhieu",
        "sat toi bao nhieu",
        "act cua toi bao nhieu",
        "act toi bao nhieu",
        "toi hoc truong nao",
        "truong cua toi la gi",
        "truong toi la gi",
        "tinh cua toi la gi",
        "toi o tinh nao",
        "toi o thanh pho nao",
    ]
    return any(marker in q for marker in profile_recall_markers)


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()
    normalized = " ".join(normalized.split())
    return normalized.replace("nghanh", "nganh").replace("viuni", "vinuni")


def _looks_like_global_program_list(query: str | None) -> bool:
    q = _normalize_for_matching(query)
    if not q:
        return False
    if any(token in q for token in ["toi quan tam", "toi dang quan tam", "lich su", "doan chat", "truoc do"]):
        return False

    has_program = any(token in q for token in ["nganh", "chuong trinh", "program", "major"])
    has_strong_broad = any(token in q for token in ["tat ca", "toan bo", "danh sach", "all", "list of"])
    has_weak_broad = any(token in q for token in ["cac nganh", "nhung nganh"])
    has_institution = any(
        token in q
        for token in [
            "vinuni",
            "vinuniversity",
            "truong",
            "dao tao",
            "dang dao tao",
            "hien co",
            "co nhung",
        ]
    )
    return has_program and (has_strong_broad or (has_institution and has_weak_broad))


def _should_clarify_tuition_query(
    *,
    original_normalized: str,
    effective_normalized: str,
    has_resolved_context: bool,
) -> bool:
    if has_resolved_context:
        return False
    if not any(token in effective_normalized for token in ["hoc phi", "tuition", "chi phi"]):
        return False

    topic_only_queries = {
        "hoc phi",
        "hoc phi thi sao",
        "tuition",
        "chi phi",
        "chi phi dao tao",
    }
    if original_normalized in topic_only_queries or effective_normalized in topic_only_queries:
        return True

    has_program_marker = any(
        token in effective_normalized
        for token in [
            "nganh",
            "chuong trinh",
            "cu nhan",
            "dai hoc",
            "thac si",
            "tien si",
            "mba",
            "msc",
            "phd",
            "program",
            "major",
        ]
    )
    return not has_program_marker


def _safe_load_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    # Extract JSON object between the first { and last } — handles
    # markdown fences, trailing commentary, and whitespace noise.
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start:end + 1]
    try:
        loaded = json.loads(cleaned)
        return loaded if isinstance(loaded, dict) else {}
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning(
            "router_agent_json_parse_failed error=%s raw_preview=%s",
            exc,
            raw[:200],
        )
        return {}


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes"}

    if isinstance(value, (int, float)):
        return bool(value)

    return False


def _detect_all_intents(value: str) -> frozenset[str]:
    """Return all intents whose keywords match *value*.

    Returns a frozenset so the caller can check ambiguity (multiple
    intents) and fall back to the LLM router when the keyword signal is
    not decisive.
    """
    normalized = _normalize_for_matching(value)
    matched: set[str] = set()

    if any(token in normalized for token in ["hoc phi", "tuition", "chi phi"]):
        matched.add("tuition_lookup")
    if any(token in normalized for token in ["hoc bong", "scholarship", "financial aid"]):
        matched.add("scholarship_lookup")
    if any(token in normalized for token in [
        "deadline", "thoi han", "thoi gian", "han nop", "han cuoi",
        "nop ho so", "lich tuyen sinh", "lich trinh", "dot tuyen",
        "quy trinh ung tuyen", "application process",
    ]):
        matched.add("timeline_process")
    if any(token in normalized for token in [
        "dieu kien", "yeu cau", "requirement", "diem dau vao",
        "dau vao", "nhap hoc", "ho so ung tuyen", "ho so tuyen sinh",
        "admission requirement", "admission score",
    ]):
        matched.add("admission_requirement")
    if "ung tuyen" in normalized and any(token in normalized for token in ["chuan bi", "can gi", "can phai"]):
        matched.add("admission_requirement")
    if any(
        token in normalized
        for token in [
            "nganh",
            "chuong trinh",
            "program",
            "major",
            "mon hoc",
            "cac mon",
            "khoa hoc",
            "course",
            "courses",
            "curriculum",
            "cau truc chuong trinh",
            "khung chuong trinh",
            "tin chi",
            "credits",
        ]
    ):
        matched.add("program_info")

    return frozenset(matched)


def _infer_intent_from_text(value: str) -> str | None:
    """Single-intent backward-compatible wrapper.

    Prefer ``_detect_all_intents`` in new code; this exists only for
    callers that need the legacy first-match semantics.
    """
    matched = _detect_all_intents(value)
    if not matched:
        return None
    # Preserve previous first-match order for callers that rely on it.
    for intent in (
        "tuition_lookup",
        "scholarship_lookup",
        "timeline_process",
        "admission_requirement",
        "program_info",
    ):
        if intent in matched:
            return intent
    return None


def _semantic_routing_context(
    state: PipelineState,
    original_query: str,
    semantic_query: str,
) -> str:
    resolved_context = state.resolved_context or {}
    lines = [
        "Pre-router semantic enrichment:",
        f"Original user message: {original_query}",
    ]

    if _normalize_query(original_query) == _normalize_query(semantic_query):
        lines.append("Resolved query hint: no rewrite was proposed.")
    else:
        lines.append(f"Resolved query hint: {semantic_query}")

    if resolved_context:
        lines.append(
            "Resolved context hint: "
            + json.dumps(resolved_context, ensure_ascii=False, sort_keys=True, default=str)
        )
    else:
        lines.append("Resolved context hint: none")

    lines.append(
        "Use these hints to understand omitted references, topic, program, level, and scope. "
        "They are not factual evidence, and you are still the final routing authority. "
        "If a hint conflicts with the user's explicit wording, prefer the original user message."
    )
    return "\n".join(lines)


