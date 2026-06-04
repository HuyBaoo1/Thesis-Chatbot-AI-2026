from src.services.chat_pipeline.types import PipelineState


_BLOCKED_PATTERNS = {
    "self-harm",
    "suicide",
    "suicide method",
    "kill myself",
    "end my life",
    "how to die",
    "tự tử",
    "tự sát",
    "cách chết",
    "muốn chết",
    "bomb",
    "bomb making",
    "explosive",
    "make a bomb",
    "build weapon",
    "kill someone",
    "how to kill",
    "giết người",
    "cách giết",
    "chế tạo bom",
    "thuốc nổ",
    "sql injection",
    "hack account",
    "hack facebook",
    "hack gmail",
    "bypass password",
    "crack password",
    "ddos",
    "phishing",
    "exploit",
    "tấn công hệ thống",
    "hack hệ thống",
    "scam",
    "how to scam",
    "lừa đảo",
    "giả mạo",
    "fake identity",
    "rửa tiền",
    "money laundering",
    "drug",
    "buy drugs",
    "make drugs",
    "meth",
    "ma túy",
    "chất kích thích",
    "rape",
    "child porn",
    "sex with minor",
    "hiếp dâm",
    "ấu dâm",
}


def run_input_guardrails(state: PipelineState) -> PipelineState:
    q = state.query.lower()
    for pattern in _BLOCKED_PATTERNS:
        if pattern in q:
            state.blocked = True
            state.block_reason = f"Blocked by safety policy: {pattern}"
            return state

    if len(state.query.strip()) < 2:
        state.blocked = True
        state.block_reason = "Query is too short"
    return state


def run_output_guardrails(state: PipelineState) -> PipelineState:
    if not state.answer.strip():
        state.answer = "Mình chưa đủ dữ liệu để trả lời chính xác. Bạn có thể hỏi rõ hơn không?"
        state.confidence = 0.2
        return state

    if not state.needs_retrieval or state.answer_mode in {"direct", "clarify", "history"}:
        return state

    if not state.reranked:
        state.answer = (
            "Hiện mình chưa tìm thấy nguồn dữ liệu phù hợp trong hệ thống để trả lời chắc chắn. "
            "Bạn thử cung cấp thêm ngành hoặc năm tuyển sinh nhé."
        )
        state.confidence = min(state.confidence, 0.35)
    return state
