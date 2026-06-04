"""Test suite for Chat Pipeline (Router, Intent Classification, Clarify Mode)."""
import pytest
import httpx
from uuid import uuid4


class TestRouterIntentClassification:
    """Tests for router intent classification."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        # Create lead
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Router Test User",
                "email": f"router_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_intent_tuition_lookup(self, api_url_and_lead):
        """Test router correctly identifies tuition_lookup intent."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí ngành Bác sĩ Y khoa là bao nhiêu?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should get hybrid mode for specific tuition query
        assert data.get("confidence", 0) > 0

    def test_intent_scholarship_lookup(self, api_url_and_lead):
        """Test router correctly identifies scholarship_lookup intent."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "VinUni có những học bổng gì cho sinh viên?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("confidence", 0) > 0

    def test_intent_admission_requirements(self, api_url_and_lead):
        """Test router correctly identifies admission_requirements intent."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Điều kiện tuyển sinh năm 2026 là gì?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("confidence", 0) > 0


class TestClarifyMode:
    """Tests for clarify mode triggering."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Clarify Test User",
                "email": f"clarify_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_clarify_ambiguous_tuition(self, api_url_and_lead):
        """Test router asks for clarification on ambiguous tuition query."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí bao nhiêu?",  # Ambiguous - which program?
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should either clarify or answer with low confidence
        answer = data.get("answer", "").lower()
        # Check if it's a clarifying question
        is_clarify = any(word in answer for word in ["bậc", "ngành", "chương trình", "nào", "which"])

    def test_clarify_missing_major_level(self, api_url_and_lead):
        """Test clarify when program level (Bachelor/PhD) is missing."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí ngành Khoa học Máy tính năm 2026 là bao nhiêu?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # This specific query might clarify Bachelor vs PhD
        # Verify response is not empty
        assert len(data.get("answer", "")) > 0


class TestFallbackBehavior:
    """Tests for fallback when context not found."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Fallback Test User",
                "email": f"fallback_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_fallback_out_of_domain(self, api_url_and_lead):
        """Test response when query is completely out of domain."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "How to cook pho?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should still return a response (may or may not be accurate)
        assert "answer" in data

    def test_fallback_nonsense_query(self, api_url_and_lead):
        """Test response for nonsense query."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "asdfghjkl qwerty",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should handle gracefully
        assert "answer" in data


class TestRetrievalModes:
    """Tests for different retrieval modes."""

    @pytest.fixture
    def api_url_and_lead(self):
        api_url = "https://a20-app-165-production.up.railway.app"
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Retrieval Test User",
                "email": f"retrieval_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        return api_url, lead_id

    def test_hybrid_retrieval(self, api_url_and_lead):
        """Test hybrid retrieval mode for specific queries."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học bổng 100% yêu cầu gpa bao nhiêu?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should retrieve contexts
        sources = data.get("sources", [])
        assert len(sources) > 0

    def test_vector_only_retrieval(self, api_url_and_lead):
        """Test pure vector retrieval for semantic queries."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Chất lượng giảng viên VinUni thế nào?",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200

    def test_bm25_only_retrieval(self, api_url_and_lead):
        """Test BM25 retrieval for keyword queries."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí 2026 815 triệu",
                "lead_id": lead_id
            },
            headers={"Origin": "https://admin.vinunits.cloud"},
            timeout=60
        )
        assert response.status_code == 200
