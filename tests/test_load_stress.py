"""Test suite for Load and Stress Testing."""
import pytest
import httpx
import asyncio
from uuid import uuid4
import time


class TestConcurrentUsers:
    """Tests for concurrent user handling."""

    @pytest.fixture
    def api_url(self):
        return "https://a20-app-165-production.up.railway.app"

    @pytest.mark.asyncio
    async def test_concurrent_chat_requests(self, api_url):
        """Test handling of concurrent chat requests."""

        async def create_lead_and_query(session: httpx.AsyncClient, index: int):
            """Create lead and make query."""
            try:
                # Create lead
                lead_response = await session.post(
                    f"{api_url}/api/chat/init-lead",
                    json={
                        "full_name": f"Concurrent User {index}",
                        "email": f"concurrent_{uuid4()}@example.com",
                        "phone": f"0{uuid4().hex[:9]}"
                    },
                    headers={"Origin": "https://admin.vinunits.cloud"}
                )
                lead_id = lead_response.json()["lead_id"]

                # Make query
                query_response = await session.post(
                    f"{api_url}/api/chat/query",
                    json={
                        "query": f"Concurrent test query {index}",
                        "lead_id": lead_id
                    },
                    headers={"Origin": "https://admin.vinunits.cloud"},
                    timeout=120
                )
                return query_response.status_code == 200
            except Exception as e:
                print(f"Error in concurrent request {index}: {e}")
                return False

        async with httpx.AsyncClient() as session:
            # Run 10 concurrent requests
            tasks = [create_lead_and_query(session, i) for i in range(10)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        success_count = sum(1 for r in results if r is True)
        assert success_count >= 8  # At least 80% success

    @pytest.mark.asyncio
    async def test_concurrent_same_lead_requests(self, api_url):
        """Test concurrent requests for same lead."""
        # Create single lead
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Concurrent Same Lead User",
                "email": f"concurrent_same_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]

        async def make_query(session: httpx.AsyncClient, index: int):
            try:
                response = await session.post(
                    f"{api_url}/api/chat/query",
                    json={
                        "query": f"Query {index} for same lead",
                        "lead_id": lead_id
                    },
                    headers={"Origin": "https://admin.vinunits.cloud"},
                    timeout=120
                )
                return response.status_code == 200
            except Exception as e:
                return False

        async with httpx.AsyncClient() as session:
            tasks = [make_query(session, i) for i in range(5)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        success_count = sum(1 for r in results if r is True)
        assert success_count >= 4  # At least 80% success


class TestAPILatency:
    """Tests for API latency under various conditions."""

    @pytest.fixture
    def api_url(self):
        return "https://a20-app-165-production.up.railway.app"

    @pytest.fixture
    def lead_id(self, api_url):
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Latency Test User",
                "email": f"latency_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        return response.json()["lead_id"]

    def test_init_lead_latency(self, api_url):
        """Test latency of init-lead endpoint."""
        latencies = []

        for i in range(5):
            start = time.time()
            response = httpx.post(
                f"{api_url}/api/chat/init-lead",
                json={
                    "full_name": f"Latency User {i}",
                    "email": f"latency_{uuid4()}@example.com",
                    "phone": f"0{uuid4().hex[:9]}"
                },
                headers={"Origin": "https://admin.vinunits.cloud"}
            )
            latency = time.time() - start
            latencies.append(latency)
            assert response.status_code == 200

        avg_latency = sum(latencies) / len(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        print(f"Init-lead latency - Avg: {avg_latency:.3f}s, P95: {p95_latency:.3f}s")
        assert avg_latency < 2.0  # Should be under 2 seconds average

    def test_chat_query_latency(self, api_url, lead_id):
        """Test latency of chat query endpoint."""
        latencies = []

        for i in range(5):
            start = time.time()
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": "Học phí ngành Y khoa là bao nhiêu?",
                    "lead_id": lead_id
                },
                headers={"Origin": "https://admin.vinunits.cloud"},
                timeout=120
            )
            latency = time.time() - start
            latencies.append(latency)
            assert response.status_code == 200

        avg_latency = sum(latencies) / len(latencies)
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]
        print(f"Chat query latency - Avg: {avg_latency:.3f}s, P95: {p95_latency:.3f}s")
        assert avg_latency < 10.0  # Should be under 10 seconds average for RAG


class TestThroughput:
    """Tests for system throughput."""

    @pytest.fixture
    def api_url(self):
        return "https://a20-app-165-production.up.railway.app"

    def test_sustained_request_rate(self, api_url):
        """Test sustained request rate over time."""
        start_time = time.time()
        request_count = 0
        success_count = 0

        # Make requests for 30 seconds
        while time.time() - start_time < 30:
            try:
                response = httpx.post(
                    f"{api_url}/api/chat/init-lead",
                    json={
                        "full_name": f"Throughput User {request_count}",
                        "email": f"throughput_{uuid4()}@example.com",
                        "phone": f"0{uuid4().hex[:9]}"
                    },
                    headers={"Origin": "https://admin.vinunits.cloud"},
                    timeout=30
                )
                if response.status_code == 200:
                    success_count += 1
                request_count += 1
            except Exception:
                request_count += 1

        duration = time.time() - start_time
        rps = request_count / duration
        success_rate = success_count / request_count if request_count > 0 else 0

        print(f"Throughput: {rps:.2f} req/s, Success rate: {success_rate:.2%}")
        assert success_rate > 0.9  # At least 90% success


class TestResourceLimits:
    """Tests for resource limit handling."""

    @pytest.fixture
    def api_url(self):
        return "https://a20-app-165-production.up.railway.app"

    def test_large_conversation_history(self, api_url):
        """Test handling of conversation with large history."""
        # Create lead
        response = httpx.post(
            f"{api_url}/api/chat/init-lead",
            json={
                "full_name": "Large History User",
                "email": f"largehistory_{uuid4()}@example.com",
                "phone": f"0{uuid4().hex[:9]}"
            },
            headers={"Origin": "https://admin.vinunits.cloud"}
        )
        lead_id = response.json()["lead_id"]
        conversation_id = None

        # Make many requests in same conversation
        for i in range(20):
            response = httpx.post(
                f"{api_url}/api/chat/query",
                json={
                    "query": f"Message {i+1} in long conversation",
                    "lead_id": lead_id,
                    "conversation_id": conversation_id
                },
                headers={"Origin": "https://admin.vinunits.cloud"},
                timeout=120
            )
            assert response.status_code == 200
            conversation_id = response.json().get("conversation_id", conversation_id)

    def test_rapid_fire_requests(self, api_url):
        """Test handling of rapid fire requests."""
        success = 0
        failed = 0

        for i in range(20):
            try:
                response = httpx.post(
                    f"{api_url}/api/chat/init-lead",
                    json={
                        "full_name": f"Rapid Fire User {i}",
                        "email": f"rapidfire_{uuid4()}@example.com",
                        "phone": f"0{uuid4().hex[:9]}"
                    },
                    headers={"Origin": "https://admin.vinunits.cloud"},
                    timeout=30
                )
                if response.status_code == 200:
                    success += 1
                else:
                    failed += 1
            except Exception:
                failed += 1

        print(f"Rapid fire: {success} success, {failed} failed")
        assert success >= 15  # At least 75% success
