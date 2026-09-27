import pytest

from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.direct_response import run_clarification_response
from src.services.chat_pipeline.query_expansion import expand_query_state
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.retrieval_orchestrator import run_retrieval_orchestrator
from src.services.chat_pipeline.router_agent import run_router_agent
from src.services.chat_pipeline.types import PipelineState


DAILY_BUS_FEE_CHUNK_ID = "1c16f3d9-099e-450b-9295-4bea4a3b8010"


@pytest.mark.parametrize(
    ("query", "expected_phrases"),
    [
        (
            "Cho tôi hỏi phí xe bus năm 2026",
            ("hằng ngày", "hằng tuần", "một chiều/khứ hồi", "thạc sĩ"),
        ),
        (
            "Tôi muốn biết vé xe dành cho sinh viên",
            ("hằng ngày", "hằng tuần", "một chiều/khứ hồi", "thạc sĩ"),
        ),
        (
            "What are the VGU bus fees for 2026?",
            ("daily", "weekly", "one-way/round-trip", "master"),
        ),
    ],
)
def test_generic_bus_fee_query_asks_for_service_scope(
    monkeypatch,
    query,
    expected_phrases,
):
    def fake_llm_route(state):
        state.answer_mode = "retrieve"
        state.needs_retrieval = True
        state.resolved_query = state.query
        return state

    monkeypatch.setattr(
        "src.services.chat_pipeline.router_agent.run_router_llm",
        fake_llm_route,
    )

    state = run_router_agent(PipelineState(query=query))
    state = run_clarification_response(state)

    assert state.answer_mode == "clarify"
    assert state.needs_clarification is True
    assert state.needs_retrieval is False
    assert all(phrase in state.answer.lower() for phrase in expected_phrases)


@pytest.mark.parametrize(
    "query",
    [
        "Phí xe hằng ngày từ Hàng Xanh năm 2026 là bao nhiêu?",
        "Phí xe hằng tuần là bao nhiêu?",
        "Vé xe một chiều từ TP.HCM đến VGU giá bao nhiêu?",
        "Phí xe cuối tuần cho học viên thạc sĩ là bao nhiêu?",
        "Thanh toán phí xe bus bằng cách nào?",
        "Chính sách hoàn phí xe bus như thế nào?",
        "How much is the daily VGU bus service?",
    ],
)
def test_scoped_bus_service_query_continues_to_retrieval(monkeypatch, query):
    def fake_llm_route(state):
        state.answer_mode = "retrieve"
        state.needs_retrieval = True
        state.needs_clarification = False
        state.resolved_query = state.query
        return state

    monkeypatch.setattr(
        "src.services.chat_pipeline.router_agent.run_router_llm",
        fake_llm_route,
    )

    state = run_router_agent(PipelineState(query=query))

    assert state.answer_mode == "retrieve"
    assert state.needs_retrieval is True
    assert state.needs_clarification is False


def test_bus_service_scope_follow_up_reuses_recent_bus_question(monkeypatch):
    def fail_if_llm_called(_state):
        raise AssertionError("A scoped bus follow-up should route deterministically")

    monkeypatch.setattr(
        "src.services.chat_pipeline.router_agent.run_router_llm",
        fail_if_llm_called,
    )
    state = PipelineState(
        query="Hằng ngày",
        chat_history=[
            {"role": "user", "content": "Cho tôi hỏi phí xe bus năm 2026"},
            {
                "role": "assistant",
                "content": (
                    "Bạn muốn hỏi phí xe hằng ngày, xe hằng tuần, vé một chiều/khứ hồi, "
                    "hay xe cuối tuần dành cho học viên thạc sĩ?"
                ),
            },
        ],
    )

    state = run_router_agent(state)

    assert state.answer_mode == "retrieve"
    assert state.needs_retrieval is True
    assert state.needs_clarification is False
    assert state.rewrite_query is True
    assert "phí xe bus năm 2026" in state.resolved_query
    assert "hằng ngày" in state.resolved_query


@pytest.mark.parametrize(
    ("query", "included_term", "excluded_terms"),
    [
        ("Phí xe bus hằng ngày", "daily bus", ("weekly bus", "one-way ticket", "weekend bus")),
        ("Phí xe bus hằng tuần", "weekly bus", ("daily bus", "one-way ticket", "weekend bus")),
        ("Vé xe bus một chiều", "one-way ticket", ("daily bus", "weekly bus", "weekend bus")),
        ("Xe bus cuối tuần cho thạc sĩ", "weekend bus", ("daily bus", "weekly bus", "one-way ticket")),
    ],
)
def test_scoped_bus_query_expansion_does_not_mix_service_categories(
    query,
    included_term,
    excluded_terms,
):
    state = expand_query_state(PipelineState(query=query))

    assert included_term in state.search_query
    assert all(term not in state.search_query for term in excluded_terms)


def test_polite_vietnamese_bus_fee_query_keeps_answer_bearing_evidence(monkeypatch):
    captured_queries: list[str] = []

    def fake_search_hybrid(_db, *, query: str, top_k: int):
        captured_queries.append(query)
        normalized = query.lower()
        candidates = [
            _candidate("cover", "Bus service fees 2026-2027 announcement", 0.13),
            _candidate("payment", "Payment methods for the bus service", 0.12),
            _candidate("contact", "Bus service contact information", 0.11),
            _candidate("recipients", "Recipients: all VGU students", 0.10),
        ]
        if "bus service fees" in normalized and "daily bus" in normalized:
            candidates.append(
                _candidate(
                    DAILY_BUS_FEE_CHUNK_ID,
                    "Daily bus service fees: Hang Xanh fare is 8,800,000 VND.",
                    0.14,
                )
            )
        return {"tool": "search_hybrid", "candidates": candidates[:top_k]}

    monkeypatch.setattr(
        "src.services.chat_pipeline.retrieval_orchestrator.toolset.search_hybrid",
        fake_search_hybrid,
    )

    state = PipelineState(
        query="Cho toi hoi phi xe bus nam 2026",
        intent="general_question",
        resolved_query="Cho toi hoi phi xe bus nam 2026",
        top_k=10,
    )

    state = expand_query_state(state)
    state = run_retrieval_orchestrator(state, db=None)
    state = run_rerank(state, keep=5)
    state = build_context_block(state)

    assert captured_queries
    assert "bus service fees" in captured_queries[0].lower()
    assert "daily bus" in captured_queries[0].lower()
    assert DAILY_BUS_FEE_CHUNK_ID in {
        str(item.get("chunk_id")) for item in state.reranked
    }
    assert "8,800,000 VND" in state.context_block


def test_business_query_does_not_trigger_bus_expansion():
    state = PipelineState(query="Business Administration at VGU")

    state = expand_query_state(state)

    assert state.search_query == "Business Administration at VGU"


def _candidate(chunk_id: str, content: str, score: float) -> dict:
    return {
        "chunk_id": chunk_id,
        "title": "VGU Student Bus Service Fees 2026-2027",
        "category": "FAQ",
        "source": "VGU Student Bus Service Fees 2026-2027.md",
        "year": 2026,
        "content": content,
        "score": score,
        "path": "dense+sparse",
    }
