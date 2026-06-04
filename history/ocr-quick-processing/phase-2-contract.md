# Phase 2 Contract: Preview Mode UI

**Date**: 2026-04-27
**Feature**: ocr-quick-processing
**Phase**: 2 of 3

---

## 1. What Changes In Real Life

User thấy trang **Quick Processing** trong sidebar navigation, có thể upload file (PDF, ảnh), xem AI-suggested category, preview markdown content, và gửi vào Knowledge Base sau khi xác nhận.

---

## 2. Entry State

- Phase 1 backend API (`/api/ocr-quick/*`) đã hoạt động
- User có thể upload file qua API (tested via Postman/curl)
- Knowledge Base embedding pipeline đã tồn tại và có thể receive chunks

---

## 3. Exit State

- User có thể vào Quick Processing page từ sidebar navigation
- User có thể upload file với "Auto detect category" và thấy AI-suggested category
- User có thể preview MD content trong modal
- User có thể confirm/edit category và gửi vào Knowledge Base thành công
- Cả hai frontend (vite-app và demo) đều có Quick Processing UI

---

## 4. Demo Walkthrough

1. User vào chatbot → thấy **Quick Processing** menu trong sidebar (cùng level với Dashboard, Leads)
2. Click Quick Processing → vào page với danh sách file đã upload + Upload button
3. Click Upload → dialog mở ra, chọn file PDF/ảnh
4. Chọn "Auto detect category" → upload → thấy AI-suggested category (e.g., "admissions", confidence 0.85)
5. Click Preview → modal hiển thị markdown content, có thể edit category
6. Click "Send to Knowledge Base" → thành công, file xuất hiện trong KB

---

## 5. What This Phase Unlocks Next

Phase 3: Auto Mode + Batch Status — sau khi preview mode hoạt động, user có thể chọn Auto mode để OCR xong tự động embed không cần confirm.

---

## 6. Explicitly Out of Scope

- Auto mode (Phase 3)
- Batch status tracking với nhiều job cùng lúc (Phase 3)
- Retry failed jobs UI (Phase 3)
- Multi-file batch upload dialog (Phase 3)

---

## 7. Pivot Signals

Nếu thấy:
- Gemini API rate limit error → kiểm tra quota, thêm retry logic
- R2 upload fail → kiểm tra credentials, bucket permissions
- Knowledge Base chunk creation fail → debug embedding pipeline
- Frontend routing không hoạt động → kiểm tra react-router setup
