from src.services.chat_pipeline.prompt_builder import build_grounded_prompt
from src.services.chat_pipeline.prompts import synthesis_system_prompt
from src.services.chat_pipeline.semantic_answer_cache import _looks_like_english_answer
from src.services.chat_pipeline.types import PipelineState


_ENGLISH_LANGUAGE_NOTE = "- Required response language: English for this answer."


def _state(query: str) -> PipelineState:
    return PipelineState(
        query=query,
        intent="admission_requirement",
        answer_mode="retrieve",
        context_block=(
            "## Cac phuong thuc tuyen sinh\n"
            "1. Phuong thuc 1 - TestAS\n"
            "2. Phuong thuc 2 - Xet ket qua hoc tap THPT\n"
            "3. Phuong thuc 3 - Tuyen thang\n"
            "4. Phuong thuc 4 - Van bang/chung chi THPT quoc te\n"
            "5. Phuong thuc 5 - Ky thi tot nghiep THPT"
        ),
    )


def test_english_admission_methods_prompt_requires_english_response():
    state = build_grounded_prompt(
        _state("What are the 2026 bachelor admission methods for VGU?")
    )

    assert _ENGLISH_LANGUAGE_NOTE in state.grounded_prompt
    assert "keep official names/titles from Context unchanged" in state.grounded_prompt
    assert "do not translate those official names" in state.grounded_prompt


def test_synthesis_system_prompt_sets_clear_response_language_policy():
    prompt = synthesis_system_prompt()

    assert "Response language policy" in prompt
    assert "write explanatory prose in English" in prompt
    assert "must not be translated when listed as official names" in prompt


def test_vietnamese_admission_methods_prompt_does_not_force_english():
    state = build_grounded_prompt(
        _state("Cac phuong thuc tuyen sinh dai hoc VGU nam 2026 la gi?")
    )

    assert _ENGLISH_LANGUAGE_NOTE not in state.grounded_prompt


def test_english_answer_with_official_vietnamese_method_names_is_english_compatible():
    answer = (
        "There are five bachelor admission methods for VGU in 2026:\n"
        "1. TestAS\n"
        "2. Xet ket qua hoc tap THPT\n"
        "3. Tuyen thang\n"
        "4. Van bang/chung chi THPT quoc te\n"
        "5. Ky thi tot nghiep THPT\n\n"
        "Applicants should review the official requirements for each method."
    )

    assert _looks_like_english_answer(answer) is True
