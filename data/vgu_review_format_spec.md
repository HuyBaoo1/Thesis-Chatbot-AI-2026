# VGU Review Format Spec

Generated at: 2026-07-29

## Existing reusable structure

The active VGU review/import files use this shape:

1. Document H1 title.
2. `## Verification record`.
3. Bullet metadata for source URL, session/page-job IDs, raw file, program level, language, effective intake/year, review status, and KB status.
4. Optional supporting official links.
5. Reviewed crawler content.

Examples inspected:

- `data/vgu_crawl_reviewed/02_bachelor_requirements.md`
- `data/vgu_crawl_reviewed/03_bachelor_tuition_2026.md`
- `vgu_admissions_import/03_hoc_phi_cu_nhan_2026.md`

## Draft rules

- New Firecrawl output is saved first as raw Markdown in `data/vgu_crawl_raw/`.
- A reviewed draft is created in `data/vgu_crawl_reviewed/` with `Review status: needs_review`.
- Drafts include field-level review placeholders and must not be imported until human review changes the status to exactly `verified`.
- Drafts must preserve tables, lists, headings, deadlines, tuition, scholarship details, exceptions, source URL, and intake/effective-date evidence when present in the crawl output.
- Drafts must not copy legacy VinUni content or use VinUni data renamed as VGU data.

## Promotion rules

Only Markdown with exactly:

```text
- Review status: verified
```

can be promoted into `vgu_admissions_import/`.

Promotion is blocked if unresolved markers remain, including:

- `needs_review`
- `review_required`
- `DATA_REQUIRED`
- `MISSING_SOURCE`
- `AMBIGUOUS`
- `MISMATCH`
- `VinUni`
- `Vin University`
