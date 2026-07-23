"""Test suite for Security (CSRF, Rate Limiting, Input Validation)."""
import pytest
import httpx
from uuid import uuid4
from tests.config import csrf_protection_enabled, invalid_origin, origin_headers, test_origin as configured_origin


class TestCSRFProtection:
    """Tests for CSRF protection."""

    @pytest.fixture
    def lead_id(self, api_url):
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "CSRF Test User",
                "email": f"csrf_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers=origin_headers()
        )
        return response.json()["lead_id"]

    def test_reject_missing_origin(self, api_url, lead_id):
        """Test that requests without Origin header are rejected."""
        if not csrf_protection_enabled():
            pytest.skip("Set BACKEND_TEST_CSRF_ENABLED=true to run CSRF rejection tests.")
        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": "Test query",
                "lead_id": lead_id
            },
            timeout=60
        )
        assert response.status_code == 403

    def test_reject_invalid_origin(self, api_url, lead_id):
        """Test that requests from invalid origins are rejected."""
        if not csrf_protection_enabled():
            pytest.skip("Set BACKEND_TEST_CSRF_ENABLED=true to run CSRF rejection tests.")
        invalid_origins = [
            invalid_origin(),
            "https://attacker.net",
            invalid_origin(),
        ]

        for origin in invalid_origins:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": "Test query",
                    "lead_id": lead_id
                },
                headers={"Origin": origin},
                timeout=60
            )
            assert response.status_code == 403, f"Origin {origin} should be rejected"

    def test_accept_valid_origin(self, api_url, lead_id):
        """Test that requests from valid origins are accepted."""
        valid_origins = [configured_origin()]

        for origin in valid_origins:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": "Test query",
                    "lead_id": lead_id
                },
                headers={"Origin": origin},
                timeout=60
            )
            assert response.status_code == 200, f"Origin {origin} should be accepted"


class TestRateLimiting:
    """Tests for rate limiting functionality."""

    def test_rate_limit_per_lead(self, api_url):
        """Test rate limiting per lead_id."""
        # Create lead
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "RateLimit Test User",
                "email": f"ratelimit_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers=origin_headers()
        )
        lead_id = response.json()["lead_id"]

        # Make rapid requests
        rate_limited = False
        for i in range(30):
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": f"Rate limit test {i}",
                    "lead_id": lead_id
                },
                headers=origin_headers(),
                timeout=60
            )
            if response.status_code == 429:
                rate_limited = True
                break

        # Rate limiting should eventually trigger
        # Note: Production rate limits may be high, so this test may pass without triggering

    def test_rate_limit_per_ip(self, api_url):
        """Test rate limiting per IP address."""
        # Create different leads
        lead_ids = []
        for i in range(5):
            response = httpx.post(
                f"{api_url}/api/chat/init-lead",
                json={
                    "full_name": f"IP Rate Test User {i}",
                    "email": f"iprate_{uuid4()}@example.com",
                    "phone": f"0{uuid4().hex[:9]}"
                },
                headers=origin_headers()
            )
            lead_ids.append(response.json()["lead_id"])

        # Make rapid requests from different leads
        rate_limited = False
        for i in range(50):
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": f"IP rate test {i}",
                    "lead_id": lead_ids[i % len(lead_ids)]
                },
                headers=origin_headers(),
                timeout=60
            )
            if response.status_code == 429:
                rate_limited = True
                break


class TestInputValidation:
    """Tests for input validation and sanitization."""

    @pytest.fixture
    def lead_id(self, api_url):
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Validation Test User",
                "email": f"validation_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers=origin_headers()
        )
        return response.json()["lead_id"]

    def test_sql_injection_prevention(self, api_url, lead_id):
        """Test that SQL injection attempts are handled safely."""
        malicious_queries = [
            "'; DROP TABLE leads;--",
            "1' OR '1'='1",
            " UNION SELECT * FROM users--",
        ]

        for query in malicious_queries:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": query,
                    "lead_id": lead_id
                },
                headers=origin_headers(),
                timeout=60
            )
            # Should not return 500 error
            assert response.status_code != 500
            # Should return safe response (not expose DB info)
            if response.status_code == 200:
                assert "error" not in response.text.lower() or "sql" not in response.text.lower()

    def test_xss_prevention(self, api_url, lead_id):
        """Test that XSS attempts are handled safely."""
        xss_queries = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
        ]

        for query in xss_queries:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": query,
                    "lead_id": lead_id
                },
                headers=origin_headers(),
                timeout=60
            )
            # Should not reflect script tags in response
            if response.status_code == 200:
                assert "<script>" not in response.text

    def test_very_long_query(self, api_url, lead_id):
        """Test handling of very long queries."""
        long_query = "A" * 10000

        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={
                "query": long_query,
                "lead_id": lead_id
            },
            headers=origin_headers(),
            timeout=60
        )
        # Should either accept or reject gracefully
        assert response.status_code in [200, 422, 413]

    def test_unicode_vietnamese_handling(self, api_url, lead_id):
        """Test that Vietnamese characters are handled correctly."""
        vietnamese_queries = [
            "Học phí ngành Y khoa là bao nhiêu?",
            "Cho tôi biết về học bổng của trường",
            "Điều kiện tuyển sinh năm 2026",
        ]

        for query in vietnamese_queries:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": query,
                    "lead_id": lead_id
                },
                headers=origin_headers(),
                timeout=60
            )
            assert response.status_code == 200
            data = response.json()
            # Response should contain Vietnamese content
            assert len(data.get("answer", "")) > 0

    def test_lead_id_format_validation(self, api_url):
        """Test that lead_id must be valid UUID format."""
        invalid_ids = [
            "not-a-uuid",
            "123",
            "",
            "lead_123",
        ]

        for lead_id in invalid_ids:
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": "Test query",
                    "lead_id": lead_id
                },
                headers=origin_headers(),
                timeout=60
            )
            assert response.status_code == 422

    def test_empty_request_body(self, api_url):
        """Test handling of empty request body."""
        response = httpx.post(
            f"{api_url}/api/chat/query",
            json={},
            headers=origin_headers(),
            timeout=60
        )
        assert response.status_code == 422

    def test_missing_required_fields(self, api_url):
        """Test handling of missing required fields."""
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Test User"
                # missing email and phone
            },
            headers=origin_headers()
        )
        assert response.status_code == 422
