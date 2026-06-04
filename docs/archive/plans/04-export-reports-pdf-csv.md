# Plan: Export Báo Cáo PDF/CSV cho Dashboard Analytics

## Mục tiêu
Cho phép admin/counselor export dữ liệu analytics ra CSV và PDF từ dashboard: daily analytics, conversion funnel, hot questions, lead list.

## Hiện trạng
- Dashboard hiển thị dữ liệu qua API, không có nút export nào
- Không có thư viện PDF/CSV generation nào trong backend hoặc frontend
- Frontend có thể export CSV trực tiếp từ dữ liệu đã fetch (client-side)
- PDF cần server-side generation (phức tạp hơn)

## Thiết kế

### Strategy
1. **CSV export**: Client-side — dùng dữ liệu đã fetch từ React Query, convert sang CSV blob, download
2. **PDF export**: Server-side — endpoint mới trả về PDF file, dùng `weasyprint` hoặc `reportlab`

### Format mẫu

**CSV — Daily Analytics**:
```csv
Date,Total Chats,New Leads,Active Conversations,Handoffs,Fallbacks,Top Intents
2026-05-01,245,32,18,5,12,"admission_requirements, scholarship, tuition_fee"
2026-05-02,278,41,22,7,15,"scholarship, admission_requirements, major_info"
```

**PDF — Conversion Funnel Report**:
- Header: VinUni logo + title "Conversion Funnel Report — May 2026"
- Funnel chart visualization
- Bảng số liệu chi tiết
- So sánh với tháng trước

## Các bước thực hiện

### Phase 1: CSV export (client-side)

**File mới**: `vite-app/src/lib/export-csv.ts`
```typescript
function exportToCSV(data: Record<string, any>[], filename: string): void {
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
```

**Các nút export thêm vào**:
- `dashboard-page.tsx` → nút "Export CSV" cạnh mỗi panel
- `dashboard-daily-table.tsx` → export dữ liệu daily analytics
- `dashboard-conversion-funnel-panel.tsx` → export funnel data
- `hot-questions/` → export hot questions list
- `lead/` → export lead list với filter hiện tại

### Phase 2: PDF export API (server-side)

**Install**: `weasyprint` (HTML→PDF) hoặc `reportlab` (programmatic PDF)

**File mới**: `src/services/export_service.py`
- `generate_daily_analytics_pdf(from_date, to_date)` → PDF bytes
- `generate_conversion_funnel_pdf()` → PDF bytes
- `generate_lead_report_pdf(filters)` → PDF bytes

**File mới**: `src/services/pdf_templates.py`
- HTML templates cho từng loại báo cáo
- VinUni branding: logo, colors, fonts

**File mới**: `src/api/routers/export.py`
```
GET  /export/daily-analytics?from=...&to=...&format=pdf|csv
GET  /export/conversion-funnel?format=pdf|csv
GET  /export/hot-questions?format=pdf|csv
GET  /export/leads?...&format=pdf|csv
```
Trả về `FileResponse` với content-type phù hợp.

### Phase 3: Download button UI

**File mới**: `vite-app/src/components/common/export-button.tsx`
- Dropdown: Export as CSV | Export as PDF
- Loading state khi đang generate
- Toast notification khi export xong

**File**: `vite-app/src/api/admin-analytics-api.tsx`
- Thêm `exportAnalytics(params, format)` function

### Phase 4: Scheduled report email (optional, tích hợp với plan 03)

**File**: `src/services/export_service.py`
- `generate_weekly_report()` — tự động tạo báo cáo hàng tuần
- Gửi email cho admin với PDF đính kèm

## Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `vite-app/src/lib/export-csv.ts` | New | CSV export utility |
| `vite-app/src/components/common/export-button.tsx` | New | Export dropdown button |
| `src/services/export_service.py` | New | PDF generation logic |
| `src/services/pdf_templates.py` | New | HTML templates cho PDF |
| `src/api/routers/export.py` | New | Export API endpoints |
| `src/main.py` | Edit | Register export router |
| `vite-app/src/features/dashboard/dashboard-page.tsx` | Edit | Thêm export buttons |
| `vite-app/src/features/lead/lead-page.tsx` | Edit | Thêm export button |
| `vite-app/src/features/hot-questions/hot-questions-page.tsx` | Edit | Thêm export button |
| `vite-app/src/api/admin-analytics-api.tsx` | Edit | Thêm export API calls |
| `requirements.txt` | Edit | Thêm `weasyprint` hoặc `reportlab` |

## Timeline ước tính: 3-4 ngày
