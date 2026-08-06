# Firecrawl Retry Audit

Generated at: 2026-07-29

## Current crawl execution path

| Layer | Evidence | Current behavior |
|---|---|---|
| API route | `src/api/routers/crawl.py` | `POST /api/crawl/sessions/` creates one crawl session and enqueues one RQ job. |
| Queue | `src/api/routers/crawl.py`, `worker/start.py` | The route sets `job_timeout=settings.RQ_JOB_TIMEOUT`; the worker starts RQ queues without an explicit retry policy. |
| Background job | `src/services/crawl_service.py` | `run_crawl_background` calls `firecrawl_service.crawl_sync` once for the session. |
| Provider service | `src/services/firecrawl_service.py` | URL discovery calls Firecrawl map/link scrape, then scrape or batch scrape. |
| Storage | `src/services/crawl_service.py`, `src/services/r2_service.py` | Successful pages become `crawl_page_job` rows and markdown artifacts under `crawl-output/`. |

## Logical Firecrawl calls per crawl session

For one API crawl session and one RQ job:

| Step | Max SDK calls | Notes |
|---|---:|---|
| Map discovery | 1 | `client.map_url(...)`; failures are caught and logged. |
| Link discovery fallback | 1 | `client.scrape_url(... formats=["links"])`; only attempted when map results do not fill the requested limit. |
| Single-page scrape | 1 | `client.scrape_url(... formats=["markdown"])` when one URL is selected. |
| Multi-page scrape | 1 | `client.batch_scrape_urls(...)` when multiple URLs are selected. |

There is no repository-level retry loop around these calls. Link discovery is a separate best-effort discovery step, not a retry of the page scrape.

## Timeout and retry controls found

| Control | Evidence | Status |
|---|---|---|
| RQ timeout | `RQ_JOB_TIMEOUT` in `src/core/config.py`; used by crawl route | Exists. Defaults to 900 seconds. |
| Firecrawl SDK retry | `firecrawl-py==1.10.1`; `FirecrawlApp(api_key=...)` | No explicit app control found in repository. |
| Firecrawl request timeout | SDK 1.10.1 local inspection | No local scrape request timeout was proven for `scrape_url`; provider/internal behavior is opaque. |
| Application retry policy | `src/services/firecrawl_service.py` | Missing before this task. |
| Proxy mode | Firecrawl params | No `proxy` setting configured before this task; no `auto` mode found in repository. |

## Required action

Add a deterministic application-level Firecrawl policy:

- instantiate the SDK with `max_retries=0`;
- use a finite request timeout;
- attempt `basic` proxy first;
- optionally attempt `enhanced` once after retryable provider/network failures;
- reject unsupported or hidden proxy modes such as `auto`;
- keep one crawl session mapped to one RQ job.
