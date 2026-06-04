from src.services.chat_pipeline.types import PipelineState


def build_context_block(state: PipelineState) -> PipelineState:
    grouped = {
        "major": [],
        "tuition": [],
        "other": [],
    }

    for idx, item in enumerate(state.reranked, start=1):
        category = str(item.get("category") or "").upper()
        if category == "MAJOR_INFO":
            grouped["major"].append(_format_source(idx, item))
        elif category in {"TUITION", "TUITION_POLICY"}:
            grouped["tuition"].append(_format_source(idx, item))
        else:
            grouped["other"].append(_format_source(idx, item))

    sections: list[str] = []
    for key, heading in _section_order(state):
        if grouped[key]:
            sections.append(f"### {heading}\n" + "\n\n".join(grouped[key]))

    state.context_block = "\n\n".join(sections).strip()
    return state


def _format_source(idx: int, item: dict) -> str:
    category = str(item.get("category") or "").strip()
    source = str(item.get("source") or "").strip()
    source_url = str(item.get("source_url") or "").strip()
    title = str(item.get("title") or "").strip()
    source_url_suffix = f" | source_url={source_url}" if source_url else ""
    title_suffix = f" | title={title}" if title else ""
    content = _normalize_block(str(item.get("content") or ""))
    return (
        f"[EVIDENCE {idx}] category={category} | source={source}{source_url_suffix}{title_suffix}\n"
        f"{content}"
    ).strip()


def _section_order(state: PipelineState) -> list[tuple[str, str]]:
    intent = state.intent or ""
    topic = str((state.resolved_context or {}).get("topic") or "").strip().lower()
    if intent == "program_info" and topic in {"curriculum", "course_credits"}:
        return [
            ("other", "Supporting Evidence"),
            ("major", "Major Information"),
            ("tuition", "Tuition Information"),
        ]
    if intent == "tuition_lookup":
        return [
            ("tuition", "Tuition Information"),
            ("major", "Major Information"),
            ("other", "Supporting Evidence"),
        ]
    if intent == "program_info":
        return [
            ("major", "Major Information"),
            ("tuition", "Tuition Information"),
            ("other", "Supporting Evidence"),
        ]
    if intent in {
        "scholarship_lookup",
        "admission_requirement",
        "timeline_process",
        "school_info",
    }:
        return [
            ("other", "Supporting Evidence"),
            ("major", "Major Information"),
            ("tuition", "Tuition Information"),
        ]
    return [
        ("major", "Major Information"),
        ("tuition", "Tuition Information"),
        ("other", "Supporting Evidence"),
    ]


def _normalize_block(value: str) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return text.strip()
