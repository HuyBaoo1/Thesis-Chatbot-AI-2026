import unittest
from unittest.mock import patch

from src.models.enums import MessageRole
from src.models.message import Message
from src.services.chat_pipeline.query_context_resolver import _build_resolved_query
from src.services.chat_pipeline.graph import _node_rerank
from src.services.chat_pipeline.router_agent import (
    _apply_llm_route_to_state,
    _deterministic_route,
    _semantic_routing_context,
    run_router_agent,
)
from src.services.chat_pipeline.synthesis import (
    _build_deterministic_context_answer,
    _build_global_scholarship_answer,
)
from src.services.message_service import (
    build_message_citations_from_chunks,
    serialize_message,
)
from src.services.chat_pipeline.types import PipelineState


class ScholarshipQueryRewriteTests(unittest.TestCase):
    def test_generic_institution_scholarship_query_rewrites_to_global_lookup(self):
        resolved = _build_resolved_query(
            query="hoc bong cua truong viuni",
            normalized_query="hoc bong cua truong vinuni",
            topic="scholarship",
            target_major=None,
            target_level=None,
            history_major=None,
            history_level=None,
            has_global_scholarship_context=False,
        )

        self.assertEqual(resolved, "tat ca cac loai hoc bong VinUniversity")


class ScholarshipSynthesisFallbackTests(unittest.TestCase):
    def test_build_global_scholarship_answer_from_context(self):
        state = PipelineState(
            query="tat ca cac loai hoc bong viuni dang ho tro",
            intent="scholarship_lookup",
            resolved_context={"scope": "global_scholarship"},
            reranked=[
                {
                    "content": (
                        "Ho tro Phat trien Giao duc 35% hoc phi cho toan bo sinh vien nhap hoc giai doan 2025-2030. "
                        "Hoc bong Chu tich Truong bao gom 100% hoc phi va chi phi sinh hoat. "
                        "Hoc bong Hieu truong 100% hoc phi. Hoc bong Vien truong 80% hoac 90% hoc phi. "
                        "Hoc bong Tai nang Chuyen nganh 50%, 60% hoac 70% hoc phi. "
                        "Women in Tech Scholarship them 5% hoc phi. "
                        "Dean Choi Grant by Soosan 10% hoc phi. "
                        "Ung vien gap kho khan tai chinh co the nhan ho tro toi da 100% hoc phi."
                    )
                },
                {
                    "content": (
                        "PhD Khoa hoc May tinh co the duoc tai tro 100% hoc phi va phu cap toi da 240.000.000 VND/nam."
                    )
                },
            ],
        )

        answer = _build_global_scholarship_answer(state)

        self.assertIsNotNone(answer)
        self.assertIn("35% học phí", answer)
        self.assertIn("Chủ tịch Trường", answer)
        self.assertIn("Women in Tech Scholarship", answer)
        self.assertIn("Dean Choi Grant by Soosan", answer)
        self.assertIn("240.000.000 VND/năm", answer)

    def test_procedural_scholarship_question_does_not_use_overview_fallback(self):
        state = PipelineState(
            query="lam the nao de nhan duoc cac hoc bong nay",
            intent="scholarship_lookup",
            resolved_query="dieu kien nhan hoc bong VinUniversity",
            resolved_context={"scope": "global_scholarship"},
            reranked=[
                {
                    "content": (
                        "Hoc bong Chu tich Truong bao gom 100% hoc phi va chi phi sinh hoat. "
                        "Ung vien can co thanh tich hoc tap noi troi va khat vong ro rang."
                    )
                }
            ],
        )

        self.assertIsNone(_build_deterministic_context_answer(state))


