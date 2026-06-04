# Test Suite

Comprehensive test suite for VinUni Admissions Chatbot.

## Test Categories

### 1. API Endpoints (`test_api_endpoints.py`)
- `/api/chat/query` - Chat endpoint
- `/api/chat/init-lead` - Lead creation
- CORS configuration
- Rate limiting

### 2. Chat Pipeline (`test_chat_pipeline.py`)
- Router intent classification
- Clarify mode triggering
- Fallback behavior
- Retrieval modes (hybrid, vector, BM25)

### 3. Conversation Flow (`test_conversation_flow.py`)
- Multi-turn conversations
- Conversation history
- Token management
- Data persistence

### 4. Security (`test_security.py`)
- CSRF protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS prevention

### 5. Database (`test_database.py`)
- Lead CRUD operations
- Conversation storage
- Message persistence

### 6. Load/Stress (`test_load_stress.py`)
- Concurrent users
- API latency
- Throughput
- Resource limits

## Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_api_endpoints.py -v

# Run with markers
pytest tests/ -m "not slow" -v

# Run async tests
pytest tests/test_load_stress.py -v
```

## Notes

- Tests target the production API: `https://a20-app-165-production.up.railway.app`
- Some tests may create data (leads, conversations)
- Rate limiting tests may take longer to complete
- Load/stress tests require sufficient API quota
