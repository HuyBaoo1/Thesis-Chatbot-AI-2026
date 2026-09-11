from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.types import PipelineState


def test_english_admission_methods_query_keeps_compact_method_list_in_context():
    state = _state(
        "What are the 2026 bachelor admission methods for VGU?",
        candidates=[*_high_scoring_condition_candidates(), _compact_methods_candidate(score=0.02)],
    )

    state = run_rerank(state, keep=5)
    state = build_context_block(state)

    assert state.reranked[0]["chunk_id"] == "compact-method-list"
    assert _has_all_five_methods(state.context_block)


def test_vietnamese_admission_methods_query_keeps_compact_method_list_in_context():
    state = _state(
        "Cac phuong thuc tuyen sinh dai hoc VGU nam 2026 la gi?",
        candidates=[*_high_scoring_condition_candidates(), _compact_methods_candidate(score=0.02)],
    )

    state = run_rerank(state, keep=5)
    state = build_context_block(state)

    assert state.reranked[0]["chunk_id"] == "compact-method-list"
    assert _has_all_five_methods(state.context_block)


def test_testas_requirement_query_keeps_detailed_testas_evidence():
    state = _state(
        "Dieu kien tuyen sinh dai hoc VGU 2026 theo phuong thuc TestAS la gi?",
        candidates=[*_high_scoring_condition_candidates(), _compact_methods_candidate(score=0.02)],
    )

    state = run_rerank(state, keep=5)
    selected_ids = [item["chunk_id"] for item in state.reranked]

    assert state.reranked[0]["chunk_id"] == "condition-1"
    assert "compact-method-list" not in selected_ids
    assert "Digital TestAS" in state.reranked[0]["content"]


def test_general_eligibility_query_is_not_forced_to_method_list():
    state = _state(
        "What are the general bachelor admission eligibility conditions for VGU in 2026?",
        candidates=[*_high_scoring_condition_candidates(), _compact_methods_candidate(score=0.02)],
    )

    state = run_rerank(state, keep=5)
    selected_ids = [item["chunk_id"] for item in state.reranked]

    assert state.reranked[0]["chunk_id"] == "condition-1"
    assert "compact-method-list" not in selected_ids


def _state(query: str, *, candidates: list[dict]) -> PipelineState:
    return PipelineState(
        query=query,
        intent="admission_requirement",
        answer_mode="retrieve",
        needs_retrieval=True,
        candidates=candidates,
        resolved_context={"level": "cu nhan"},
    )


def _high_scoring_condition_candidates() -> list[dict]:
    return [
        _candidate(
            chunk_id=f"condition-{index}",
            score=0.35 - (index * 0.01),
            content=(
                "Applicants admission requirements VGU 2026 bachelor. "
                "Digital TestAS condition evidence. "
                "Applicants must satisfy English requirements and score thresholds."
            ),
        )
        for index in range(1, 6)
    ]


def _compact_methods_candidate(*, score: float) -> dict:
    return _candidate(
        chunk_id="compact-method-list",
        score=score,
        content=(
            "## Cac phuong thuc tuyen sinh\n"
            "### Danh sach phuong thuc tuyen sinh dai hoc VGU 2026\n"
            "Nguon chinh thuc liet ke 5 phuong thuc tuyen sinh dai hoc VGU cho ky tuyen sinh 2026:\n"
            "1. Phuong thuc 1 - TestAS\n"
            "2. Phuong thuc 2 - Xet ket qua hoc tap THPT\n"
            "3. Phuong thuc 3 - Tuyen thang\n"
            "4. Phuong thuc 4 - Van bang/chung chi THPT quoc te\n"
            "5. Phuong thuc 5 - Ky thi tot nghiep THPT"
        ),
    )


def _candidate(*, chunk_id: str, score: float, content: str) -> dict:
    return {
        "chunk_id": chunk_id,
        "title": "Dieu kien tuyen sinh dai hoc VGU",
        "category": "REQUIREMENT",
        "source": "https://vgu.edu.vn/admission/bachelor/admission-requirements",
        "source_url": "https://vgu.edu.vn/admission/bachelor/admission-requirements",
        "year": 2026,
        "content": content,
        "score": score,
        "path": "dense",
    }


def _has_all_five_methods(value: str) -> bool:
    return all(
        marker in value
        for marker in (
            "Phuong thuc 1 - TestAS",
            "Phuong thuc 2 - Xet ket qua hoc tap THPT",
            "Phuong thuc 3 - Tuyen thang",
            "Phuong thuc 4 - Van bang/chung chi THPT quoc te",
            "Phuong thuc 5 - Ky thi tot nghiep THPT",
        )
    )
