# Phase 3 Contract: Auto Mode + Batch Status

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Phase**: 3 of 3

---

## 1. What Changes In Real Life

User chọn "Auto" mode khi upload → OCR xong → tự động đưa vào embedding pipeline với AI-suggested category (không cần confirm). User thấy danh sách tất cả jobs với status tracking, có thể retry failed jobs.

---

## 2. Entry State

- Phase 1 backend API hoạt động
- Phase 2 preview UI hoạt động (user có thể upload, preview, send to KB thủ công)
- Knowledge Base embedding pipeline hoạt động

---

## 3. Exit State

- User có thể chọn "Auto" mode → file OCR xong → tự động embed không cần confirm
- User thấy batch job list với status (pending/processing/completed/failed)
- User có thể retry failed jobs
- Cả hai frontend đều có auto mode + batch status

---

## 4. Demo Walkthrough

1. User upload 3 files với "Auto" + "Auto detect category"
2. Thấy 3 jobs trong danh sách: 1 completed, 1 processing, 1 pending
3. Jobs completed → tự động có chunks trong Knowledge Base (không cần user click)
4. Nếu job failed → click Retry → job chạy lại

---

## 5. What This Phase Unlocks Next

Done — feature hoàn thành.

---

## 6. Explicitly Out of Scope

- Multi-file batch upload dialog (D1 - batch queuing đã qua RQ)
- Phase 1-2 changes

---

## 7. Pivot Signals

Nếu thấy:
- Auto embed fail → kiểm tra KB API, retry logic
- Job status not updating → kiểm tra RQ worker
- Batch list performance slow → pagination hoặc caching