# Plan: Web Widget Embeddable (iframe / JS Snippet)

## Mục tiêu
Cho phép nhúng chat AI vào website tuyển sinh bên ngoài bằng `<iframe>` hoặc `<script>` snippet. Hiện tại chat chỉ là React component cứng trong `home-page.tsx`.

## Hiện trạng
- Chat hoạt động trong `vite-app/src/features/home/components/home-chat-shell.tsx` (787 dòng)
- Flow: `HomeLeadFormDialog` (thu thập name/email/phone) → `initLead()` → `queryChat()`
- State lưu trong Zustand `lead-store.tsx` + localStorage persist
- Auth: không cần đăng nhập, dùng `lead_id` + `conversation_token` qua query params
- API endpoints: `POST /chat/init-lead`, `POST /chat/query`, `GET /chat/conversations/{id}/messages`, WebSocket `/realtime/conversations/{id}/ws`

## Thiết kế

### Cách 1: iframe embed (ưu tiên — đơn giản, an toàn)
```
<script src="https://vinunits.cloud/widget.js" data-org="vinuni"></script>
```
Script tạo iframe trỏ tới `https://vinunits.cloud/widget` — một route riêng chỉ render chat shell.

### Cách 2: JS snippet inject trực tiếp (nâng cao)
Script inject toàn bộ React app dạng floating button + popup chat vào DOM host.

**Khuyến nghị**: Làm cách 1 trước (iframe), cách 2 sau nếu cần tùy biến UI.

## Các bước thực hiện

### Phase 1: Tạo route `/widget` cho chat standalone

**File mới**: `vite-app/src/layouts/widget-layout.tsx`
- Layout tối giản: chỉ `<HomeChatShell />`, không header/footer/hero
- Không cần `<HomeHero />`, bỏ grid layout 2 cột
- Full height, responsive mobile

**Router**: thêm route vào `vite-app/src/app/router.tsx`
```tsx
{
  path: "widget",
  element: <WidgetLayout />,
}
```

### Phase 2: CSS isolation cho iframe

**File**: `vite-app/src/layouts/widget-layout.tsx`
- Style dark/light mode tự động theo `prefers-color-scheme`
- Responsive: mobile fullscreen, desktop thu nhỏ
- Thêm `?embed=true` query param để widget biết đang trong iframe → bỏ back link, điều chỉnh padding

### Phase 3: Tạo widget loader script

**File mới**: `vite-app/public/widget.js`
```javascript
(function() {
  var script = document.currentScript;
  var org = script.getAttribute('data-org') || 'vinuni';
  var iframe = document.createElement('iframe');
  iframe.src = 'https://vinunits.cloud/widget?org=' + org;
  iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;...';
  // ... toggle open/close, floating button, etc.
  document.body.appendChild(iframe);
})();
```

### Phase 4: Floating button + popup pattern

**File**: `vite-app/public/widget.js`
- Floating chat bubble button ở góc phải dưới
- Click mở iframe popup 400x600px
- Badge hiển thị trạng thái online
- Responsive mobile: fullscreen khi mở

### Phase 5: CORS & security

**Backend**: `src/core/config.py`
- Thêm `WIDGET_ORIGINS` env var cho danh sách domain được phép embed
- Middleware kiểm tra `Origin`/`Referer` header

**Backend**: `src/main.py`
- CORS middleware đã có (`ALLOWED_ORIGINS`), thêm origin của site nhúng

### Phase 6: Tracking analytics

**Backend**: `src/services/conversation_service.py`
- Thêm `source_domain` field vào Conversation khi request từ widget

**Frontend**: `widget.js`
- Gửi `source_domain` qua query param hoặc postMessage

## Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `vite-app/src/layouts/widget-layout.tsx` | New | Layout standalone cho widget chat |
| `vite-app/src/app/router.tsx` | Edit | Thêm route `/widget` |
| `vite-app/public/widget.js` | New | Loader script cho site ngoài |
| `vite-app/public/widget.css` | New | Style cho floating button/iframe |
| `src/api/routers/chat.py` | Edit | Thêm CORS header cho widget origins |
| `src/models/conversation.py` | Edit | Thêm `source_domain` column |
| `src/services/conversation_service.py` | Edit | Lưu source_domain khi tạo conversation |

## Timeline ước tính: 3-4 ngày
