import json
import logging
import re
import unicodedata
from time import perf_counter
from typing import Any

from src.services.chat_pipeline import toolset
from src.services.chat_pipeline.types import PipelineState

logger = logging.getLogger(__name__)


def run_retrieval_orchestrator(state: PipelineState, db) -> PipelineState:
    if not state.needs_retrieval:
        state.retrieval_mode = state.answer_mode or "direct"
        state.selected_tools = []
        state.candidates = []
        return state

    resolved_query = (state.resolved_query or state.query or "").strip()
    search_query = (state.search_query or resolved_query or state.query or "").strip()
    top_k = max(1, min(int(state.top_k or 10), 50))
    collected: list[dict[str, Any]] = []
    used_tools: list[str] = []
    max_hybrid_top_k = 0

    deterministic_calls = _deterministic_tool_calls(
        state,
        resolved_query=resolved_query,
        search_query=search_query,
        top_k=top_k,
    )
    if deterministic_calls:
        tool_calls = _normalize_tool_calls(deterministic_calls)
    else:
        fallback_calls = _fast_fallback_tool_calls(search_query=search_query, top_k=top_k)
        tool_calls = _normalize_tool_calls(fallback_calls)

    for tool_name, args in tool_calls:
        tool_started_at = perf_counter()
        output = _execute_tool(tool_name, args=args, db=db, query=resolved_query, top_k=top_k)
        tool_elapsed_ms = round((perf_counter() - tool_started_at) * 1000, 2)
        used_tools.append(tool_name)
        if tool_name == "search_hybrid":
            requested_k = _safe_int((args or {}).get("top_k"), default=top_k)
            max_hybrid_top_k = max(max_hybrid_top_k, max(1, min(requested_k, 50)))
        mapped = _map_tool_output_to_candidates(tool_name, output)
        collected.extend(mapped)
        logger.info(
            "retrieval_orchestrator_tool_timing tool=%s elapsed_ms=%.2f candidates=%s intent=%s conversation_id=%s lead_id=%s",
            tool_name,
            tool_elapsed_ms,
            len(mapped),
            state.intent,
            state.conversation_id,
            state.lead_id,
        )

    if _needs_hybrid_context_expansion(
        state=state,
        resolved_query=resolved_query,
        collected=collected,
        used_tools=used_tools,
        max_hybrid_top_k=max_hybrid_top_k,
    ):
        expanded_k = min(max(top_k, 8), 12)
        if expanded_k > max_hybrid_top_k:
            expand_started_at = perf_counter()
            output = toolset.search_hybrid(db, query=search_query, top_k=expanded_k)
            used_tools.append("search_hybrid")
            expanded = _map_tool_output_to_candidates("search_hybrid", output)
            collected.extend(expanded)
            logger.info(
                "retrieval_orchestrator_hybrid_expansion elapsed_ms=%.2f expanded_top_k=%s candidates=%s intent=%s conversation_id=%s lead_id=%s",
                round((perf_counter() - expand_started_at) * 1000, 2),
                expanded_k,
                len(expanded),
                state.intent,
                state.conversation_id,
                state.lead_id,
            )

    if not collected and "search_hybrid" not in used_tools:
        output = toolset.search_hybrid(db, query=search_query, top_k=top_k)
        used_tools.append("search_hybrid")
        collected.extend(_map_tool_output_to_candidates("search_hybrid", output))

    state.retrieval_mode = _infer_retrieval_mode(used_tools)
    state.selected_tools = _dedupe_preserve_order(used_tools)
    state.candidates = _select_top_candidates(_merge_candidates(collected), top_k=top_k)
    logger.info(
        "retrieval_orchestrator_summary intent=%s tools=%s collected=%s selected=%s conversation_id=%s lead_id=%s",
        state.intent,
        used_tools,
        len(collected),
        len(state.candidates),
        state.conversation_id,
        state.lead_id,
    )
    return state


