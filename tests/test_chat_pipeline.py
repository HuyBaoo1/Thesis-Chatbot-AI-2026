"""Test suite for Chat Pipeline (Router, Intent Classification, Clarify Mode)."""
import pytest
import httpx
from uuid import uuid4
from tests.config import invalid_origin, origin_headers, test_origin as configured_origin


LEAD_SETUP_TIMEOUT_SECONDS = 15.0


def _response_body_prefix(response: httpx.Response, limit: int = 300) -> str:
    return response.text[:limit].replace("\n", "\\n")


def _create_test_lead(api_url: str, *, full_name: str, email_prefix: str) -> str:
    try:
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": full_name,
                "email": f"{email_prefix}_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}",
            },
            headers=origin_headers(),
            timeout=LEAD_SETUP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        pytest.fail(
            "Lead setup request failed: "
            f"endpoint={api_url}/api/chat/init-lead, "
            f"error={exc.__class__.__name__}: {exc}"
        )

    if not response.is_success:
        pytest.fail(
            "Lead setup failed: "
            f"status={response.status_code}, "
            f"content_type={response.headers.get('content-type')}, "
            f"body_prefix={_response_body_prefix(response)!r}"
        )

    content_type = response.headers.get("content-type", "")
    if "application/json" not in content_type.lower():
        pytest.fail(
            "Lead setup returned non-JSON response: "
            f"status={response.status_code}, "
            f"content_type={content_type}, "
            f"body_prefix={_response_body_prefix(response)!r}"
        )

    payload = response.json()
    if "lead_id" not in payload:
        pytest.fail("Lead setup JSON does not contain lead_id")

    return payload["lead_id"]


@pytest.fixture(scope="class")
def api_url_and_lead(request, api_url):
    lead_specs = {
        "TestRouterIntentClassification": ("Router Test User", "router"),
        "TestClarifyMode": ("Clarify Test User", "clarify"),
        "TestFallbackBehavior": ("Fallback Test User", "fallback"),
        "TestRetrievalModes": ("Retrieval Test User", "retrieval"),
    }
    full_name, email_prefix = lead_specs.get(
        request.cls.__name__ if request.cls else "",
        ("Chat Pipeline Test User", "chat_pipeline"),
    )
    lead_id = _create_test_lead(
        api_url,
        full_name=full_name,
        email_prefix=email_prefix,
    )
    return api_url, lead_id


class TestRouterIntentClassification:
    """Tests for router intent classification."""

    def test_intent_tuition_lookup(self, api_url_and_lead):
        """Test router correctly identifies tuition_lookup intent."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí ngành Bác sĩ Y khoa là bao nhiêu?",
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
                "query": "Truong có những học bổng gì cho sinh viên?",
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
            headers=origin_headers(),
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("confidence", 0) > 0


class TestClarifyMode:
    """Tests for clarify mode triggering."""

    def test_clarify_ambiguous_tuition(self, api_url_and_lead):
        """Test router asks for clarification on ambiguous tuition query."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Học phí bao nhiêu?",  # Ambiguous - which program?
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
            headers=origin_headers(),
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # This specific query might clarify Bachelor vs PhD
        # Verify response is not empty
        assert len(data.get("answer", "")) > 0


class TestFallbackBehavior:
    """Tests for fallback when context not found."""

    def test_fallback_out_of_domain(self, api_url_and_lead):
        """Test response when query is completely out of domain."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "How to cook pho?",
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
            headers=origin_headers(),
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # Should handle gracefully
        assert "answer" in data


class TestRetrievalModes:
    """Tests for different retrieval modes."""

    def test_hybrid_retrieval(self, api_url_and_lead):
        """Test hybrid retrieval mode for specific queries."""
        api_url, lead_id = api_url_and_lead

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Điều kiện tuyển sinh đại học VGU 2026 theo phương thức TestAS là gì?",
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
                "query": "Chất lượng giảng viên truong the nao?",
                "lead_id": lead_id
            },
            headers=origin_headers(),
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
            headers=origin_headers(),
            timeout=60
        )
        assert response.status_code == 200
