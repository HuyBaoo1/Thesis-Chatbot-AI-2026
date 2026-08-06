# VGU Verified Promotion Gate Report

Generated: 2026-08-06

## Decision

`BLOCKED - HUMAN VERIFIED TEXT / TRUSTED REVIEW METADATA INCOMPLETE`

No reviewed Markdown file was promoted or imported in this run. Several files contain text-level `Review status: verified`, but they do not yet have trusted manifest lineage, reviewer metadata, promotion approval, and resolved field-level status.

## Baseline

| Check | Result |
|---|---|
| Staging health | PASS |
| Docker compose config | PASS |
| PostgreSQL active chunks | 21 |
| Qdrant points | 21 |
| PG/Qdrant parity | PASS |
| Active documents | VGU Admissions Overview: 10 chunks; VGU Bachelor Tuition Fees 2026: 11 chunks |
| Active `/tmp` references | 0 |
| Active VinUni references | 0 |
| Active review-required references | 0 |
| Queue failed jobs | 0 after exact cleanup of a test side-effect timeout job |

## Reviewed File Gate

| File | Text status | Trusted status | Field blockers | Lifecycle | Result |
|---|---|---|---|---|---|
| data/vgu_crawl_reviewed/01_admission_overview.md | verified_overview_only | legacy verified_overview_only | none in active scope | existing active | SKIPPED - ALREADY ACTIVE |
| data/vgu_crawl_reviewed/01_bachelor_programs_vietnamese_german_university_30a6b40a_review_required.md | reviewed | REVIEW_REQUIRED; diagnostic_only=true; promotion_allowed=false | review-required placeholders | diagnostic artifact | BLOCKED - DIAGNOSTIC_PROMOTION_BLOCKED |
| data/vgu_crawl_reviewed/02_bachelor_requirements.md | verified | needs_review legacy manifest; no trusted lineage | AMBIGUOUS, MISSING_SOURCE | bachelor requirements candidate | BLOCKED - REVIEW_METADATA_INCOMPLETE and FIELD_REVIEW_BLOCKED |
| data/vgu_crawl_reviewed/03_bachelor_tuition_2026.md | verified | legacy verified; no trusted lineage | none in active imported scope | existing active | SKIPPED - ALREADY ACTIVE |
| data/vgu_crawl_reviewed/04_bachelor_scholarships_2026.md | verified | needs_review legacy manifest; no trusted lineage | AMBIGUOUS, MISSING_SOURCE | bachelor scholarships candidate | BLOCKED - REVIEW_METADATA_INCOMPLETE and FIELD_REVIEW_BLOCKED |
| data/vgu_crawl_reviewed/05_application_guide.md | verified | needs_review legacy manifest; no trusted lineage | HISTORICAL_ONLY, MISSING_SOURCE | historical only | HISTORICAL_ONLY - not imported |
| data/vgu_crawl_reviewed/06_master_requirements.md | verified | needs_review legacy manifest; no trusted lineage | AMBIGUOUS | master requirements candidate | BLOCKED - REVIEW_METADATA_INCOMPLETE and FIELD_REVIEW_BLOCKED |
| data/vgu_crawl_reviewed/07_master_admission_2026.md | verified | needs_review legacy manifest; no trusted lineage | AMBIGUOUS | master admission candidate | BLOCKED - REVIEW_METADATA_INCOMPLETE and FIELD_REVIEW_BLOCKED |
| data/vgu_crawl_reviewed/08_master_tuition_2026.md | verified | needs_review legacy manifest; no trusted lineage | AMBIGUOUS | master tuition candidate | BLOCKED - REVIEW_METADATA_INCOMPLETE and FIELD_REVIEW_BLOCKED |
| data/vgu_crawl_reviewed/09_master_scholarships_2026.md | needs_review | needs_review legacy manifest; no trusted lineage | AMBIGUOUS, MISSING_SOURCE | master scholarships candidate | BLOCKED - HUMAN_SOURCE_REVIEW_REQUIRED |
| data/vgu_crawl_reviewed/10_tuyensinh_home.md | needs_review | needs_review legacy manifest; no trusted lineage | AMBIGUOUS | admissions portal homepage | BLOCKED - HUMAN_SOURCE_REVIEW_REQUIRED |

## Required Human Metadata

Each candidate that should be promoted must have:

- `Reviewed by`
- `Reviewed at`
- `Approval method`
- trusted raw manifest entry
- `raw_content_hash`
- `reviewed_content_hash`
- `review_status=VERIFIED`
- `diagnostic_only=false`
- `promotion_allowed=true`
- resolved field statuses with no `MISMATCH`, `AMBIGUOUS`, `MISSING_SOURCE`, or `BLOCKED`

## Roadmap Status

| Area | Status | Next action |
|---|---|---|
| Bachelor requirements core | BLOCKED | Resolve regulation scope, certificate validity, application fee, exception/annex ambiguity; add trusted approval metadata. |
| Contact document | NOT_STARTED | Provide or crawl/review official contact source, then create a dedicated verified document. |
| Bachelor scholarships | BLOCKED | Review individual scholarship pages/PDFs; split by scholarship type. |
| Master admission | BLOCKED | Verify quota/round/date/fee tables field by field. |
| Master tuition | BLOCKED | Verify table against Decision 239 and add trusted approval metadata. |
| Master scholarships | BLOCKED | Review individual scholarship policies/PDFs. |
| Master requirements | BLOCKED | Resolve intake 2026 vs academic year 2026-2027 scope and annexes. |

## KB Action

No `POST /api/crawl/manual-sources/` call was made and no `send-to-kb` action was performed because Gate B did not pass.

## Runtime Test Note

`tests/test_chat_pipeline.py` produced 7 passing tests and 3 API `ReadTimeout` results in the full file run. Staging logs showed the timed-out requests continued processing and returned HTTP 200 after the pytest client timed out. One resulting background side-effect job for the test query `asdfghjkl qwerty` exceeded the RQ timeout and was removed by exact failed job ID after evidence capture. No crawl, manual ingestion, or KB import job was removed.
