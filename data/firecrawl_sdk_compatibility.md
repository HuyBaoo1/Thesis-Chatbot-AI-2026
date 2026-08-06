# Firecrawl SDK Compatibility

Generated at: 2026-07-29

Target package: `firecrawl-py==4.32.1`

Inspection method: installed the exact package in a temporary Python virtual environment and inspected imports/signatures without making provider calls.

## Findings

| Item | `firecrawl-py==1.10.1` current runtime | `firecrawl-py==4.32.1` target | Required code action |
|---|---|---|---|
| Import | `from firecrawl import FirecrawlApp` | `FirecrawlApp` still exists; `Firecrawl` also exists | Keep `FirecrawlApp` to minimize change. |
| Constructor | `FirecrawlApp(api_key=...)` | `FirecrawlApp(api_key=None, api_url='https://api.firecrawl.dev', timeout=None, max_retries=3, backoff_factor=0.5)` | Pass configured timeout and `max_retries=0`. |
| Single scrape | `scrape_url(url, params={...})` | `scrape(url, formats=..., only_main_content=..., timeout=..., proxy=...)`; compatibility wrapper `scrape_url(url, **kwargs)` also exists | Prefer typed `scrape(...)`; keep wrapper normalization. |
| Map | `map_url(url, params={...})` | `map(url, search=..., limit=..., timeout=...)`; compatibility wrapper `map_url(url, **kwargs)` also exists | Prefer typed `map(...)`. |
| Batch scrape | `batch_scrape_urls(urls, params=...)` | `batch_scrape(urls, formats=..., only_main_content=..., proxy=..., timeout=..., poll_interval=..., wait_timeout=...)`; compatibility wrapper exists | Prefer typed `batch_scrape(...)`. |
| Retry control | Not configured in app | Constructor supports `max_retries` and `backoff_factor` | Set SDK retry to 0 and apply bounded app retry. |
| Proxy mode | Not configured in app | Scrape and batch scrape accept `proxy` | Allow only `basic` or `enhanced`. |

## Compatibility decision

`firecrawl-py==4.32.1` is compatible with the existing crawl architecture. The implementation should update the adapter layer only and keep the API route, RQ job, database models, artifact storage, and KB send-to-kb contract unchanged.
