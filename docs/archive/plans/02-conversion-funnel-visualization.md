# Plan: Conversion Funnel Visualization

## Mục tiêu
Thay thế bảng số liệu thô của conversion funnel bằng biểu đồ funnel chart trực quan, có khả năng lọc theo khoảng thời gian.

## Hiện trạng
- **Frontend**: `vite-app/src/features/dashboard/components/dashboard-conversion-funnel-panel.tsx` (131 dòng) — hiển thị 7 stage dạng bar chart đơn giản với CSS div
- **Backend API**: `GET /admin/analytics/conversion-funnel` — trả về 7 stage với count và conversion_from_previous
- **Backend service**: `src/services/admin_analytics_service.py::get_conversion_funnel()` — query aggregate toàn bộ leads, không có date filter
- **Không có chart library** nào được cài trong package.json

## Thiết kế

### Library lựa chọn
**Recharts** — nhẹ, React-native, dễ dùng, phổ biến nhất với React + TypeScript.
```bash
npm install recharts
```

### Funnel chart component

```
┌──────────────────────────────────────────┐
│  Conversion Funnel                    [?] │
│  [Last 30 days ▾]    [Export CSV]        │
├──────────────────────────────────────────┤
│                                          │
│  🟢 Lead Created       1,200  (100%)    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  🔵 Contact Collected    840  (70%)     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  🔵 Chat Interacted      620  (52%)     │
│  ━━━━━━━━━━━━━━━━━━━━━━                 │
│  🟡 Interest Detected    340  (28%)     │
│  ━━━━━━━━━━━━━━                         │
│  🟠 Hot Lead             150  (12.5%)   │
│  ━━━━━━━━                               │
│  🔴 Assigned              80  (6.7%)    │
│  ━━━━━━                                 │
│  🔴 Contacted             50  (4.2%)    │
│  ━━━━━                                  │
│                                          │
└──────────────────────────────────────────┘
```

### Thêm date range filter vào API

**Backend**: thêm query params `?days=30` hoặc `?from=2026-01-01&to=2026-05-01` vào endpoint conversion-funnel.
**Service**: filter leads by `created_at` range.

## Các bước thực hiện

### Phase 1: Cài Recharts + tạo FunnelChart component

**Install**:
```bash
cd vite-app && npm install recharts
```

**File mới**: `vite-app/src/features/dashboard/components/dashboard-funnel-chart.tsx`
- Sử dụng `BarChart` horizontal layout của Recharts
- 7 stage với màu gradient (emerald → red) theo mức độ drop-off
- Tooltip hiển thị: stage name, count, conversion rate từ stage trước
- Label hiển thị % conversion bên phải mỗi bar
- Responsive container

### Phase 2: Thêm date range filter

**File mới**: `vite-app/src/features/dashboard/components/dashboard-range-filter.tsx`
- Dropdown chọn: 7 days, 30 days, 90 days, This season, All time
- Hoặc date picker range (from → to)
- Gửi params lên API

**File**: `vite-app/src/api/admin-analytics-api.tsx`
- Sửa `getConversionFunnel(params?: { days?: number; from?: string; to?: string })`

**File**: `vite-app/src/hooks/use-dashboard.tsx` (nếu có) hoặc trực tiếp trong dashboard-page
- Truyền filter state vào query

### Phase 3: Cập nhật backend API

**File**: `src/api/routers/admin_analytics.py`
- Thêm query params: `days: int = None`, `from_date: str = None`, `to_date: str = None`

**File**: `src/services/admin_analytics_service.py`
- Sửa `get_conversion_funnel()` nhận `date_from`, `date_to`
- Filter tất cả các query theo `Lead.created_at BETWEEN`

### Phase 4: Thêm trend chart (optional)

**File mới**: `vite-app/src/features/dashboard/components/dashboard-funnel-trend.tsx`
- Line chart hiển thị conversion rate theo thời gian (theo ngày/tuần)
- So sánh conversion giữa các giai đoạn

### Phase 5: Thay thế panel cũ

**File**: `vite-app/src/features/dashboard/dashboard-page.tsx`
- Thay `<ConversionFunnelPanel>` bằng `<FunnelChart>` + `<RangeFilter>`

## Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `vite-app/src/features/dashboard/components/dashboard-funnel-chart.tsx` | New | Funnel chart Recharts |
| `vite-app/src/features/dashboard/components/dashboard-range-filter.tsx` | New | Date range selector |
| `vite-app/src/features/dashboard/dashboard-page.tsx` | Edit | Thay panel cũ |
| `vite-app/src/api/admin-analytics-api.tsx` | Edit | Thêm params filter |
| `vite-app/src/types/admin-analytics-type.tsx` | Edit | Thêm type cho params |
| `src/services/admin_analytics_service.py` | Edit | Filter by date range |
| `src/api/routers/admin_analytics.py` | Edit | Thêm query params |

## Timeline ước tính: 2-3 ngày
