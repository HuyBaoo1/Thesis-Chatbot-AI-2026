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
    history_block = format_chat_history(
        state.chat_history,
        limit=MAX_SYNTHESIS_HISTORY_MESSAGES,
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
    ]
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
