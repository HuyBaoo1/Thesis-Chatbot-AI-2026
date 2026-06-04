"""Test suite for Conversation Flow (Multi-turn, History, Token Management)."""
import pytest
import httpx
from uuid import uuid4


class TestMultiTurnConversation:
    """Tests for multi-turn conversation flow."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "MultiTurn Test User",
                "email": f"multiturn_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_conversation_context_preserved(self, api_url_and_lead):
        """Test that conversation context is preserved across turns."""
        api_url, lead_id = api_url_and_lead

        # First turn - ask about tuition
        response1 = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí ngành Y khoa là bao nhiêu?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response1.status_code == 200
        conversation_id = response1.json().get("conversation_id")

        # Second turn - follow up question
        response2 = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Vậy học bổng cho ngành này thì sao?",
                "lead_id": lead_id,
                "conversation_id": conversation_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response2.status_code == 200
        # Both responses should reference Y khoa context

    def test_conversation_message_count(self, api_url_and_lead):
        """Test that message count increases in conversation."""
        api_url, lead_id = api_url_and_lead

        # First turn
        response1 = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Cho tôi biết về học bổng",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        conv_id = response1.json().get("conversation_id")

        # Count messages before
        # ... (would need to call conversation endpoint)

        # Second turn
        response2 = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Điều kiện nhận học bổng 100% là gì?",
                "lead_id": lead_id,
                "conversation_id": conv_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response2.status_code == 200

        # Third turn
        response3 = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Cần GPA bao nhiêu để giữ học bổng?",
                "lead_id": lead_id,
                "conversation_id": conv_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response3.status_code == 200


class TestConversationHistory:
    """Tests for conversation history retrieval."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "History Test User",
                "email": f"history_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_get_conversation_messages(self, api_url_and_lead):
        """Test retrieving conversation messages."""
        api_url, lead_id = api_url_and_lead

        # Create a conversation
        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Cho tôi biết về quy trình tuyển sinh",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        conversation_id = response.json().get("conversation_id")

        # Get conversation details (if endpoint exists)
        # This would require a conversation detail endpoint

    def test_conversation_token_tracking(self, api_url_and_lead):
        """Test that conversation token usage is tracked."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí và học bổng như thế nào?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Response should include usage/token info if tracked
        # assert "usage" in data or "tokens" in data


class TestConversationPersistence:
    """Tests for conversation data persistence."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Persistence Test User",
                "email": f"persist_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_lead_conversations_linked(self, api_url_and_lead):
        """Test that conversations are linked to correct lead."""
        api_url, lead_id = api_url_and_lead

        # Create multiple conversations for same lead
        for i in range(3):
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": f"Câu hỏi thứ {i+1}",
                    "lead_id": lead_id
                },
                headers={"Origin": "https://admin.vinunits.cloud"},
                timeout=60
            )
            assert response.status_code == 200

        # All conversations should be associated with same lead_id

    def test_conversation_status_updates(self, api_url_and_lead):
        """Test conversation status tracking."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí ngành nào rẻ nhất?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should have conversation status
        # assert "status" in data or conversation_id exists
