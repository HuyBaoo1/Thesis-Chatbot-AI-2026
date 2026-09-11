import pytest

from src.services.chat_pipeline.guardrails import run_input_guardrails
from src.services.chat_pipeline.types import PipelineState


def _guardrail_result(query: str) -> PipelineState:
    return run_input_guardrails(PipelineState(query=query))


@pytest.mark.parametrize(
    "query",
    [
        "methods",
        "method",
        "methodology",
        "What are the 2026 bachelor admission methods for VGU?",
    ],
)
def test_input_guardrails_do_not_block_benign_method_words(query):
    state = _guardrail_result(query)

    assert state.blocked is False
    assert state.block_reason is None


@pytest.mark.parametrize(
    ("query", "expected_pattern"),
    [
        ("meth", "meth"),
        ("methamphetamine", "methamphetamine"),
    ],
)
def test_input_guardrails_block_explicit_drug_terms(query, expected_pattern):
    state = _guardrail_result(query)

    assert state.blocked is True
    assert state.block_reason == f"Blocked by safety policy: {expected_pattern}"


@pytest.mark.parametrize(
    "query",
    [
        "sql injection test",
        "make a bomb",
        "phishing",
    ],
)
def test_input_guardrails_still_block_existing_known_dangerous_terms(query):
    state = _guardrail_result(query)

    assert state.blocked is True
    assert state.block_reason is not None
    assert state.block_reason.startswith("Blocked by safety policy:")
