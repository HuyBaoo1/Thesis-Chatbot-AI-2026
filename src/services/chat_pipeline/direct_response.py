import unicodedata

from src.services.chat_pipeline.types import PipelineState


def run_direct_response(state: PipelineState) -> PipelineState:
    state.retrieval_mode = "direct"
    state.selected_tools = []
    state.candidates = []
    state.reranked = []

    q = _normalize_for_matching(state.query)

    if _looks_like_profile_update(q):
        state.answer = (
            "Mình đã ghi nhận thông tin của bạn. "
            "Bạn có thể hỏi tiếp về ngành học, học phí, học bổng hoặc điều kiện tuyển sinh."
        )

    elif _looks_like_thanks(q):
        state.answer = (
            "Rất vui được hỗ trợ bạn. "
            "Bạn cứ hỏi tiếp nếu cần làm rõ thêm thông tin tuyển sinh nhé."
        )

    elif _looks_like_acknowledgement(q):
        state.answer = "Vâng, bạn cần mình hỗ trợ thêm thông tin tuyển sinh nào không?"

    else:
        name = (state.lead_profile or {}).get("full_name")
        greeting = f"Chào {name}," if name else "Chào bạn,"
        state.answer = (
            f"{greeting} mình là trợ lý tuyển sinh. "
            "Mình có thể hỗ trợ bạn về ngành học, học phí, học bổng, deadline và điều kiện tuyển sinh."
        )

    state.confidence = 0.9
    state.follow_up_suggestions = _default_direct_suggestions()
    return state


def run_clarification_response(state: PipelineState) -> PipelineState:
    state.retrieval_mode = "clarify"
    state.selected_tools = []
    state.candidates = []
    state.reranked = []

    state.answer = (
        state.clarification_question
        or "Bạn cho mình thêm tên ngành, bậc học hoặc năm tuyển sinh để mình tra cứu chính xác hơn nhé."
    )

    state.confidence = 0.75
    state.follow_up_suggestions = [
        "Bạn đang quan tâm ngành nào?",
        "Bạn muốn xem học phí, học bổng hay điều kiện tuyển sinh?",
    ]

    return state


def _looks_like_profile_update(query: str) -> bool:
    markers = [
        "@",
        "gpa cua em",
        "gpa cua toi",
        "gpa em",
        "gpa toi",
        "ielts cua em",
        "ielts cua toi",
        "ielts em",
        "ielts toi",
        "sat cua em",
        "sat cua toi",
        "sat em",
        "sat toi",
        "act cua em",
        "act cua toi",
        "act em",
        "act toi",
        "email cua em",
        "email cua toi",
        "email em",
        "email toi",
        "phone cua em",
        "phone cua toi",
        "phone em",
        "so dien thoai",
        "so dien thoai cua toi",
        "so dien thoai cua em",
        "sdt",
        "sdt cua toi",
        "sdt cua em",
        "em hoc truong",
        "toi hoc truong",
        "truong cua toi",
        "truong cua em",
        "truong thpt",
        "high school",
        "province cua em",
        "province cua toi",
        "city cua em",
        "city cua toi",
        "tinh em",
        "tinh cua em",
        "tinh toi",
        "tinh cua toi",
        "thanh pho em",
        "thanh pho cua em",
        "thanh pho toi",
        "thanh pho cua toi",
    ]

    return any(marker in query for marker in markers)


def _looks_like_thanks(query: str) -> bool:
    markers = {
        "cam on",
        "toi cam on",
        "em cam on",
        "minh cam on",
        "cam on ban",
        "cam on nhe",
        "cam on nha",
        "thanks",
        "thank you",
        "tks",
    }

    return any(marker in query for marker in markers)


def _looks_like_acknowledgement(query: str) -> bool:
    acknowledgements = {
        "ok",
        "oke",
        "okay",
        "da",
        "vang",
        "uh",
        "u",
        "duoc",
        "duoc roi",
        "roi",
        "hieu roi",
    }

    return query in acknowledgements


def _default_direct_suggestions() -> list[str]:
    return [
        "Bạn muốn tìm hiểu ngành học nào?",
        "Bạn muốn xem học phí hay học bổng?",
        "Bạn muốn biết điều kiện tuyển sinh không?",
    ]


def _normalize_for_matching(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("\u0111", "d").replace("\u0110", "D")
    normalized = normalized.lower().strip()

    return " ".join(normalized.split())
