# Knowledge Base Inventory

Generated during production-readiness validation. Secret values were not inspected or recorded.

## Summary

| Check | Result |
|---|---|
| PostgreSQL knowledge chunks | 21 |
| Active PostgreSQL chunks | 21 |
| Qdrant `knowledge_chunks` points | 21 |
| Active VinUni PostgreSQL chunks | 0 |
| VinUni Qdrant payload matches | 0 |
| PostgreSQL/Qdrant count parity | PASS |
| Unknown or unverified active chunks | BLOCKED |
| Legacy `/tmp` artifact references | BLOCKED |

## Active Knowledge Base

| Document | Source | Verified | PostgreSQL chunks | Qdrant points | Active | Notes |
|---|---|---:|---:|---:|---|---|
| VGU Admissions Overview | `local:///tmp/admissions-ocr/knowledge-chunks/55bf57edfe11401a8c4e3c8bd9a6c0f9.md` | No metadata flag | 10 | 10 | Yes | Active chunks point at non-persistent legacy `/tmp` artifact location. Needs human review and controlled disable/re-import decision before production. |
| VGU Bachelor Tuition Fees 2026 | `local:///app/data/runtime/admissions-ocr/knowledge-chunks/cffd1136745943469cb09c6a443bee1d.md` | No metadata flag | 11 | 11 | Yes | Runtime artifact path is persistent in the current app configuration. Prior field review says tuition was verified, but the active chunk metadata does not encode `verified=true`. |

## Crawl Page Job Snapshot

| Check | Result |
|---|---|
| Crawl page jobs | 889 |
| Recent unsent page jobs | Present |
| Recent artifact path kind | Mostly `local:///tmp/...` |
| Fresh artifact persistence E2E | Not run in this pass |

## Gate Result

`NO-GO - DATA_BLOCKER`

The current active KB does not yet satisfy the production gate:

- all active records verified;
- unknown records equal 0;
- no active records referencing non-persistent `/tmp` artifacts.

Do not delete or disable the unverified active chunks without using the repository's existing knowledge-base flow after backup.
