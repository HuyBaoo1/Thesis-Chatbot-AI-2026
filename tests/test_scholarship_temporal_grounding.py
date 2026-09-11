from types import SimpleNamespace

from src.services.chat_pipeline import synthesis
from src.services.chat_pipeline.prompts import synthesis_system_prompt
from src.services.chat_pipeline.types import PipelineState


def test_future_scholarship_year_without_matching_evidence_returns_temporal_gap(monkeypatch):
    monkeypatch.setattr(synthesis, "get_openai_client", _raise_if_called)
    state = PipelineState(
        query="full merit VGU intake 2027 con IELTS 7.0 khong?",
        intent="scholarship_lookup",
        answer_mode="retrieve",
        context_block="official context",
        reranked=[
            _scholarship_candidate(
                year=2026,
                title="VGU Full Merit Scholarship for intake 2026",
                content="Applicants must have IELTS Academic 7.0.",
            )
        ],
    )

    result = synthesis.run_synthesis(state)

    assert "2027" in result.answer
    assert "2026" in result.answer
    assert "không thể xác nhận điều kiện IELTS" in result.answer
    assert "khả năng nhận học bổng" in result.answer
    assert result.confidence == 0.25


def test_future_scholarship_query_with_only_requirement_context_returns_gap(monkeypatch):
    monkeypatch.setattr(synthesis, "get_openai_client", _raise_if_called)
    state = PipelineState(
        query="full merit VGU intake 2027 con IELTS 7.0 khong?",
        intent="scholarship_lookup",
        answer_mode="retrieve",
        context_block="requirement context",
        reranked=[
            {
                "chunk_id": "master-requirement",
                "category": "REQUIREMENT",
                "title": "Master admission requirements",
                "source": "https://vgu.edu.vn/admission/master/admission-requirements",
                "source_url": "https://vgu.edu.vn/admission/master/admission-requirements",
                "year": 2026,
                "content": "IELTS Academic 6.0 or TOEFL iBT 60.",
            }
        ],
    )

    result = synthesis.run_synthesis(state)

    assert "2027" in result.answer
    assert "không thể xác nhận" in result.answer
    assert result.confidence == 0.25


def test_supported_2026_scholarship_evidence_remains_usable(monkeypatch):
    monkeypatch.setattr(synthesis, "_acquire_llm_slot", lambda: True)
    monkeypatch.setattr(synthesis, "_release_llm_slot", lambda: None)
    monkeypatch.setattr(synthesis, "get_openai_client", lambda: _FakeOpenAIClient())
    state = PipelineState(
        query="full merit VGU intake 2026 can IELTS may?",
        intent="scholarship_lookup",
        answer_mode="retrieve",
        context_block="official 2026 scholarship context",
        reranked=[
            _scholarship_candidate(
                year=2026,
                title="VGU Full Merit Scholarship for intake 2026",
                content="Applicants must have IELTS Academic 7.0.",
            )
        ],
    )

    result = synthesis.run_synthesis(state)

    assert result.answer == "Supported 2026 scholarship answer."
    assert result.confidence > 0.55


def test_future_temporal_gap_does_not_infer_ielts_scholarship_likelihood(monkeypatch):
    monkeypatch.setattr(synthesis, "get_openai_client", _raise_if_called)
    state = PipelineState(
        query="Does IELTS 7.0 make Full Merit scholarship likely for intake 2027?",
        intent="scholarship_lookup",
        answer_mode="retrieve",
        context_block="official context",
        reranked=[
            _scholarship_candidate(
                year=2026,
                title="VGU Full Merit Scholarship for intake 2026",
                content="Applicants must have IELTS Academic 7.0.",
            )
        ],
    )

    result = synthesis.run_synthesis(state)
    normalized = result.answer.lower()

    assert "likely" not in normalized
    assert "guarantee" not in normalized
    assert "automatic" not in normalized
    assert "khả năng nhận học bổng" in result.answer


def test_system_prompt_preserves_scholarship_year_boundary_policy():
    prompt = synthesis_system_prompt()

    assert "For scholarship questions with a requested year or intake" in prompt
    assert "evidence from another year is insufficient" in prompt
    assert "do not present another year's scholarship conditions" in prompt


def _scholarship_candidate(*, year: int, title: str, content: str) -> dict:
    return {
        "chunk_id": f"scholarship-{year}",
        "category": "SCHOLARSHIP",
        "title": title,
        "source": "https://vgu.edu.vn/vi/vgu-full-merit-scholarship-for-intake-2026",
        "source_url": "https://vgu.edu.vn/vi/vgu-full-merit-scholarship-for-intake-2026",
        "year": year,
        "content": content,
        "score": 0.9,
        "path": "dense+sparse",
    }


def _raise_if_called():
    raise AssertionError("OpenAI client should not be called")


class _FakeOpenAIClient:
    chat = SimpleNamespace(
        completions=SimpleNamespace(
            create=lambda **kwargs: SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(
                            content='{"answer":"Supported 2026 scholarship answer.","follow_up_suggestions":[]}'
                        )
                    )
                ]
            )
        )
    )
