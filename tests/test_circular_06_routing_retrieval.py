from src.services.chat_pipeline.query_expansion import expand_query_state
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.router_agent import run_router_agent
from src.services.chat_pipeline.types import PipelineState


def _route_to_retrieval(state: PipelineState) -> PipelineState:
    state.answer_mode = "retrieve"
    state.needs_retrieval = True
    state.needs_tools = True
    state.needs_clarification = False
    state.resolved_query = state.query
    return state


def test_admission_result_retention_does_not_match_application_process(monkeypatch):
    monkeypatch.setattr(
        "src.services.chat_pipeline.router_agent.run_router_llm",
        _route_to_retrieval,
    )

    state = run_router_agent(
        PipelineState(
            query=(
                "Theo Điều 10 Thông tư 06/2026/TT-BGDĐT, những trường hợp nào "
                "được bảo lưu kết quả trúng tuyển và thời gian tối đa là bao lâu?"
            )
        )
    )

    assert state.answer_mode == "retrieve"
    assert state.needs_retrieval is True
    assert state.needs_clarification is False


def test_generic_application_process_still_asks_for_scope(monkeypatch):
    def fail_if_llm_called(_state: PipelineState) -> PipelineState:
        raise AssertionError("Generic application process must clarify deterministically")

    monkeypatch.setattr(
        "src.services.chat_pipeline.router_agent.run_router_llm",
        fail_if_llm_called,
    )

    state = run_router_agent(PipelineState(query="Quy trình ứng tuyển như thế nào?"))

    assert state.answer_mode == "clarify"
    assert state.needs_retrieval is False
    assert state.needs_clarification is True


def test_bonus_points_query_does_not_expand_to_gpa_score_terms():
    state = expand_query_state(
        PipelineState(
            query=(
                "Theo Thông tư 06/2026/TT-BGDĐT, tổng điểm cộng tối đa chiếm "
                "bao nhiêu phần trăm thang điểm xét tuyển?"
            )
        )
    )

    expansion = state.search_query.split(" | ", maxsplit=1)
    assert len(expansion) == 1 or all(
        term not in expansion[1].split() for term in {"gpa", "grade", "score"}
    )


def test_gpa_query_keeps_score_synonym_expansion():
    state = expand_query_state(PipelineState(query="Điểm GPA đầu vào là bao nhiêu?"))

    assert " | " in state.search_query
    added_terms = set(state.search_query.split(" | ", maxsplit=1)[1].split())
    assert {"grade", "score"}.issubset(added_terms)


def test_explicit_circular_query_excludes_conflicting_policy_document():
    circular_source = "Ban hành Quy chế tuyển sinh đại học.md"
    state = PipelineState(
        query=(
            "Theo Điều 10 Thông tư 06/2026/TT-BGDĐT, những trường hợp nào "
            "được bảo lưu kết quả trúng tuyển và thời gian tối đa là bao lâu?"
        ),
        candidates=[
            _candidate(
                chunk_id="vgu-policy",
                source="20260312_181_QD-DHVD_Admission_Regulation.md",
                score=0.29,
                content=(
                    "Thời gian bảo lưu là 01 năm đối với bệnh nặng và 03 năm "
                    "đối với nghĩa vụ quân sự."
                ),
            ),
            _candidate(
                chunk_id="circular-article-10",
                source=circular_source,
                score=0.27,
                content=(
                    "Điều 10. Thời gian tối đa được bảo lưu kết quả do cơ sở đào tạo "
                    "quy định, nhưng không quá 36 tháng."
                ),
            ),
            _candidate(
                chunk_id="vgu-policy-reference",
                source="20260312_181_QD-DHVD_Admission_Regulation.md",
                score=0.21,
                content=(
                    "Điều kiện trúng tuyển của VGU được xây dựng theo quy định. "
                    + ("Nội dung riêng của trường. " * 40)
                    + "Tham chiếu Thông tư 06/2026/TT-BGDĐT."
                ),
            ),
            _candidate(
                chunk_id="circular-cover",
                source=circular_source,
                score=0.19,
                content=(
                    "BỘ GIÁO DỤC VÀ ĐÀO TẠO. Số: 06/2026/TT-BGDĐT. "
                    "THÔNG TƯ ban hành Quy chế tuyển sinh."
                ),
            ),
        ],
    )

    state = run_rerank(state, keep=5)

    assert state.reranked
    assert state.reranked[0]["chunk_id"] == "circular-article-10"
    assert {item["source"] for item in state.reranked} == {circular_source}


def _candidate(*, chunk_id: str, source: str, score: float, content: str) -> dict:
    return {
        "chunk_id": chunk_id,
        "title": source,
        "category": "REQUIREMENT",
        "source": source,
        "year": 2026,
        "content": content,
        "score": score,
        "path": "dense+sparse",
    }
