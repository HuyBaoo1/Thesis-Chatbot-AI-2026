from src.services.chat_pipeline.pipeline import _build_user_visible_citations
from src.services.chat_pipeline.prompts import INSUFFICIENT_CONTEXT_ANSWER


def test_fallback_answer_hides_unanswered_context_citations():
    chunks = [
        {
            "source": "https://vgu.edu.vn/tuition-fees/for-bachelor-programs",
            "content": "Bachelor tuition fees for intake 2026",
        }
    ]

    assert _build_user_visible_citations(INSUFFICIENT_CONTEXT_ANSWER, chunks) == []


def test_grounded_answer_keeps_context_citations():
    chunks = [
        {
            "source": "https://vgu.edu.vn/tuition-fees/for-bachelor-programs",
            "content": "Bachelor tuition fees for intake 2026",
        }
    ]

    citations = _build_user_visible_citations("CSE tuition for intake 2026 is available.", chunks)

    assert citations == [{"url": "https://vgu.edu.vn/tuition-fees/for-bachelor-programs"}]
