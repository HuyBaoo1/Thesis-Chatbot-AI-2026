# VGU admissions import

This folder is reserved for reviewed official source material for Vietnamese-German University (VGU).

## Important

Do not copy legacy source-university content into this folder. Only reviewed VGU Markdown should remain here. Draft templates with missing official-data placeholders have been moved to `data/vgu_templates/` and must not be imported into the knowledge base.

## Template files to complete

The incomplete templates are stored outside this import folder:

| File | Backend category | Required official data |
| --- | --- | --- |
| `01_admissions_overview.md` | `PROCESS` | Admission scope, intake year, applicant groups, official admissions page URL, effective date |
| `02_application_process.md` | `PROCESS` | Application steps, application portal URL, required sequence, review/interview/offer flow |
| `03_entry_requirements.md` | `REQUIREMENT` | Eligibility, academic requirements, English requirements, document requirements, special cases |
| `04_deadlines.md` | `DEADLINE` | Application rounds, opening dates, closing dates, result dates, enrollment confirmation dates |
| `05_programs.md` | `MAJOR_INFO` | Official program list, degree names, language of instruction, duration, faculty/school, program URLs |
| `06_tuition.md` | `TUITION` | Tuition by program/year, fee unit, payment schedule, refund/late payment policy if official |
| `07_scholarships.md` | `SCHOLARSHIP` | Scholarship names, value, eligibility, selection criteria, application process, renewal conditions |
| `08_student_services_and_campus.md` | `FAQ` | Dormitory/campus services, student support, transport, health, facilities, relevant official URLs |
| `09_faq.md` | `FAQ` | Official FAQ pairs only; do not add inferred Q&A |
| `10_contacts.md` | `FAQ` | Official contact channels, department names, office hours, contact URLs |

## Review checklist before import

- Replace every missing official-data placeholder in the draft templates before copying content here.
- Keep source URLs official and specific to the content.
- Add `effective_date` or document publication date when available.
- Keep copied policy text faithful to the source; do not summarize away numeric values or conditions.
- Use `data/vgu_templates/manifest.template.json` to record the same file names, categories, URLs, language, and review status while drafting.
- Import completed markdown through the existing Knowledge Chunks upload flow or OCR Quick Processing send-to-KB flow.
