# Phase 3 Story Map: Auto Mode + Batch Status

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Phase**: 3 of 3
**Stories**: 2
**Beads (est)**: 4

---

## Story Map

| # | Story | What Happens | Why Now | Contributes To | Unlocks |
|---|-------|--------------|---------|----------------|---------|
| 1 | Auto processing flow | OCR xong → AI detect category → tự động call KB API (không confirm) | D2 auto mode + D12 AI detect - complete experience | Phase exit state | Done |
| 2 | Batch status tracking | List all jobs, status per job, retry failed | D1 batch queuing - user needs visibility | Phase exit state | Done |

---

## Story 1: Auto processing flow

**What Happens**: User chọn "Auto" mode khi upload → OCR job complete → backend auto-calls KB API với AI-suggested category → knowledge chunk created without user intervention.

**Why Now**: D2 spec nói user có 2 lựa chọn: Preview (manual confirm) hoặc Auto (auto embed). Phase 2 implement Preview, Phase 3 implement Auto.

**Contributes To**: Phase 3 exit state — auto mode works without user confirmation

**Unlocks**: Done — feature complete

**Done Looks Like**:
- [ ] Upload dialog có "Auto" / "Preview" mode toggle
- [ ] Backend nhận và apply category_mode
- [ ] Auto mode: job complete → auto create KB chunk (no wait for user confirm)
- [ ] Frontend shows "Auto-embedded" badge on completed auto jobs

---

## Story 2: Batch status tracking

**What Happens**: User thấy danh sách tất cả jobs (không chỉ recent), status per job, có thể retry failed jobs.

**Why Now**: D1 batch queuing means user có nhiều jobs. User cần visibility + ability to retry failed.

**Contributes To**: Phase 3 exit state — batch visibility and retry

**Unlocks**: Done — feature complete

**Done Looks Like**:
- [ ] Page shows all jobs (not just recent), with pagination
- [ ] Job status: pending → processing → completed/failed
- [ ] Failed jobs show error message
- [ ] "Retry" button on failed jobs → re-run OCR job
- [ ] Job count summary: "5 completed, 2 processing, 1 failed"

---

## Story-to-Bead Mapping

### Story 1: Auto processing flow
- **Bead A20-App-165-5c5.7.1**: Auto mode toggle in upload dialog (backend category_mode handling)
- **Bead A20-App-165-5c5.7.2**: Auto-embed trigger when job completes (backend auto-call KB)

### Story 2: Batch status tracking
- **Bead A20-App-165-5c5.8.1**: Job list with all jobs + pagination
- **Bead A20-App-165-5c5.8.2**: Retry failed jobs functionality

---

## Context Budget Estimates

| Bead | Est. Files | Est. Scope |
|------|------------|------------|
| 5c5.7.1 (auto toggle) | 2 | S |
| 5c5.7.2 (auto-embed trigger) | 3 | M |
| 5c5.8.1 (job list pagination) | 3 | M |
| 5c5.8.2 (retry failed) | 2 | S |

**Total Phase 3**: 4 beads, est. 10 files, scope S-M