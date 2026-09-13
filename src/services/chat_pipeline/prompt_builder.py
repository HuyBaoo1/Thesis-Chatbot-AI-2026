import unicodedata

from src.services.chat_pipeline.types import PipelineState
from src.services.chat_pipeline.utils import format_chat_history

MAX_SYNTHESIS_HISTORY_MESSAGES = 4
MAX_SYNTHESIS_MEMORY_CHARS = 900


def build_grounded_prompt(state: PipelineState) -> PipelineState:
    resolved_query = state.resolved_query
    if state.rewrite_query and resolved_query:
        user_block = (
            f"Original: {state.query}\n"
            f"Resolved for retrieval: {resolved_query}"
        )
    else:
        user_block = state.query
    history_block = (
        format_chat_history(
            state.chat_history,
            limit=MAX_SYNTHESIS_HISTORY_MESSAGES,
        )
        if _should_include_recent_conversation(state)
        else "No recent history."
    )
    memory_block = _compact_block(
        state.memory_context or "No lead memory available.",
        max_chars=MAX_SYNTHESIS_MEMORY_CHARS,
    )
    context_block = state.context_block or "No supporting context available."
    context_upper = context_block.upper()

    extra_task_rules: list[str] = []
    if "### MAJOR INFORMATION" in context_upper and "### TUITION INFORMATION" in context_upper:
        extra_task_rules.append(
            "- The answer should combine the major details and the tuition details when they are relevant to the user question."
        )
    extra_task_rules.extend(_authoritative_db_task_rules(state))
    extra_task_rules.extend(_scholarship_task_rules(state))
    if _looks_like_detailed_major_query(state.query):
        extra_task_rules.append(
            "- This is a detailed-major question. If tuition information exists in Context, include a short tuition summary after the main program description."
        )
    if state.profile_follow_up_question:
        extra_task_rules.append(
            "- Keep the main answer focused. Do not append the profile follow-up question to the answer body; it is handled separately as a suggestion."
        )
    extra_rules_block = "\n".join(extra_task_rules).strip()
    sections = [
        f"### User Question\n{user_block}",
        f"### Context\n{context_block}",
    ]
    if history_block != "No recent history.":
        sections.append(f"### Recent Conversation\n{history_block}")
    if memory_block != "No lead memory available.":
        sections.append(f"### Lead Memory\n{memory_block}")

    task_lines = [
        "Answer in the same language as the user; default to Vietnamese if unclear.",
        "Do not include inline source tags in the answer.",
        "Use clear line breaks. For lists, put each item on a new line and prefer numbered format 1. 2. 3.",
        "For exact count or list questions, include only items explicitly named in Context; do not add an 'other' bucket unless Context names it as a separate item.",
    ]
    language_note = _response_language_note(state.query)
    if language_note:
        task_lines.append(language_note)
    if extra_rules_block:
        task_lines.append(extra_rules_block)
    sections.append("### Task Notes\n" + "\n".join(task_lines))

    state.grounded_prompt = "\n\n".join(sections)
    return state


def _looks_like_detailed_major_query(query: str) -> bool:
    q = " ".join((query or "").strip().lower().split())
    markers = [
        "thong tin chi tiet",
        "chi tiet",
        "thong tin cua nganh",
        "thong tin nganh",
        "chi tiet cua nganh",
        "program details",
        "detailed information",
    ]
    return any(marker in q for marker in markers)


def _should_include_recent_conversation(state: PipelineState) -> bool:
    if not state.chat_history:
        return False
    if not (state.rewrite_query and (state.resolved_query or "").strip()):
        return False
    return _looks_like_context_dependent_query(state.query)


