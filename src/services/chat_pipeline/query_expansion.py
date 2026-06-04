import unicodedata

from src.services.chat_pipeline.types import PipelineState


SYNONYM_GROUPS = [
    {"hoc phi", "tuition", "chi phi dao tao", "fee"},
    {"hoc bong", "scholarship", "financial aid", "ho tro tai chinh"},
    {"nganh", "chuong trinh", "program", "major"},
    {"tuyen sinh", "admission", "apply", "ung tuyen"},
    {"dieu kien", "yeu cau", "requirement", "diem dau vao", "dau vao", "nhap hoc"},
    {"thoi han", "deadline", "timeline", "lich tuyen sinh"},
    {"dai hoc", "cu nhan", "undergraduate", "bachelor"},
    {"sau dai hoc", "graduate", "postgraduate"},
    {"thac si", "master", "msc", "mba"},
    {"tien si", "phd", "doctorate"},
    {"tin chi", "credit"},
    {"diem", "gpa", "score", "grade"},
    {"tieng anh", "english", "ielts", "toefl"},
]


def expand_query(query: str) -> str:
    if not query or len(query.strip()) < 2:
        return query

    normalized = _normalize_for_matching(query)
    expanded_terms: set[str] = set()

    for group in SYNONYM_GROUPS:
        if any(term in normalized for term in group):
            expanded_terms.update(group)

    expanded_terms.difference_update(set(normalized.split()))
    if not expanded_terms:
        return query

    return f"{query} | {' '.join(sorted(expanded_terms)[:8])}"


def expand_query_state(state: PipelineState) -> PipelineState:
    base_query = (state.resolved_query or state.query or "").strip()
    if not base_query:
        return state

    if len(base_query) < 10:
        state.search_query = base_query
        return state

    if hasattr(state, "intent") and state.intent in {"greeting", "thanks", "confirm", "deny"}:
        state.search_query = base_query
        return state

    expanded = expand_query(base_query)
    state.search_query = expanded

    return state


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.replace("_", " ").replace("-", " ").replace("/", " ")
    normalized = normalized.lower().strip()
    return " ".join(normalized.split())
