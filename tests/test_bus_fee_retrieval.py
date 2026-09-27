from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.query_expansion import expand_query_state
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.retrieval_orchestrator import run_retrieval_orchestrator
from src.services.chat_pipeline.types import PipelineState


DAILY_BUS_FEE_CHUNK_ID = "1c16f3d9-099e-450b-9295-4bea4a3b8010"


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