def _looks_like_context_dependent_query(query: str | None) -> bool:
    q = _normalize_for_matching(query or "")
    if not q:
        return False

    contextual_markers = [
        "thi sao",
        "con sao",
        "vay sao",
        "the sao",
        "nganh nay",
        "nganh do",
        "nganh tren",
        "nganh vua noi",
        "chuong trinh nay",
        "chuong trinh do",
        "chuong trinh tren",
        "chuong trinh vua noi",
        "major nay",
        "major do",
        "that major",
        "this major",
        "program nay",
        "program do",
        "that program",
        "this program",
        "what about",
        "how about",
    ]
    if any(marker in q for marker in contextual_markers):
        return True

    topic_only_queries = {
        "hoc phi",
        "hoc bong",
        "dieu kien",
        "dieu kien dau vao",
        "yeu cau",
        "yeu cau dau vao",
        "ho so ung tuyen",
        "quy trinh ung tuyen",
        "deadline",
        "thoi han",
        "cac mon hoc",
        "mon hoc",
        "khoa hoc",
        "chuong trinh hoc",
        "cau truc chuong trinh",
        "tin chi",
        "bao nhieu tin chi",
    }
    level_only_queries = {
        "dai hoc",
        "cu nhan",
        "undergraduate",
        "bachelor",
        "thac si",
        "master",
        "tien si",
        "phd",
        "sau dai hoc",
    }
    return q in topic_only_queries or q in level_only_queries


def _scholarship_task_rules(state: PipelineState) -> list[str]:
    if state.intent != "scholarship_lookup":
        return []

    rules = [
        "- Scholarship safety: treat each named scholarship as a separate policy. Do not transfer amount, eligibility, coverage, duration, GPA, IELTS, SAT, ACT, nationality, compatibility, program scope, or year between Merit, Full Merit, CLMT, WUS, DAAD Type 1, and DAAD Type 2 unless Context explicitly links them.",
        "- For scholarship amount, coverage, eligibility, maintenance, compatibility, or comparison questions, answer only the exact requested scholarship(s), year, and requested dimensions.",
        "- For yes/no or listing scholarship availability questions, answer only the listed scholarship names or presence from Context. Do not add value, sponsor, criteria, application, or renewal details unless the user asks for them.",
        "- For scholarship list or overview questions, do not treat program names, program codes, or program allocation tables as scholarship names.",
        "- For scholarship support or coverage questions, answer only concrete benefits, value, duration, or coverage found in Context. Do not substitute sponsor, purpose, eligibility, or application information for missing support details.",
        "- If Context supports only part of a scholarship answer, answer the supported part and state that the missing dimension was not found in the current official context. Do not fill missing dimensions from a different scholarship.",
        "- For scholarship comparisons, compare only dimensions explicitly present for each scholarship and say which requested dimensions are missing instead of inferring them.",
    ]

    q = _normalize_for_matching(state.query or "")
    if any(marker in q for marker in ["bao nhieu", "gia tri", "tri gia", "amount", "value", "eur", "vnd", "%"]):
        rules.append(
            "- For scholarship value questions, do not add eligibility, GPA, IELTS, SAT, ACT, application, or renewal details unless the user asks for them."
        )

    return rules


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("đ", "d").replace("Đ", "D").lower()
    return " ".join(normalized.split())


def _response_language_note(query: str | None) -> str | None:
    if _is_english_dominant_query(query):
        return (
            "- Required response language: English for this answer. "
            "Use English explanatory prose and keep official names/titles from Context unchanged. "
            "For admission methods, copy the name after the dash/colon verbatim; do not translate those official names."
        )
    return None


def _is_english_dominant_query(query: str | None) -> bool:
    text = str(query or "").strip()
    if not text:
        return False

    accent_count = sum(
        1
        for ch in text
        if ch in "ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ"
    )
    normalized = unicodedata.normalize("NFKD", text)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("đ", "d").replace("Đ", "D").lower()
    normalized = " ".join(normalized.split())
    tokens = set(normalized.replace("?", " ").replace(",", " ").split())

    vi_markers = {
        "bao",
        "bn",
        "can",
        "co",
        "con",
        "duoc",
        "hoc",
        "khong",
        "ko",
        "k",
        "la",
        "nganh",
        "nhieu",
        "phi",
        "thi",
        "tuyen",
        "yeu",
    }
    if accent_count or tokens & vi_markers:
        return False

    en_markers = {
        "application",
        "apply",
        "deadline",
        "how",
        "master",
        "portal",
        "requirement",
        "requirements",
        "scholarship",
        "tuition",
        "what",
        "when",
        "where",
    }
    return bool(tokens & en_markers)