class ScholarshipRouterTests(unittest.TestCase):
    def test_scholarship_questions_are_left_for_llm_router(self):
        state = PipelineState(query="lam the nao de nhan duoc cac hoc bong nay")

        handled = _deterministic_route(
            state,
            original_query=state.query,
            routing_query="dieu kien nhan hoc bong VinUniversity",
        )

        self.assertFalse(handled)
        self.assertEqual(state.intent, "general_question")

    def test_llm_clarify_wins_over_existing_resolved_query(self):
        state = PipelineState(
            query="hoc phi",
            rewrite_query=True,
            resolved_query="hoc phi Computer Science",
        )

        _apply_llm_route_to_state(
            state,
            {
                "intent": "tuition_lookup",
                "answer_mode": "clarify",
                "clarification_question": "Which program do you mean?",
                "rewrite_query": False,
                "resolved_query": "",
            },
            state.query,
        )

        self.assertEqual(state.answer_mode, "clarify")
        self.assertTrue(state.needs_clarification)
        self.assertFalse(state.needs_retrieval)
        self.assertFalse(state.rewrite_query)
        self.assertEqual(state.resolved_query, "hoc phi")

    def test_llm_can_accept_resolver_rewrite_without_repeating_query(self):
        state = PipelineState(
            query="hoc phi thi sao",
            rewrite_query=True,
            resolved_query="hoc phi Computer Science",
        )

        _apply_llm_route_to_state(
            state,
            {
                "intent": "tuition_lookup",
                "answer_mode": "retrieve",
                "rewrite_query": True,
                "resolved_query": "",
            },
            state.query,
        )

        self.assertEqual(state.answer_mode, "retrieve")
        self.assertTrue(state.rewrite_query)
        self.assertEqual(state.resolved_query, "hoc phi computer science")

    def test_semantic_context_is_marked_as_hint(self):
        state = PipelineState(
            query="hoc phi thi sao",
            rewrite_query=True,
            resolved_query="hoc phi Computer Science",
            resolved_context={"scope": "major", "level": "cu nhan"},
        )

        context = _semantic_routing_context(
            state,
            original_query=state.query,
            semantic_query=state.resolved_query,
        )

        self.assertIn("Resolved query hint: hoc phi Computer Science", context)
        self.assertIn('"scope": "major"', context)
        self.assertIn("final routing authority", context)

    @patch("src.services.chat_pipeline.router_agent.get_openai_client")
    def test_run_router_agent_asks_llm_with_original_query(self, mock_get_client):
        fake_completions = _FakeCompletions(
            {
                "intent": "tuition_lookup",
                "answer_mode": "clarify",
                "clarification_question": "Which program do you mean?",
                "rewrite_query": False,
                "resolved_query": "",
                "needs_retrieval": False,
                "needs_tools": False,
                "needs_clarification": True,
                "reason": "test",
            }
        )
        mock_get_client.return_value = _FakeClient(fake_completions)
        state = PipelineState(
            query="hoc phi thi sao",
            rewrite_query=True,
            resolved_query="hoc phi Computer Science",
            resolved_context={"scope": "major"},
        )

        run_router_agent(state)

        messages = fake_completions.kwargs["messages"]
        self.assertEqual(messages[-1], {"role": "user", "content": "hoc phi thi sao"})
        self.assertEqual(state.answer_mode, "clarify")
        self.assertFalse(state.rewrite_query)


class RerankFlowTests(unittest.TestCase):
    def test_rerank_keeps_three_items_even_when_retrieval_top_k_is_ten(self):
        state = PipelineState(
            query="hoc bong vinuni",
            top_k=10,
            candidates=[
                {"chunk_id": str(index), "content": f"item {index}", "score": 0.9 - (index * 0.01)}
                for index in range(6)
            ],
        )

        updated = _node_rerank(state.__dict__)

        self.assertEqual(len(updated["reranked"]), 3)


class CitationTests(unittest.TestCase):
    def test_build_message_citations_from_chunks_caps_at_three(self):
        citations = build_message_citations_from_chunks(
            [
                {"source": f"https://example.com/{index}"}
                for index in range(5)
            ]
        )

        self.assertEqual(len(citations), 3)
        self.assertEqual(
            citations,
            [
                {"url": "https://example.com/0"},
                {"url": "https://example.com/1"},
                {"url": "https://example.com/2"},
            ],
        )

    def test_serialize_message_caps_existing_citations_at_three(self):
        message = Message(
            id="00000000-0000-0000-0000-000000000001",
            conversation_id="00000000-0000-0000-0000-000000000002",
            role=MessageRole.ASSISTANT,
            content="test",
            citations_json=[
                {"url": "https://example.com/0"},
                {"url": "https://example.com/1"},
                {"url": "https://example.com/2"},
                {"url": "https://example.com/3"},
                {"url": "https://example.com/4"},
            ],
        )

        serialized = serialize_message(message)

        self.assertEqual(len(serialized["citations"]), 3)
        self.assertEqual(
            serialized["citations"],
            [
                {"url": "https://example.com/0"},
                {"url": "https://example.com/1"},
                {"url": "https://example.com/2"},
            ],
        )


class _FakeClient:
    def __init__(self, completions):
        self.chat = _FakeChat(completions)


class _FakeChat:
    def __init__(self, completions):
        self.completions = completions


class _FakeCompletions:
    def __init__(self, payload):
        self.payload = payload
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        return _FakeResponse(self.payload)


class _FakeResponse:
    def __init__(self, payload):
        self.choices = [_FakeChoice(payload)]


class _FakeChoice:
    def __init__(self, payload):
        self.message = _FakeMessage(payload)


class _FakeMessage:
    def __init__(self, payload):
        import json

        self.content = json.dumps(payload)


if __name__ == "__main__":
    unittest.main()