def _deterministic_tool_calls(
    state: PipelineState,
    *,
    resolved_query: str,
    search_query: str,
    top_k: int,
) -> list[tuple[str, dict[str, Any]]]:
    normalized = _normalize_text(resolved_query)
    topic = str((state.resolved_context or {}).get("topic") or "").strip().lower()
    is_curriculum_topic = topic in {"curriculum", "course_credits"}
    calls: list[tuple[str, dict[str, Any]]] = []

    if _looks_like_program_list(normalized):
        major_type = toolset.infer_major_type_from_text(resolved_query)
        calls.append(
            (
                "get_all_majors",
                {
                    "limit": 100,
                    "major_type": major_type.value if major_type is not None else None,
                },
            )
        )
        calls.append(("search_vector", {"query": search_query, "top_k": min(top_k, 5)}))
        return calls

    if state.intent == "tuition_lookup" or _looks_like_tuition(normalized):
        calls.append(("get_tuition_by_major", {"name_or_code": resolved_query, "limit": 10}))
        calls.append(("search_vector", {"query": search_query, "top_k": min(top_k, 10)}))
        return calls

    if (
        state.intent == "admission_requirement"
        or _looks_like_requirement(normalized)
        or state.intent == "scholarship_lookup"
        or _looks_like_scholarship(normalized)
        or state.intent == "timeline_process"
        or _looks_like_timeline(normalized)
    ):
        calls.append(("search_hybrid", {"query": search_query, "top_k": min(top_k, 10)}))
        return calls

    if state.intent == "program_info" and not _looks_like_program_list(normalized):
        if is_curriculum_topic:
            calls.append(("get_major_info", {"name_or_code": resolved_query}))
            calls.append(("search_hybrid", {"query": search_query, "top_k": min(max(top_k, 8), 12)}))
            return calls
        calls.append(("get_major_info", {"name_or_code": resolved_query}))
        calls.append(("get_tuition_by_major", {"name_or_code": resolved_query, "limit": 10}))
        calls.append(("search_vector", {"query": search_query, "top_k": min(top_k, 5)}))
        return calls

    return calls


def _fast_fallback_tool_calls(
    *,
    search_query: str,
    top_k: int,
) -> list[tuple[str, dict[str, Any]]]:
    if not search_query:
        return []

    compact_top_k = min(top_k, 8)
    return [("search_hybrid", {"query": search_query, "top_k": compact_top_k})]


def _execute_tool(tool_name: str, *, args: dict[str, Any], db, query: str, top_k: int) -> dict[str, Any]:
    if tool_name == "get_all_majors":
        limit = _safe_int(args.get("limit"), default=30)
        major_type = args.get("major_type")
        if major_type is None:
            inferred_major_type = toolset.infer_major_type_from_text(query)
            major_type = inferred_major_type.value if inferred_major_type is not None else None
        return toolset.get_all_majors(
            db,
            limit=max(1, min(limit, 200)),
            major_type=str(major_type).strip() if major_type is not None else None,
        )

    if tool_name == "get_major_info":
        name_or_code = str(args.get("name_or_code", query)).strip() or query
        return toolset.get_major_info(db, name_or_code=name_or_code)

    if tool_name == "get_tuition_by_major":
        name_or_code = str(args.get("name_or_code", query)).strip() or query
        year = args.get("year")
        limit = _safe_int(args.get("limit"), default=10)
        return toolset.get_tuition_by_major(
            db,
            name_or_code=name_or_code,
            year=_safe_optional_int(year),
            limit=max(1, min(limit, 10)),
        )

    if tool_name == "search_db":
        q = str(args.get("query", query)).strip() or query
        k = _safe_int(args.get("top_k"), default=top_k)
        return toolset.search_db(db, query=q, top_k=max(1, min(k, 50)))

    if tool_name == "search_vector":
        q = str(args.get("query", query)).strip() or query
        k = _safe_int(args.get("top_k"), default=top_k)
        return toolset.search_vector(db, query=q, top_k=max(1, min(k, 50)))

    if tool_name == "search_hybrid":
        q = str(args.get("query", query)).strip() or query
        k = _safe_int(args.get("top_k"), default=top_k)
        return toolset.search_hybrid(db, query=q, top_k=max(1, min(k, 50)))

    return {"tool": tool_name, "error": "Unknown tool"}


def _map_tool_output_to_candidates(tool_name: str, output: dict[str, Any]) -> list[dict[str, Any]]:
    if tool_name == "get_all_majors":
        return _major_list_to_candidates(output)
    if tool_name == "get_major_info":
        return _major_info_to_candidates(output)
    if tool_name == "get_tuition_by_major":
        return _tuition_to_candidates(output)
    if tool_name in {"search_db", "search_vector", "search_hybrid"}:
        items = output.get("candidates", [])
        return items if isinstance(items, list) else []
    return []


def _normalize_tool_calls(calls: list[tuple[str, dict[str, Any]]]) -> list[tuple[str, dict[str, Any]]]:
    if not calls:
        return []

    normalized: list[tuple[str, dict[str, Any]]] = []
    seen_signatures: set[str] = set()
    has_hybrid = any(tool_name == "search_hybrid" for tool_name, _ in calls)

    for tool_name, args in calls:
        if has_hybrid and tool_name in {"search_db", "search_vector"}:
            continue

        cleaned_args = _clean_tool_args(tool_name, args)
        signature = json.dumps([tool_name, cleaned_args], ensure_ascii=False, sort_keys=True, default=str)
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)
        normalized.append((tool_name, cleaned_args))

    return normalized[:3]


