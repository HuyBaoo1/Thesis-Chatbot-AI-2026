# VinUni Reference Audit

Generated: 2026-07-28

Scope: tracked repository files excluding `.git`, dependency/build folders, plus PostgreSQL active knowledge chunks, crawl sessions/page jobs, and Qdrant knowledge payloads.

| File/Storage | Reference | Classification | Runtime impact | Action |
|---|---|---|---|---|
| PostgreSQL `knowledge_chunk` active rows | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No active matches found across 21 active chunks. | No action required. |
| PostgreSQL `crawl_session` and `crawl_page_job` | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No active crawl-session/page-job matches found. | No action required. |
| Qdrant `knowledge_chunks` collection | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No payload matches found across 21 checked points. | No action required. |
| `vite-app/` runtime source | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No active VinUni branding/content matches found in current Vite app source scan. | No action required. |
| `src/services/chat_pipeline/` runtime prompts/retrieval | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No active runtime prompt/retrieval matches found. | No action required. |
| `data/` and `vgu_admissions_import/` | `VinUni`, `VINUNI`, `vinuni`, `vinuni.edu.vn` | ACTIVE_RUNTIME check | No active VGU import/review data matches found in current scan. | No action required. |
| `scripts/powershell/*.ps1` | Legacy VinUni questions, URLs, and tracking key fixture | TEST_FIXTURE | Not part of API/frontend runtime; could confuse manual test runs. | Keep out of runtime. Replace or archive before using scripts for VGU validation. |
| `src/evaluation/run_evaluation.py` | Legacy VinUni admin origin/report title | EVALUATION_ARCHIVE | Evaluation-only; not used by chatbot runtime unless explicitly run. | Keep as archive or create VGU-specific evaluation config before running. |
| `src/evaluation/results/*.json` | Historical VinUni answers/questions | EVALUATION_ARCHIVE | Historical outputs only. | Do not import into KB. |
| `src/evaluation/datasets/*.jsonl` | Historical VinUni datasets/contexts | EVALUATION_ARCHIVE | Evaluation fixtures only; dangerous if reused for VGU eval without replacement. | Keep as archive; create VGU datasets separately. |
| `docs/ragas_evaluation_report.md` | Historical VinUni RAG report | DOCUMENTATION | Documentation/archive only. | Keep as historical reference. |
| `test-results/*.md` | Historical VinUni test report/origin references | DOCUMENTATION | Test report archive only. | Keep as historical reference. |
| `src/agent_pool.py`, `src/agents/*` | Agent-persona text referencing VinUni Admissions Portal | HISTORICAL_REFERENCE | Not part of chatbot request path found in current runtime scan; could affect optional agent tooling if used. | Update only if agent subsystem is reactivated for VGU. |
| `demo/` | Legacy VinUni demo app UI/assets/prompts | HISTORICAL_REFERENCE | Separate demo folder, not current `vite-app` runtime. | Do not use for VGU runtime; archive or migrate separately if needed. |
| `designfe/` | Legacy VinUni design template | HISTORICAL_REFERENCE | Separate design/template folder, not current runtime. | Keep as historical design reference or archive. |

## Summary

- Active runtime references: 0 found in current PostgreSQL active chunks, Qdrant knowledge payloads, crawl sessions/page jobs, Vite app runtime source, current chat pipeline prompts, and VGU import/review data.
- Historical/test/evaluation references remain in non-runtime folders and scripts.
- No global replacement was performed.
