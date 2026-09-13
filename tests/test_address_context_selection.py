from types import SimpleNamespace
from uuid import uuid4

from src.models.enums import Channel, ConversationStatus
from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.query_expansion import expand_query_state
from src.services.chat_pipeline.retrieval_orchestrator import run_retrieval_orchestrator
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.types import PipelineState


CANONICAL_ADDRESS_CHUNK_ID = "c620c760-5854-415a-aafe-32109188fc58"


def test_generic_address_query_selects_canonical_contact_address(monkeypatch):
    captured_queries: list[str] = []

    def fake_search_hybrid(_db, *, query: str, top_k: int):
        captured_queries.append(query)
        if {"address", "campus", "contact"} <= set(query.lower().split()):
            candidates = [
                _contact_hotline_candidate(score=0.13),
                _canonical_address_candidate(score=0.12),
                _other_contact_candidate(score=0.11),
            ]
        else:
            candidates = [
                _contact_hotline_candidate(score=0.13),
                _process_candidate(score=0.12),
                _other_contact_candidate(score=0.11),
            ]
        return {"tool": "search_hybrid", "candidates": candidates[:top_k]}

    monkeypatch.setattr(
        "src.services.chat_pipeline.retrieval_orchestrator.toolset.search_hybrid",
        fake_search_hybrid,
    )

    state = PipelineState(
        query="Dia chi VGU o dau?",
        intent="school_info",
        answer_mode="retrieve",
        needs_retrieval=True,
        needs_tools=True,
        resolved_query="Dia chi VGU o dau?",
        top_k=10,
    )

    state = expand_query_state(state)
    state = run_retrieval_orchestrator(state, db=None)
    state = run_rerank(state, keep=5)
    state = build_context_block(state)

    assert captured_queries
    assert "address" in captured_queries[0].lower()
    assert "campus" in captured_queries[0].lower()
    assert "contact" in captured_queries[0].lower()
    assert _selected_chunk_ids(state)[:1] == [CANONICAL_ADDRESS_CHUNK_ID]
    assert "Ring road 4, Thoi An Quarter, Thoi Hoa Ward, Ho Chi Minh City" in state.context_block


def test_telegram_existing_lead_delegates_generic_address_to_shared_pipeline(monkeypatch):
    import src.services.telegram_service as telegram_service
    import src.services.chat_pipeline.pipeline as pipeline

    lead_id = uuid4()
    conversation_id = uuid4()
    captured_request = None
    sent_messages: list[str] = []

    class _Query:
        def filter(self, *args, **kwargs):
            return self

        def order_by(self, *args, **kwargs):
            return self

        def first(self):
            return SimpleNamespace(
                id=conversation_id,
                lead_id=lead_id,
                channel=Channel.TELEGRAM,
                status=ConversationStatus.OPEN,
                external_id="12345",
            )

    class _Db:
        def query(self, _model):
            return _Query()

    def fake_run_chat_pipeline(request, _db):
        nonlocal captured_request
        captured_request = request
        return {
            "answer": "Dia chi VGU: Ring road 4, Thoi An Quarter, Thoi Hoa Ward, Ho Chi Minh City.",
            "follow_up_suggestions": [],
        }

    monkeypatch.setattr(pipeline, "run_chat_pipeline", fake_run_chat_pipeline)
    monkeypatch.setattr(telegram_service, "send_message", lambda _chat_id, text, **_kwargs: sent_messages.append(text))

    telegram_service._handle_existing_lead(
        SimpleNamespace(id=lead_id),
        chat_id=12345,
        text="Dia chi VGU o dau?",
        db=_Db(),
    )

    assert captured_request is not None
    assert captured_request.query == "Dia chi VGU o dau?"
    assert captured_request.conversation_id == conversation_id
    assert "Ring road 4" in sent_messages[0]
    assert "High-Tech Park" not in sent_messages[0]
    assert "Khu Cong nghe cao" not in sent_messages[0]


def _selected_chunk_ids(state: PipelineState) -> list[str]:
    return [str(item.get("chunk_id")) for item in state.reranked]


def _canonical_address_candidate(*, score: float) -> dict:
    return {
        "chunk_id": CANONICAL_ADDRESS_CHUNK_ID,
        "title": "Thong tin lien he VGU - part 6/7",
        "category": "FAQ",
        "source": "https://vgu.edu.vn/contact-us",
        "source_url": "https://vgu.edu.vn/contact-us",
        "content": (
            "## Binh Duong Campus\n"
            "Ring road 4, Thoi An Quarter, Thoi Hoa Ward, Ho Chi Minh City\n"
            "Tel. : (0274) 222 0990\n"
            "Fax : (0274) 222 0980"
        ),
        "score": score,
        "path": "dense+sparse",
    }


def _contact_hotline_candidate(*, score: float) -> dict:
    return {
        "chunk_id": "contact-hotline",
        "title": "Thong tin lien he VGU - part 4/7",
        "category": "FAQ",
        "source": "https://vgu.edu.vn/contact-us",
        "source_url": "https://vgu.edu.vn/contact-us",
        "content": "Information about Study Programs and Application Hotline: +84 (0) 988.54.52.54 Email: study@vgu.edu.vn",
        "score": score,
        "path": "dense+sparse",
    }


def _other_contact_candidate(*, score: float) -> dict:
    return {
        "chunk_id": "other-contact",
        "title": "Thong tin lien he VGU - part 7/7",
        "category": "FAQ",
        "source": "https://vgu.edu.vn/contact-us",
        "source_url": "https://vgu.edu.vn/contact-us",
        "content": "VGU City Office in Ho Chi Minh City, 5th Floor, L'Mark Orchard Park View Building.",
        "score": score,
        "path": "dense",
    }


def _process_candidate(*, score: float) -> dict:
    return {
        "chunk_id": "process",
        "title": "VGU Admissions Overview",
        "category": "PROCESS",
        "source": "https://vgu.edu.vn/admission",
        "source_url": "https://vgu.edu.vn/admission",
        "content": "Bachelor program links shown on the admissions overview page.",
        "score": score,
        "path": "sparse",
    }
