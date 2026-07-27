# VGU Data Review Required

## Unresolved content issues

These files have been cleaned into `data/vgu_crawl_reviewed/` but remain `needs_review`. They must not be copied into `vgu_admissions_import/` or sent to the Knowledge Base until a human reviewer confirms the official source, intake/year, and sensitive values.

| Reviewed file | Primary source | Review focus | Required human decision |
|---|---|---|---|
| `data/vgu_crawl_reviewed/02_bachelor_requirements.md` | https://vgu.edu.vn/admission/bachelor/admission-requirements | Bachelor admission modes, minimum scores, English requirements, certificate tables, entrance fees, linked annexes | Confirm this is the active 2026 undergraduate admission regulation and verify all exceptions/annex links. |
| `data/vgu_crawl_reviewed/04_bachelor_scholarships_2026.md` | https://vgu.edu.vn/scholarships-for-bachelor-programs | Bachelor scholarship links, 2026 special scholarship PDFs, DAAD/WUS/partner links | Confirm which scholarship policies are active for intake 2026 and whether linked PDFs must be reviewed separately. |
| `data/vgu_crawl_reviewed/05_application_guide.md` | https://vgu.edu.vn/huong-dan-nop-ho-so | Enrollment/application document checklist, payment details, refund rules, dorm/bus deadlines, contacts | Confirm whether this 2025 enrollment guide should be used for the current VGU chatbot or archived as historical/reference only. |
| `data/vgu_crawl_reviewed/06_master_requirements.md` | https://vgu.edu.vn/admission/master/admission-requirements | Master eligible disciplines, English requirements, score formula, conditional admission, thesis English requirement | Confirm current applicability and verify all linked annexes. |
| `data/vgu_crawl_reviewed/07_master_admission_2026.md` | https://vgu.edu.vn/admission/master/admission-announcement | Master quota, batches/deadlines, fees, documents, tuition, scholarships, tuition reduction, study location | Confirm all dates, quotas, fees, scholarship criteria, and program-location table before import. |
| `data/vgu_crawl_reviewed/08_master_tuition_2026.md` | https://vgu.edu.vn/tuition-fees/for-master-programs | Master tuition table, additional course fee, income-country exception, tuition regulation PDF | Confirm every fee value and footnote against the official tuition regulation before import. |
| `data/vgu_crawl_reviewed/09_master_scholarships_2026.md` | https://vgu.edu.vn/scholarships-for-master-programs | Master scholarship links, province/country scholarships, DAAD/partner scholarships | Confirm which scholarship policies are active for intake 2026 and whether linked PDFs must be reviewed separately. |
| `data/vgu_crawl_reviewed/10_tuyensinh_home.md` | https://tuyensinh.vgu.edu.vn/ | Vietnamese portal homepage, program lists, scholarship marketing blocks, admissions-news excerpts | Confirm whether truncated Wix news excerpts are sufficient or whether individual article URLs must be crawled/reviewed separately. |

## 02_bachelor_requirements.md admission methods and English requirements

- File: `data/vgu_crawl_reviewed/02_bachelor_requirements.md`
- Field: admission methods, TestAS, high-school transcript method, direct admission, international qualifications, English requirements
- Current value: extracted from the official bachelor requirements page, with multiple linked annexes. Field-level review now marks most primary-page method fields as `MATCHED`, but the overall file remains blocked.
- Primary source: https://vgu.edu.vn/admission/bachelor/admission-requirements
- Supporting source: linked admission regulation and annex PDFs on the page. Annex 1 English equivalency, Annex 3 recognized diploma list, Annex 4 gifted high-school list, and ARC DOCX all returned HTTP 200 from official VGU URLs. Annex 1, Annex 3, and Annex 4 had extractable text. The English-official-country list and recognized-diploma-by-country list behaved like scanned PDFs; local Tesseract OCR produced only partial text.
- Conflict or uncertainty: the full signed governing admission regulation/effective scope was not independently identified; country-specific English exemptions and country-specific recognized high-school diplomas cannot be safely answered from partial OCR.
- Agent assessment: many method-level fields are official and matched, but the file is not safe for KB import because sensitive exception/list fields remain `AMBIGUOUS` or `MISSING_SOURCE`.
- Recommended action: human-review the governing regulation/effective scope and manually verify the two scan-like PDF lists before changing review status to `verified`.
- Required human decision: confirm active 2026 undergraduate admission regulation/effective scope and verify country/diploma-specific exemption lists.
- Blocks KB import: Yes

## 04_bachelor_scholarships_2026.md scholarship values and duration

- File: `data/vgu_crawl_reviewed/04_bachelor_scholarships_2026.md`
- Field: scholarship value, number of awards, duration, renewal, application requirements, deadlines
- Current value: scholarship links are present, but detailed values are not fully resolved in the reviewed file.
- Primary source: https://vgu.edu.vn/scholarships-for-bachelor-programs
- Supporting source: individual scholarship pages and PDFs linked from the page.
- Conflict or uncertainty: the page mixes broad scholarship links and intake-specific PDFs; duration and maintenance rules must not be inferred.
- Agent assessment: official source exists, but field-level evidence is incomplete.
- Recommended action: review each linked scholarship policy separately and split by applicant group if needed.
- Required human decision: confirm which scholarship policies are active for intake 2026.
- Blocks KB import: Yes

## 05_application_guide.md 2025 enrollment guide

