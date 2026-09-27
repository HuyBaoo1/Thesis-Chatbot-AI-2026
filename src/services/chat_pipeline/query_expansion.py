import unicodedata

from src.services.chat_pipeline.types import PipelineState


SYNONYM_GROUPS = [
    {"hoc phi", "tuition", "chi phi dao tao", "fee"},
    {"hoc bong", "scholarship", "financial aid", "ho tro tai chinh"},
    {"nganh", "chuong trinh", "program", "major"},
    {"tuyen sinh", "admission", "apply", "ung tuyen"},
    {"dia chi", "address", "campus", "contact", "location", "o dau", "where"},
    {"lien he", "contact", "email", "hotline", "so dien thoai", "phone", "tu van"},
    {"overview", "portal", "link", "website", "page", "trang"},
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

BUS_SERVICE_CORE_TERMS = {
    "bus service fees",
    "xe bus",
    "xe buyt",
    "xe dua don",
}

BUS_SERVICE_SCOPE_GROUPS = [
    ({"hang ngay", "moi ngay", "daily"}, {"daily bus"}),
    ({"hang tuan", "theo tuan", "weekly"}, {"weekly bus"}),
    (
        {"mot chieu", "one way", "khu hoi", "round trip"},
        {"one-way ticket", "round-trip ticket"},
    ),
    (
        {"cuoi tuan", "weekend", "thac si", "master", "mba", "msc"},
        {"weekend bus", "master bus service"},
    ),
]


def expand_query(query: str) -> str:
    if not query or len(query.strip()) < 2:
        return query

    normalized = _normalize_for_matching(query)
    expanded_terms: set[str] = set()
    bus_service_terms = _bus_service_expansion_terms(normalized)

    for group in SYNONYM_GROUPS:
        if any(term in normalized for term in group):
            expanded_terms.update(group)

    expanded_terms.update(bus_service_terms)
    expanded_terms.difference_update(set(normalized.split()))
    if not expanded_terms:
        return query

    ordered_terms = sorted(bus_service_terms) + sorted(expanded_terms - bus_service_terms)
    return f"{query} | {' '.join(ordered_terms[:8])}"


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


def _bus_service_expansion_terms(normalized: str) -> set[str]:
    topic_phrases = ["xe bus", "xe buyt", "xe dua don", "ve xe", "phi xe", "dich vu xe"]
    has_bus_topic = "bus" in normalized.split() or any(
        phrase in normalized for phrase in topic_phrases
    )
    if not has_bus_topic:
        return set()

    scoped_terms: set[str] = set()
    for markers, aliases in BUS_SERVICE_SCOPE_GROUPS:
        if any(marker in normalized for marker in markers):
            scoped_terms.update(aliases)

    if scoped_terms:
        return BUS_SERVICE_CORE_TERMS | scoped_terms

    detail_markers = [
        "thanh toan",
        "payment",
        "hoan phi",
        "refund",
        "lien he",
        "contact",
        "dang ky",
        "register",
        "lich chay",
        "schedule",
        "lo trinh",
        "route",
    ]
    if any(marker in normalized for marker in detail_markers):
        return set(BUS_SERVICE_CORE_TERMS)

    all_scope_terms = {
        alias
        for _, aliases in BUS_SERVICE_SCOPE_GROUPS
        for alias in aliases
        if alias != "master bus service"
    }
    return BUS_SERVICE_CORE_TERMS | all_scope_terms