def _clean_tool_args(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    allowed_fields = {
        "get_all_majors": {"limit", "major_type"},
        "get_major_info": {"name_or_code"},
        "get_tuition_by_major": {"name_or_code", "year", "limit"},
        "search_db": {"query", "top_k"},
        "search_vector": {"query", "top_k"},
        "search_hybrid": {"query", "top_k"},
    }
    allowed = allowed_fields.get(tool_name, set())
    return {key: value for key, value in (args or {}).items() if key in allowed}


def _safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _safe_optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _merge_candidates(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for item in items:
        key = str(item.get("chunk_id")) if item.get("chunk_id") is not None else _fallback_candidate_key(item)
        if key not in merged:
            merged[key] = item
            continue
        merged[key]["score"] = max(float(merged[key].get("score", 0.0)), float(item.get("score", 0.0)))
        merged[key]["path"] = f"{merged[key].get('path', '')}+{item.get('path', '')}".strip("+")
    return sorted(merged.values(), key=lambda x: float(x.get("score", 0.0)), reverse=True)


def _select_top_candidates(items: list[dict[str, Any]], *, top_k: int) -> list[dict[str, Any]]:
    protected = [
        item
        for item in items
        if str(item.get("path") or "").startswith("tool:")
    ]
    protected_keys = {_candidate_identity(item) for item in protected}
    remaining = [
        item
        for item in items
        if _candidate_identity(item) not in protected_keys
    ]

    selected = protected[:top_k]
    if len(selected) < top_k:
        selected.extend(remaining[: top_k - len(selected)])
    return selected


def _needs_hybrid_context_expansion(
    *,
    state: PipelineState,
    resolved_query: str,
    collected: list[dict[str, Any]],
    used_tools: list[str],
    max_hybrid_top_k: int,
) -> bool:
    if "search_hybrid" not in used_tools:
        return False
    if max_hybrid_top_k <= 0 or max_hybrid_top_k > 6:
        return False

    # Expand only when hybrid returned no supporting evidence at all.
    support_candidates = [item for item in collected if _is_support_candidate(item)]
    if support_candidates:
        return False

    normalized = _normalize_text(resolved_query)
    is_program_list = _looks_like_program_list(normalized)
    is_program_detail = state.intent == "program_info" and not is_program_list
    if not (is_program_list or is_program_detail):
        return False

    return True


def _is_support_candidate(item: dict[str, Any]) -> bool:
    path = str(item.get("path") or "").strip().lower()
    if path.startswith("tool:"):
        return False
    return any(marker in path for marker in {"dense", "sparse", "hybrid"})


def _candidate_identity(item: dict[str, Any]) -> str:
    if item.get("chunk_id") is not None:
        return str(item.get("chunk_id"))
    return _fallback_candidate_key(item)


def _major_list_to_candidates(output: dict[str, Any]) -> list[dict[str, Any]]:
    items = output.get("items", [])
    if not isinstance(items, list):
        return []

    grouped: dict[str, list[str]] = {
        "UNDERGRAD_MAJOR": [],
        "GRAD_MAJOR": [],
        "CERTIFICATE_PROGRAM": [],
        "OTHER": [],
    }
    for item in items:
        code = str(item.get("code", "")).strip()
        name = str(item.get("name", "")).strip()
        credits = item.get("credits")
        major_type = item.get("major_type")
        if not (code or name):
            continue
        extras = []
        if credits is not None:
            extras.append(f"credits={credits}")
        suffix = f" - {', '.join(extras)}" if extras else ""
        group_key = major_type if major_type in grouped else "OTHER"
        grouped[group_key].append(f"- {name} ({code}){suffix}")

    sections: list[str] = []
    labels = {
        "UNDERGRAD_MAJOR": "Undergraduate programs",
        "GRAD_MAJOR": "Graduate programs",
        "CERTIFICATE_PROGRAM": "Certificate programs",
        "OTHER": "Other active programs",
    }
    for key in ["UNDERGRAD_MAJOR", "GRAD_MAJOR", "CERTIFICATE_PROGRAM", "OTHER"]:
        lines = grouped[key]
        if lines:
            sections.append(f"{labels[key]}:\n" + "\n".join(lines))

    if not sections:
        return []

    return [
        {
            "chunk_id": None,
            "category": "MAJOR_INFO",
            "source": "major_table",
            "content": "List of active VinUniversity majors/programs:\n" + "\n\n".join(sections),
            "score": 0.9,
            "path": "tool:get_all_majors",
            "tool_payload": {"items": items},
        }
    ]


def _major_info_to_candidates(output: dict[str, Any]) -> list[dict[str, Any]]:
    item = output.get("item")
    if not isinstance(item, dict):
        return []

    name = str(item.get("name", "")).strip()
    code = str(item.get("code", "")).strip()
    duration = item.get("duration")
    credits = item.get("credits")
    degree_type = item.get("degree_type")
    major_type = item.get("major_type")
    description = str(item.get("description") or "").strip()
    major_id = str(item.get("id", "")).strip()

    content = (
        f"Program information: {name} ({code}). "
        f"Program type: {major_type}. Degree type: {degree_type}. "
        f"Duration: {duration} years. Credits: {credits}. "
        f"Description: {description}"
    ).strip()

    return [
        {
            "chunk_id": None,
            "category": "MAJOR_INFO",
            "source": "major_table",
            "content": content,
            "score": 0.94,
            "path": "tool:get_major_info",
            "tool_payload": {"major_id": major_id, **item},
        }
    ]


def _tuition_to_candidates(output: dict[str, Any]) -> list[dict[str, Any]]:
    major = output.get("major") or {}
    items = output.get("items", [])
    if not isinstance(items, list) or not items:
        return []

    major_name = str(major.get("name", "")).strip()
    major_code = str(major.get("code", "")).strip()
    lines: list[str] = []
    for item in items:
        lines.append(
            (
                f"- Year {item.get('year')}: {item.get('base_fee')} "
                f"(fee type: {item.get('fee_type')})"
            ).strip()
        )

    return [
        {
            "chunk_id": None,
            "category": "TUITION_POLICY",
            "source": "tuition_policy_table",
            "content": f"Tuition information for {major_name} ({major_code}):\n" + "\n".join(lines),
            "score": 0.96,
            "path": "tool:get_tuition_by_major",
            "tool_payload": {"major": major, "items": items},
        }
    ]


def _fallback_candidate_key(item: dict[str, Any]) -> str:
    source = str(item.get("source", ""))
    category = str(item.get("category", ""))
    content = str(item.get("content", ""))
    return f"{source}|{category}|{hash(content)}"


def _infer_retrieval_mode(used_tools: list[str]) -> str:
    normalized = set(used_tools)
    has_db = "search_db" in normalized
    has_vector = "search_vector" in normalized
    has_hybrid = "search_hybrid" in normalized
    has_relational_tool = bool({"get_all_majors", "get_major_info", "get_tuition_by_major"} & normalized)

    if has_hybrid or (has_db and has_vector):
        return "hybrid"
    if has_vector and has_relational_tool:
        return "hybrid"
    if has_vector:
        return "dense"
    if has_db:
        return "sparse"
    if has_relational_tool:
        return "tool"
    return "none"


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    results: list[str] = []
    seen: set[str] = set()
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        results.append(item)
    return results


def _normalize_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
    normalized = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    normalized = normalized.lower().strip()
    normalized = " ".join(normalized.split())
    return normalized.replace("nghanh", "nganh").replace("viuni", "vinuni")


def _looks_like_program_list(value: str) -> bool:
    has_program = any(token in value for token in ["nganh", "chuong trinh", "program", "major"])
    if not has_program:
        return False

    strong_list_markers = [
        "tat ca",
        "toan bo",
        "danh sach",
        "list of",
        "all",
    ]
    if any(marker in value for marker in strong_list_markers):
        return True

    weak_list_markers = [
        "cac nganh",
        "nhung nganh",
        "cac chuong trinh",
        "nhung chuong trinh",
    ]
    institution_or_catalog_markers = [
        "vinuni",
        "vinuniversity",
        "dao tao",
        "dang dao tao",
        "hien dang dao tao",
        "co nhung",
        "hien co",
    ]
    return any(marker in value for marker in weak_list_markers) and any(
        marker in value for marker in institution_or_catalog_markers
    )


def _looks_like_tuition(value: str) -> bool:
    return any(token in value for token in ["hoc phi", "tuition", "chi phi", "phi dao tao"])


def _looks_like_scholarship(value: str) -> bool:
    return any(token in value for token in ["hoc bong", "scholarship", "financial aid", "ho tro tai chinh"])


def _looks_like_requirement(value: str) -> bool:
    if "ung tuyen" in value and any(token in value for token in ["chuan bi", "can gi", "can phai", "ho so"]):
        return True

    tokens = [
        "dieu kien",
        "yeu cau",
        "requirement",
        "diem dau vao",
        "dau vao",
        "nhap hoc",
        "ho so ung tuyen",
        "ho so tuyen sinh",
        "admission requirement",
        "admission score",
    ]
    return any(token in value for token in tokens)


def _looks_like_timeline(value: str) -> bool:
    tokens = [
        "deadline",
        "thoi han",
        "lich tuyen sinh",
        "quy trinh",
        "ung tuyen",
        "apply",
        "application process",
    ]
    return any(token in value for token in tokens)