- File: `data/vgu_crawl_reviewed/05_application_guide.md`
- Field: enrollment steps, documents, payment, dorm/bus/visa deadlines, contacts
- Current value: official guide contains 2025 deadlines and 2025 tuition/payment references.
- Primary source: https://vgu.edu.vn/huong-dan-nop-ho-so
- Supporting source: linked payment/application materials on the page.
- Conflict or uncertainty: no current 2026 enrollment guide was verified in this task.
- Agent assessment: historical-only for the 2026 dataset.
- Recommended action: keep outside import unless the chatbot is explicitly answering 2025 enrollment questions.
- Required human decision: find/confirm a 2026 guide or mark this source as archived.
- Blocks KB import: Yes

## 06_master_requirements.md effective intake

- File: `data/vgu_crawl_reviewed/06_master_requirements.md`
- Field: effective intake/year, degree background, GPA, work experience, English requirements, conditional admission
- Current value: metadata currently says 2026/2027.
- Primary source: https://vgu.edu.vn/admission/master/admission-requirements
- Supporting source: master admission announcement and linked annexes.
- Conflict or uncertainty: unclear whether 2026/2027 is academic year, intake, or mixed future deadlines.
- Agent assessment: source is official, but effective scope must be resolved before import.
- Recommended action: compare against the 2026 master admission announcement and split sections if dates differ.
- Required human decision: decide canonical effective intake metadata.
- Blocks KB import: Yes

## 07_master_admission_2026.md master rounds and quotas

- File: `data/vgu_crawl_reviewed/07_master_admission_2026.md`
- Field: quotas, round deadlines, fees, documents, tuition, scholarships, study location
- Current value: detailed official announcement text is present.
- Primary source: https://vgu.edu.vn/admission/master/admission-announcement
- Supporting source: specialized tuition/scholarship/requirements pages where referenced.
- Conflict or uncertainty: detailed tables need row-by-row verification; specialized sources should override broad announcement sections for tuition/scholarship answers.
- Agent assessment: likely import candidate after table check, but not yet verified.
- Recommended action: verify every program/round row and prefer specialized sources for tuition/scholarship details.
- Required human decision: confirm all dates, quotas, and fee values.
- Blocks KB import: Yes

## 08_master_tuition_2026.md master tuition table

- File: `data/vgu_crawl_reviewed/08_master_tuition_2026.md`
- Field: master tuition, GPE summer school fee, exceptions
- Current value: official page and same Decision No. 239/QD-DHVD are available.
- Primary source: https://vgu.edu.vn/tuition-fees/for-master-programs
- Supporting source: Decision No. 239/QD-DHVD tuition regulation PDF.
- Conflict or uncertainty: table-level PDF verification has not been completed.
- Agent assessment: strong next candidate for verification because the supporting regulation was already identified.
- Recommended action: verify Appendix 2 and related fee appendices before import.
- Required human decision: none expected after PDF/table review, but review is still pending.
- Blocks KB import: Yes

## 09_master_scholarships_2026.md scholarship values and duration

- File: `data/vgu_crawl_reviewed/09_master_scholarships_2026.md`
- Field: scholarship type, eligibility, value, number, duration, maintenance, deadline
- Current value: official scholarship links are present, including province/country-specific policies.
- Primary source: https://vgu.edu.vn/scholarships-for-master-programs
- Supporting source: individual scholarship PDFs/pages linked from the page.
- Conflict or uncertainty: values and eligibility cannot be inferred from link titles.
- Agent assessment: not import-ready.
- Recommended action: review each linked scholarship source and split by scholarship type.
- Required human decision: confirm active policies and applicant groups for intake 2026.
- Blocks KB import: Yes

## 10_tuyensinh_home.md dynamic homepage content

- File: `data/vgu_crawl_reviewed/10_tuyensinh_home.md`
- Field: Vietnamese homepage overview, program links, scholarship marketing, news excerpts
- Current value: dynamic Wix homepage content with marketing sections and news excerpts.
- Primary source: https://tuyensinh.vgu.edu.vn/
- Supporting source: specialized VGU pages and individual article URLs.
- Conflict or uncertainty: homepage excerpts are unstable and lower priority than specialized official pages.
- Agent assessment: whole homepage must not be imported.
- Recommended action: curate a small index only if stable links are needed; crawl/review individual news articles separately if they contain official admissions facts.
- Required human decision: decide whether a curated Vietnamese portal index is useful.
- Blocks KB import: Yes for whole homepage; No for separately verified curated links.

## Operational checks

- `data/vgu_crawl_raw/01_trang_chu_tuyen_sinh_vgu.md` appears to be a duplicate/raw export for `https://vgu.edu.vn/admission`; keep it out of import until a human decides whether to archive or remove it.
- Contact details parsed from VGU pages should be verified against a dedicated official contact page before import. Some crawler output contained malformed mail links where an email address was parsed as an HTTP URL.
- Primary official pages were checked on 2026-07-28 and returned HTTP 200. Official PDF links found in the reviewed files also returned `200 application/pdf`, but PDF contents were not manually verified in this task.
- All reviewed `needs_review` files are intentionally outside `vgu_admissions_import/` to avoid accidental Knowledge Base import.
- Existing verified/import-ready file remains limited to `vgu_admissions_import/01_trang_chu_tuyen_sinh_vgu.md`; it only verifies admissions overview structure, program lists, and official application links.
- No Knowledge Base import, Qdrant indexing, API change, database change, or crawler change was performed in this review task.
