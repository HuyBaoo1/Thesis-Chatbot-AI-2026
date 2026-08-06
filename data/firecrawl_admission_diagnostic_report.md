# Firecrawl Admission Diagnostic Report

## Target

- URL: https://vgu.edu.vn/admission
- Scope: single-page diagnostic only
- Full-domain crawl: not performed
- Knowledge Base import: not performed

## Direct container request

- Result without browser-style User-Agent: HTTPError
- Result with browser-style User-Agent: HTTP 200
- Final URL: https://vgu.edu.vn/admission
- Final host: vgu.edu.vn
- Content length bucket: nonempty

## Firecrawl provider checks

- REST endpoint: HTTP 200
- REST success: true
- REST markdown bucket: nonempty
- SDK adapter: success
- SDK adapter proxy: basic
- SDK adapter attempt: 1
- SDK retries: 0

## Previous failed RQ job evidence

- Queue: vgu-admissions
- Failed job ID: 3dfda9f6-5dc9-4b5e-85b3-ec904da50862
- Function: src.services.crawl_service.run_crawl_background
- Crawl session ID: 92ed47fe-4b5c-4ce2-894b-da48e509543f
- Target URL: https://vgu.edu.vn/admission
- Session status: FAILED
- Page jobs: 0
- Error tail: Work-horse terminated unexpectedly; waitpid returned None
- Cleanup action: removed exact failed job from FailedJobRegistry
- Failed registry after cleanup: 0

## Decision

The current Firecrawl adapter can scrape the VGU admission page successfully. The stale failed RQ job was safe to remove from the failed registry because it matched the exact diagnostic crawl session, target URL, and had no page jobs.
