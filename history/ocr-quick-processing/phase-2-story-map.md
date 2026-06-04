# Phase 2 Story Map: Preview Mode UI

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Phase**: 2 of 3
**Stories**: 3
**Beads (est)**: 6-8

---

## Story Map

| # | Story | What Happens | Why Now | Contributes To | Unlocks |
|---|-------|--------------|---------|----------------|---------|
| 1 | Quick Processing page layout | User thấy page với sidebar nav, file list, upload button | D5 nav placement + D2 user choice per upload | Phase exit state | Story 2: Upload dialog |
| 2 | Upload dialog + job creation | User chọn file → upload → nhận job_id → thấy AI-suggested category | D12 AI detect + user confirmation | Phase exit state | Story 3: MD preview modal |
| 3 | MD preview modal + KB send | User preview MD content → confirm/edit category → send to Knowledge Base | D12 category verification + D10 embedding pipeline | Phase exit state | Phase 3: Auto mode |

---

## Story 1: Quick Processing page layout

**What Happens**: User vào Quick Processing page từ sidebar, thấy layout với file list (pending/completed), upload button, và filter options.

**Why Now**: Phải có page layout trước thì user mới có chỗ để thao tác. Navigation placement (D5) cần được implement.

**Contributes To**: Phase 2 exit state — user có thể thấy Quick Processing page

**Unlocks**: Story 2: Upload dialog — page layout là nền tảng cho upload flow

**Done Looks Like**:
- [ ] Sidebar có "Quick Processing" menu item cùng level với Dashboard/Leads
- [ ] Page route `/quick-processing` hoạt động ở cả 2 frontends
- [ ] Page hiển thị danh sách file (empty state khi chưa có file)
- [ ] Upload button visible trên page
- [ ] File list hiển thị job status (pending/processing/completed/failed)

---

## Story 2: Upload dialog + job creation

**What Happens**: User click Upload → dialog mở ra → chọn file → chọn "Auto detect category" → upload → thấy AI-suggested category.

**Why Now**: Upload flow là entry point — không có upload thì không có OCR. D12 yêu cầu user xác nhận category, nên dialog phải hiển thị AI suggestion.

**Contributes To**: Phase 2 exit state — user upload file và nhận được category suggestion

**Unlocks**: Story 3: MD preview modal — sau khi có category thì user cần preview MD

**Done Looks Like**:
- [ ] Upload dialog mở khi click Upload button
- [ ] Hỗ trợ drag-drop và file picker
- [ ] Chọn "Auto detect category" → upload file → call POST /api/ocr-quick/jobs
- [ ] Job được tạo → bắt đầu poll status
- [ ] Khi job completed → hiển thị AI-suggested category (category_id + confidence)
- [ ] Có thể chọn "Manual" category mode thay vì auto detect

---

## Story 3: MD preview modal + KB send

**What Happens**: User click Preview → modal hiển thị markdown content + category (editable) → click "Send to Knowledge Base" → tạo knowledge chunks thành công.

**Why Now**: D12 yêu cầu user confirm category trước khi embed. Preview mode là option quan trọng để user kiểm duyệt.

**Contributes To**: Phase 2 exit state — user preview MD và gửi vào KB thành công

**Unlocks**: Phase 3: Auto mode — hoàn thiện preview mode thì move sang auto

**Done Looks Like**:
- [ ] Preview modal mở khi click Preview button
- [ ] Markdown content hiển thị đúng format (headers, lists, code blocks)
- [ ] Category suggestion hiển thị và có thể edit
- [ ] "Send to Knowledge Base" button → call embedding pipeline
- [ ] Thành công → close modal + refresh file list
- [ ] Failed → show error message trong modal

---

## Story-to-Bead Mapping

### Story 1: Quick Processing page layout
- **Bead A20-App-165-5c5.4.1**: Sidebar navigation — add Quick Processing menu item
- **Bead A20-App-165-5c5.4.2**: Page component + routing — create QuickProcessingPage component
- **Bead A20-App-165-5c5.4.3**: File list component — display jobs with status

### Story 2: Upload dialog + job creation
- **Bead A20-App-165-5c5.5.1**: Upload dialog component — drag-drop, file picker
- **Bead A20-App-165-5c5.5.2**: OCR job integration — call API, poll status, show category

### Story 3: MD preview modal + KB send
- **Bead A20-App-165-5c5.6.1**: MD preview modal — render markdown, editable category
- **Bead A20-App-165-5c5.6.2**: Knowledge Base integration — call embedding pipeline

---

## Context Budget Estimates

| Bead | Est. Files | Est. Scope |
|------|------------|------------|
| 5c5.4.1 (sidebar nav) | 2 | S |
| 5c5.4.2 (page+routing) | 3 | M |
| 5c5.4.3 (file list) | 2 | S |
| 5c5.5.1 (upload dialog) | 2 | M |
| 5c5.5.2 (job integration) | 3 | M |
| 5c5.6.1 (preview modal) | 2 | M |
| 5c5.6.2 (KB integration) | 3 | M |

**Total Phase 2**: 7 beads, est. 17 files, scope M
