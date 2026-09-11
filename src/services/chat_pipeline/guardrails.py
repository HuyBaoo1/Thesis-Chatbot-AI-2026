import re

from src.services.chat_pipeline.prompts import insufficient_context_answer
from src.services.chat_pipeline.types import PipelineState


_BLOCKED_PATTERNS = (
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
    "methamphetamine",
    "methamphetamines",
    "ma túy",
    "chất kích thích",
    "rape",
    "child porn",
    "sex with minor",
    "hiếp dâm",
    "ấu dâm",
)


def _matches_blocked_pattern(pattern: str, text: str) -> bool:
    normalized_pattern = " ".join(pattern.lower().split())
    if not normalized_pattern:
        return False

    pattern_parts = [re.escape(part) for part in normalized_pattern.split()]
    expression = r"\s+".join(pattern_parts)

    if normalized_pattern[0].isalnum():
        expression = r"(?<![A-Za-z0-9])" + expression
    if normalized_pattern[-1].isalnum():
        expression = expression + r"(?![A-Za-z0-9])"

    return re.search(expression, text) is not None


def run_input_guardrails(state: PipelineState) -> PipelineState:
    q = state.query.lower()
    for pattern in _BLOCKED_PATTERNS:
        if _matches_blocked_pattern(pattern, q):
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
        state.answer = insufficient_context_answer()
        state.confidence = min(state.confidence, 0.35)
    return state
