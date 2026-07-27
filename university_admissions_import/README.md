# University admissions import

This folder is reserved for official source material for the configured university before it is imported through the existing knowledge-base pipeline.

Do not copy or adapt legacy source-university files for the new university answers.

## DATA_REQUIRED

Add only official documents or pages from the configured university sources. Suggested categories must map to the existing `AdmissionCategory` enum:

- `MAJOR_INFO`: programs, study plans, campus/program descriptions
- `TUITION`: tuition fees and payment policy
- `SCHOLARSHIP`: scholarships and financial aid
- `REQUIREMENT`: entry requirements and application documents
- `DEADLINE`: application deadlines and academic calendar dates
- `PROCESS`: application process and enrollment steps
- `FAQ`: official frequently asked questions

For each source, record metadata in `manifest.template.json` before importing:

- `university`
- `category`
- `source`
- `source_url`
- `language`
- `effective_date`

Use the existing admin dashboard, OCR Quick Processing, or Web Crawler flow to send reviewed content to Knowledge Chunks. Rebuild embeddings through the existing `/api/knowledge-chunks/rebuild-missing-embeddings` endpoint when needed.
