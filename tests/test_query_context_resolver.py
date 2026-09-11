from src.services.chat_pipeline.query_context_resolver import (
    _find_program_code_mention,
    _infer_topic,
    resolve_query_context,
)
from src.services.chat_pipeline.types import PipelineState


class _EmptyQuery:
    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def all(self):
        return []


class _EmptyDb:
    def query(self, *args, **kwargs):
        return _EmptyQuery()


def test_contextual_bba_tuition_follow_up_resolves_topic_and_program_without_major_rows(monkeypatch):
    from src.services.chat_pipeline import query_context_resolver as resolver

    monkeypatch.setattr(resolver, "get_cached_active_majors", lambda: None)
    monkeypatch.setattr(resolver, "set_cached_active_majors", lambda rows: None)

    state = PipelineState(
        query="Còn BBA thì sao?",
        intent="tuition_lookup",
        chat_history=[
            {"role": "user", "content": "Học phí CSE VGU 2026 là bao nhiêu?"},
            {
                "role": "assistant",
                "content": (
                    "Học phí chương trình Khoa học Máy tính (CSE) tại VGU cho "
                    "sinh viên Việt Nam là 43,700,000 VND mỗi học kỳ."
                ),
            },
        ],
    )

    result = resolve_query_context(state, _EmptyDb())

    assert result.resolved_context["topic"] == "tuition"
    assert result.resolved_context["major_code"] == "BBA"
    assert result.resolved_context["major_id"] is None
    assert result.resolved_context["scope"] == "major"
    assert result.resolved_query == "hoc phi BBA"


def test_tuition_topic_wins_over_science_program_name_in_history():
    assert _infer_topic("hoc phi chuong trinh khoa hoc may tinh cse") == "tuition"


def test_program_code_fallback_does_not_treat_english_me_as_mechanical_engineering():
    assert _find_program_code_mention("tell me about tuition") is None
