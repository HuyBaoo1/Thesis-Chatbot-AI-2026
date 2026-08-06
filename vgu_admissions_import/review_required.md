# VGU Human Review Required

## Admission Overview Contact Details

- Field: Contact details on the admissions overview page
- Source A: https://vgu.edu.vn/admission
- Value A: Raw crawl includes department, campus room, phone numbers, and email-like text.
- Source B: Not checked against a second official contact page in this task.
- Value B: DATA_REQUIRED
- Effective dates: Not stated on the admissions overview page.
- Agent assessment: The raw crawl parsed at least one email-like item inconsistently, so contact details were excluded from the verified import-ready overview file.
- Required human decision: Confirm official contact email, phone numbers, and department before adding contact details to Knowledge Base.

## Intake-Specific Admissions Rules

- Field: Intake, deadlines, admission requirements, English requirements, mandatory documents, tuition, scholarships, and fees
- Source A: https://vgu.edu.vn/admission
- Value A: Overview page links to separate requirement/guideline pages and PDFs.
- Source B: Linked requirement, tuition, scholarship, and application guideline pages.
- Value B: DATA_REQUIRED
- Effective dates: DATA_REQUIRED
- Agent assessment: High-impact admissions details must be reviewed per topic before import.
- Required human decision: Review each topic-specific raw Markdown file before marking it verified and sending it to Knowledge Base.

## Bachelor tuition fees — Intake 2026

* Reviewed file: `data/vgu_crawl_reviewed/03_bachelor_tuition_2026.md`
* Content status: `verified`
* Content conflict: None found
* Official page: `https://vgu.edu.vn/tuition-fees/for-bachelor-programs`
* Supporting regulation: Decision No. 239/QĐ-ĐHVĐ dated 25 March 2026
* Remaining operational check:

  * Confirm that the corresponding row in `data/vgu_crawl_status.md` uses the same source URL.
  * Confirm that its page job has status `completed`.
  * Confirm that the verified Markdown is written back to the correct page job before `send-to-kb`.
* Required human decision: None for the tuition values currently listed.
