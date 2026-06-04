# Plan: CI/CD + Automated Test Suite

## Mục tiêu
Thiết lập automated testing (unit + integration + E2E) và CI/CD pipeline để đảm bảo chất lượng code khi deploy liên tục.

## Hiện trạng
- **Frontend test**: Chỉ có 2 file Playwright E2E (`e2e/excel-ocr.spec.ts`, `e2e/ui-fixes.spec.ts`), 10 tests tổng cộng
- **Backend test**: Không có pytest config, không có file test nào
- **Unit test**: Không có (cả frontend lẫn backend)
- **CI/CD**: Không có GitHub Actions, không có workflow file
- **Deploy**: Frontend trên Vercel (auto-deploy từ main), Backend trên Railway (auto-deploy từ main)
- **Package.json**: Không có Vitest, không có test scripts

## Thiết kế

### Test pyramid
```
        /\
       /E2E\      10 tests (Playwright) — critical user journeys
      /------\
     /Integr.\    30 tests — API + DB integration
    /----------\
   /Unit tests \  100+ tests — services, utils, components
  /--------------\
```

### Tools
| Layer | Frontend | Backend |
|-------|----------|---------|
| Unit | Vitest + React Testing Library | pytest + pytest-asyncio |
| Integration | Vitest + MSW (mock API) | pytest + test DB (SQLite/Postgres) |
| E2E | Playwright (đã có) | — |
| CI | GitHub Actions | GitHub Actions |
| Coverage | Vitest coverage (c8) | pytest-cov |

## Các bước thực hiện

### Phase 1: Backend test infrastructure

**Install**:
```bash
pip install pytest pytest-asyncio pytest-cov httpx factory-boy
```

**File mới**: `tests/conftest.py`
- Fixture cho test database (SQLite in-memory hoặc Docker Postgres)
- Fixture cho FastAPI TestClient
- Fixture cho mock Qdrant, Redis, R2 clients
- Factory fixtures: Staff, Lead, Conversation, Message, KnowledgeChunk

**File mới**: `tests/factories.py`
- Factory Boy factories cho tất cả models
- `StaffFactory`, `LeadFactory`, `ConversationFactory`, `MessageFactory`, v.v.

**File mới**: `pytest.ini`
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --cov=src --cov-report=term-missing
```

### Phase 2: Backend unit tests (ưu tiên cao)

**File mới**: `tests/services/test_auth_service.py`
- `test_login_success`
- `test_login_invalid_credentials`
- `test_token_refresh`
- `test_password_change`

**File mới**: `tests/services/test_lead_service.py`
- `test_create_lead_from_chat`
- `test_lead_scoring_calculation`
- `test_lead_temperature_classification`
- `test_extract_lead_info_nlp`

**File mới**: `tests/services/test_chat_pipeline.py`
- `test_router_agent_direct_path`
- `test_router_agent_retrieve_path`
- `test_guardrails_block_harmful`
- `test_retrieval_returns_chunks`
- `test_synthesis_generates_answer`

**File mới**: `tests/services/test_conversion_funnel.py`
- `test_funnel_counts_correct`
- `test_funnel_with_date_filter`

**File mới**: `tests/api/test_auth_endpoints.py`
- `test_login_returns_tokens`
- `test_protected_route_requires_auth`

**File mới**: `tests/api/test_chat_endpoints.py`
- `test_init_lead_creates_lead`
- `test_chat_query_returns_answer`
- `test_chat_query_without_lead_fails`

### Phase 3: Frontend test infrastructure

**Install**:
```bash
cd vite-app && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

**File mới**: `vite-app/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**File mới**: `vite-app/src/test/setup.ts`
- `@testing-library/jest-dom` import
- MSW server setup/teardown
- Mock `react-i18next`

**File mới**: `vite-app/src/test/mocks/handlers.ts`
- MSW handlers cho tất cả API endpoints

### Phase 4: Frontend unit tests (ưu tiên cao)

**File mới**: `vite-app/src/features/home/components/__tests__/home-lead-form-dialog.test.tsx`
- `test_renders_all_fields`
- `test_requires_name`
- `test_requires_email_or_phone`
- `test_submit_calls_onSubmit`

**File mới**: `vite-app/src/features/dashboard/components/__tests__/dashboard-funnel-chart.test.tsx`
- `test_renders_all_stages`
- `test_shows_conversion_percentages`
- `test_empty_state`

**File mới**: `vite-app/src/hooks/__tests__/use-auth.test.tsx`
- `test_login_success_sets_auth`
- `test_login_failure_shows_error`
- `test_refresh_token`

**File mới**: `vite-app/src/lib/__tests__/export-csv.test.ts`
- `test_convert_to_csv_format`
- `test_handle_empty_data`
- `test_escape_special_characters`

### Phase 5: Mở rộng E2E tests

**File mới**: `vite-app/e2e/auth.spec.ts`
- Login flow thành công
- Login flow thất bại (sai password)
- Login flow validation error (backend trả về object array)
- Logout + redirect

**File mới**: `vite-app/e2e/chat.spec.ts`
- Chat widget flow: mở chat → điền lead form → gửi câu hỏi → nhận trả lời
- Conversation persistence (refresh trang → vẫn thấy conversation)

**File mới**: `vite-app/e2e/dashboard.spec.ts`
- Dashboard loads các panels
- Conversion funnel hiển thị đúng
- Date filter hoạt động

### Phase 6: GitHub Actions CI pipeline

**File mới**: `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
      qdrant:
        image: qdrant/qdrant
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - run: pip install pytest pytest-asyncio pytest-cov httpx
      - run: pytest tests/ -v --cov=src --cov-report=xml
      - uses: codecov/codecov-action@v4
        with: { file: ./coverage.xml }

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - working-directory: vite-app
        run: |
          npm ci
          npx vitest run --coverage
          npx playwright install --with-deps chrome
          npx playwright test

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ruff
      - run: ruff check src/
      - working-directory: vite-app
        run: |
          npm ci
          npx tsc --noEmit
```

**File mới**: `.github/workflows/deploy.yml` (optional)
- Deploy lên Railway/Vercel khi merge vào main
- Chạy smoke test sau deploy

### Phase 7: Pre-commit hooks

**File mới**: `.pre-commit-config.yaml`
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0
    hooks:
      - id: prettier
        files: 'vite-app/src/.*\.(ts|tsx)$'
```

## Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `tests/conftest.py` | New | Pytest fixtures |
| `tests/factories.py` | New | Factory Boy factories |
| `tests/services/test_*.py` | New (8 files) | Backend unit tests |
| `tests/api/test_*.py` | New (2 files) | Backend API tests |
| `pytest.ini` | New | Pytest config |
| `vite-app/vitest.config.ts` | New | Vitest config |
| `vite-app/src/test/setup.ts` | New | Test setup + MSW |
| `vite-app/src/test/mocks/handlers.ts` | New | API mock handlers |
| `vite-app/src/**/__tests__/*.test.tsx` | New (6 files) | Frontend unit tests |
| `vite-app/e2e/auth.spec.ts` | New | E2E auth tests |
| `vite-app/e2e/chat.spec.ts` | New | E2E chat tests |
| `vite-app/e2e/dashboard.spec.ts` | New | E2E dashboard tests |
| `.github/workflows/ci.yml` | New | CI pipeline |
| `.pre-commit-config.yaml` | New | Pre-commit hooks |
| `vite-app/package.json` | Edit | Thêm test scripts, vitest dep |
| `requirements.txt` | Edit | Thêm pytest deps |

## Timeline ước tính: 5-7 ngày