def _authoritative_db_task_rules(state: PipelineState) -> list[str]:
    sources = _authoritative_db_sources(state)
    if not sources:
        return []
    topic = str((state.resolved_context or {}).get("topic") or "").strip().lower()
    is_curriculum_topic = topic in {"curriculum", "course_credits"}

    if is_curriculum_topic:
        rules = [
            (
                "- Both DB-backed and supporting evidence are present in Context "
                f"({', '.join(sources)}). Combine them to maximize completeness for curriculum/course questions."
            ),
            "- For curriculum and course-credit details, prioritize concrete course-level evidence from supporting sources when DB context is only high-level.",
            "- Use DB-backed fields to keep program identity and structured facts correct, but do not suppress relevant supporting evidence.",
        ]
    else:
        rules = [
            (
                "- Authoritative structured DB-backed results are present in Context "
                f"({', '.join(sources)}). Treat them as the primary source of truth over supporting search evidence."
            ),
            "- Preserve completeness when answering from authoritative DB-backed results. Do not replace a full DB result with a short illustrative summary.",
            "- If supporting evidence and authoritative DB-backed results differ, prioritize the DB-backed results and use supporting evidence only for brief clarification.",
        ]

    if "get_all_majors" in set(state.selected_tools or []):
        rules.append(
            "- For a full program-list answer, reproduce every active program from the DB-backed Context exactly once, grouped by the level/type shown in Context."
        )
        rules.append(
            "- Do not answer with a partial phrase such as 'bao gồm ...'. Completeness is more important than brevity for DB-backed list answers."
        )
        counts_summary = _get_all_majors_counts_summary(state)
        if counts_summary:
            rules.append(
                f"- Completeness check for the authoritative DB result: {counts_summary}. Make sure the final answer covers all of them."
            )

    return rules


def _authoritative_db_sources(state: PipelineState) -> list[str]:
    preferred_order = ["major_table", "tuition_policy_table"]
    seen: set[str] = set()
    sources: list[str] = []

    for item in state.reranked or []:
        source = str(item.get("source") or "").strip().lower()
        path = str(item.get("path") or "").strip().lower()
        if source in preferred_order and source not in seen:
            seen.add(source)
            sources.append(source)
            continue
        if path.startswith("tool:") and path not in seen:
            seen.add(path)
            sources.append(path)

    def _sort_key(value: str) -> tuple[int, str]:
        if value in preferred_order:
            return (preferred_order.index(value), value)
        return (len(preferred_order), value)

    return sorted(sources, key=_sort_key)


def _get_all_majors_counts_summary(state: PipelineState) -> str | None:
    items: list[dict] = []
    for candidate in state.reranked or []:
        if str(candidate.get("path") or "").strip().lower() != "tool:get_all_majors":
            continue
        payload = candidate.get("tool_payload") or {}
        raw_items = payload.get("items")
        if isinstance(raw_items, list):
            items = [item for item in raw_items if isinstance(item, dict)]
            break

    if not items:
        return None

    counts = {
        "UNDERGRAD_MAJOR": 0,
        "GRAD_MAJOR": 0,
        "CERTIFICATE_PROGRAM": 0,
        "OTHER": 0,
    }
    for item in items:
        major_type = str(item.get("major_type") or "").strip().upper()
        if major_type in counts:
            counts[major_type] += 1
        else:
            counts["OTHER"] += 1

    parts = [f"{len(items)} total active programs"]
    if counts["UNDERGRAD_MAJOR"]:
        parts.append(f"{counts['UNDERGRAD_MAJOR']} undergraduate")
    if counts["GRAD_MAJOR"]:
        parts.append(f"{counts['GRAD_MAJOR']} graduate")
    if counts["CERTIFICATE_PROGRAM"]:
        parts.append(f"{counts['CERTIFICATE_PROGRAM']} certificate")
    if counts["OTHER"]:
        parts.append(f"{counts['OTHER']} other")
    return ", ".join(parts)


def _compact_block(value: str, *, max_chars: int) -> str:
    text = str(value or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n[truncated]"
