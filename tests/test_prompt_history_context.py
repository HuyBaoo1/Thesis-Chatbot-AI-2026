from src.services.chat_pipeline.prompt_builder import build_grounded_prompt
from src.services.chat_pipeline.types import PipelineState


def test_standalone_address_question_excludes_recent_conversation_from_grounded_prompt():
    state = PipelineState(
        query="Cho toi hoi dia chi truong VGU o dau?",
        intent="school_info",
        answer_mode="retrieve",
        context_block=(
            "## Binh Duong Campus\n"
            "Ring road 4, Thoi An Quarter, Thoi Hoa Ward, Ho Chi Minh City"
        ),
        chat_history=[
            {
                "role": "assistant",
                "content": (
                    "Dai hoc Viet Duc co dia chi tai Khu Cong nghe cao, "
                    "Quan 9, Long Thanh My."
                ),
            },
        ],
    )

    result = build_grounded_prompt(state)

    assert "### Recent Conversation" not in result.grounded_prompt
    assert "Khu Cong nghe cao" not in result.grounded_prompt
    assert "Ring road 4, Thoi An Quarter, Thoi Hoa Ward, Ho Chi Minh City" in result.grounded_prompt


def test_contextual_resolved_follow_up_keeps_recent_conversation_for_continuity():
    state = PipelineState(
        query="Con BBA thi sao?",
        intent="tuition_lookup",
        answer_mode="retrieve",
        rewrite_query=True,
        resolved_query="hoc phi BBA",
        context_block="## BBA tuition\nTuition evidence for BBA.",
        chat_history=[
            {"role": "user", "content": "Hoc phi CSE la bao nhieu?"},
            {"role": "assistant", "content": "Hoc phi CSE la 43,700,000 VND moi hoc ky."},
        ],
    )

    result = build_grounded_prompt(state)

    assert "### Recent Conversation" in result.grounded_prompt
    assert "Original: Con BBA thi sao?" in result.grounded_prompt
    assert "Resolved for retrieval: hoc phi BBA" in result.grounded_prompt
