# UI Review Report - vite-app

**NgÃ y review:** 2026-05-07
**Branch:** feature/footer-i18n

## Tá»•ng quan

- **Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui (radix-nova)
- **i18n:** i18next (vi/en), 17 namespace cho cáº£ hai ngÃ´n ngá»¯
- **Theme:** Dark/light/system support

---

## 1. i18n - CÃ¡c chuá»—i chÆ°a Ä‘Æ°á»£c dá»‹ch (Cao)

### Dashboard - Chuá»—i cá»‘ Ä‘á»‹nh tiáº¿ng Viá»‡t

- `dashboard-date-range.ts:20-25` â€” ToÃ n bá»™ 6 label date range hardcode tiáº¿ng Viá»‡t (`"HÃ´m nay"`, `"HÃ´m qua"`, `"7 ngÃ y gáº§n Ä‘Ã¢y"`, `"14 ngÃ y gáº§n Ä‘Ã¢y"`, `"ThÃ¡ng nÃ y"`, `"ThÃ¡ng trÆ°á»›c"`), khÃ´ng Ä‘i qua `t()`

### Dashboard - Chuá»—i cá»‘ Ä‘á»‹nh tiáº¿ng Anh

- `dashboard-conversion-funnel-panel.tsx:15-23` â€” 7 label funnel stage hardcode tiáº¿ng Anh (`"Lead created"`, `"Contact collected"`, `"Chat interacted"`, `"Interest detected"`, `"Hot lead"`, `"Assigned"`, `"Contacted+"`)
- `dashboard-conversation-stats-panel.tsx:94-99` â€” Channel labels hardcode (`WEB`, `ZALO`, `FACEBOOK`, `TELEGRAM`)

### Staff - Role labels

- `staff-table.tsx:221` â€” `staff.role === "ADMIN" ? "Admin" : "Counselor"` hardcode
- `staff-form-dialog.tsx:216-217` â€” `<SelectItem>` label "Admin"/"Counselor" hardcode
- `staff-toolbar.tsx:61-62` â€” TÆ°Æ¡ng tá»±

### Major type labels

- `major-type.tsx:54-58` â€” `"Undergraduate"`, `"Graduate"`, `"Certificate"` hardcode trong type file, khÃ´ng dÃ¹ng i18n

### Scholarship type labels

- `scholarship-page.tsx:17-22` â€” `"Há»c bá»•ng theo thÃ nh tÃ­ch"`, `"Há»c bá»•ng theo nhu cáº§u"`, `"Há»c bá»•ng tÃ i nÄƒng"`, `"Há»c bá»•ng Ä‘áº·c biá»‡t"` hardcode tiáº¿ng Viá»‡t

---

## 2. Accessibility - Váº¥n Ä‘á» truy cáº­p (Trung bÃ¬nh)

### NÃºt chá»‰ icon thiáº¿u `aria-label`

- `header.tsx:74` â€” Avatar card link khÃ´ng cÃ³ aria label
- `footer.tsx:48-56` â€” CÃ¡c `<a>` link (NavLink) thiáº¿u `aria-label` mÃ´ táº£ Ä‘Ã­ch Ä‘áº¿n
- Staff/Major/Knowledge Chunk/Tuition Policy toolbar â€” NÃºt "X" clear filter khÃ´ng cÃ³ `aria-label`
- Staff/Major/Knowledge Chunk/Tuition Policy table â€” NÃºt edit/delete icon thiáº¿u `aria-label`

### Table row click khÃ´ng há»— trá»£ bÃ n phÃ­m

- Dashboard daily table, Lead table, Major table, Knowledge Chunk table, Tuition Policy table â€” `onClick` trÃªn `<TableRow>` nhÆ°ng khÃ´ng cÃ³ `tabIndex={0}`, `role="button"`, hoáº·c `onKeyDown`

### Form labels khÃ´ng liÃªn káº¿t vá»›i input

- Lead detail panel â€” DÃ¹ng `<p>` thay vÃ¬ `<label htmlFor="...">` cho ~20 fields (trÆ°á»ng tÃªn, email, phone, GPA, IELTS, SAT, ACT...)

### Error banners thiáº¿u `role="alert"`

- Táº¥t cáº£ error banners trÃªn 7 admin pages Ä‘á»u dÃ¹ng `<div>` thÆ°á»ng, khÃ´ng cÃ³ `role="alert"` cho screen reader

---

## 3. UX Issues (Trung bÃ¬nh)

### Thiáº¿u feedback khi thÃ nh cÃ´ng

- `staff-page.tsx` â€” Sau khi táº¡o/cáº­p nháº­t staff thÃ nh cÃ´ng, chá»‰ Ä‘Ã³ng dialog, khÃ´ng hiá»‡n toast hay success banner (trá»« major, knowledge-chunk, tuition-policy cÃ³ success banner nhÆ°ng khÃ´ng tá»± dismiss)

### Success banner khÃ´ng tá»± áº©n

- `lead-page.tsx:244-248`, `major-page`, `knowledge-chunk-page`, `tuition-policy-page` â€” `actionSuccess` banner sáº½ hiá»ƒn thá»‹ mÃ£i cho Ä‘áº¿n khi user lÃ m action khÃ¡c, khÃ´ng cÃ³ `setTimeout` Ä‘á»ƒ auto-dismiss

### NÃºt "Learn more" khÃ´ng cÃ³ hÃ nh Ä‘á»™ng

- `programs-page.tsx:117` vÃ  `scholarship-page.tsx:125` â€” NÃºt "Learn more" trÃªn card nhÆ°ng khÃ´ng cÃ³ `onClick` hay link, button khÃ´ng lÃ m gÃ¬ cáº£

### Thiáº¿u file type hint khi upload

- `knowledge-chunk-upload-dialog.tsx` â€” File input khÃ´ng cÃ³ `accept` attribute, user khÃ´ng biáº¿t Ä‘Æ°á»£c file type nÃ o Ä‘Æ°á»£c cháº¥p nháº­n

### NÃºt Paperclip vÃ  Mic khÃ´ng hoáº¡t Ä‘á»™ng

- `home-chat-shell.tsx:684-699` â€” Hai nÃºt Paperclip vÃ  Mic hiá»ƒn thá»‹ nhÆ°ng khÃ´ng cÃ³ `onClick` handler â€” dead buttons

---

## 4. Consistency Issues (Tháº¥p)

### KÃ­ch thÆ°á»›c heading trang khÃ´ng nháº¥t quÃ¡n

- Dashboard: `text-[18px]`, Staff: `text-[18px]`, Lead: `text-lg`, Hot Questions: `text-lg`, Knowledge Chunk: `text-[18px]`
- NÃªn thá»‘ng nháº¥t dÃ¹ng `text-lg` (Tailwind class) hoáº·c `text-[18px]`

### Error banner styling khÃ´ng nháº¥t quÃ¡n

- Staff: `border-red-100 bg-red-50/80 text-red-600`
- Lead: `border-red-200 bg-red-50 text-red-700`
- Dashboard: `border-red-100 bg-red-50/80 text-red-600`
- NÃªn táº¡o má»™t shared component `ErrorBanner`

### Description text size khÃ´ng nháº¥t quÃ¡n

- Staff: `text-[13px]`, Lead: `text-sm` â€” khÃ¡c nhau nhÆ°ng gáº§n giá»‘ng

### CRUD action buttons khÃ´ng nháº¥t quÃ¡n

- Staff table: CÃ³ cáº£ edit vÃ  delete icon buttons
- Major/Tuition Policy table: Chá»‰ cÃ³ delete button, edit pháº£i click vÃ o row â€” user khÃ´ng biáº¿t row clickable

### HÃ m `buildPageItems` bá»‹ láº·p code

- CÃ¹ng má»™t hÃ m `buildPageItems` Ä‘Æ°á»£c copy-paste á»Ÿ 7 file table khÃ¡c nhau (staff, lead, hot-questions, major, knowledge-chunk, tuition-policy, lead-activities). NÃªn extract ra shared utility.

---

## 5. CSS/Design Issues (Tháº¥p)

### Footer khÃ´ng há»— trá»£ dark mode

- `footer.tsx:68` â€” Hardcode `bg-white`, `text-slate-900` sáº½ khÃ´ng thay Ä‘á»•i trong dark mode

### Header user card khÃ´ng há»— trá»£ dark mode

- `header.tsx:74-89` â€” Hardcode `bg-white`, `border-slate-200`, `text-slate-950` cho user card

### Scholarship page khÃ´ng há»— trá»£ dark mode

- `scholarship-page.tsx` â€” ToÃ n bá»™ page hardcode light colors (`bg-slate-50/30`, `from-amber-50 to-white`, v.v.)

### Programs page khÃ´ng há»— trá»£ dark mode

- TÆ°Æ¡ng tá»± scholarship page

### Position issue

- `dashboard-range-filter.tsx:32` â€” Element dÃ¹ng `absolute` positioning nhÆ°ng parent div thiáº¿u class `relative`

---

## 6. Æ¯u Ä‘iá»ƒm

- **Component architecture** rÃµ rÃ ng: feature-based, tÃ¡ch page/components/api/hooks/types
- **shadcn/ui** usage nháº¥t quÃ¡n across all admin pages
- **Loading states** tá»‘t: Skeleton components, spinner trÃªn buttons, loading text trong chat
- **Error handling** Ä‘áº§y Ä‘á»§: Error banners, dialog errors, chat errors
- **Mobile responsive**: Header cÃ³ mobile menu, grid layouts cÃ³ responsive breakpoints
- **i18n coverage** khÃ¡ tá»‘t cho pháº§n lá»›n text (trá»« cÃ¡c hardcoded strings Ä‘Ã£ nÃªu)
- **Optimistic updates** trong chat: User vÃ  assistant messages hiá»ƒn thá»‹ ngay, placeholder animation cho assistant

---

## TÃ³m táº¯t Æ°u tiÃªn

| Má»©c Æ°u tiÃªn | Váº¥n Ä‘á» | Sá»‘ file áº£nh hÆ°á»Ÿng |
|---|---|---|
| **Cao** | Hardcoded strings cáº§n i18n | ~10 files |
| **Trung bÃ¬nh** | Missing `aria-label` trÃªn icon buttons | ~8 files |
| **Trung bÃ¬nh** | Table row click thiáº¿u keyboard support | 6 tables |
| **Trung bÃ¬nh** | Dead buttons (Paperclip, Mic, Learn more) | 3 files |
| **Trung bÃ¬nh** | Staff page thiáº¿u success feedback | 1 file |
| **Tháº¥p** | Inconsistent heading/banner styling | ToÃ n bá»™ admin pages |
| **Tháº¥p** | Duplicated `buildPageItems` | 7 files |
| **Tháº¥p** | Dark mode support cho public pages | 3 files |

---

## Bo sung tu dot review cung ngay

Cac diem duoi day duoc gop them tu ban review cung ngay de tranh tach nhieu file nho:

- Login flow:
  - `login-layout.tsx` di?u hu?ng sang `/admin` ngay c? khi dang nh?p th?t b?i; c?n ch? navigate khi `login()` thành công.
- Mobile UX:
  - `header.tsx` chua dóng mobile menu khi d?i route.
- Code quality/UI consistency:
  - `login-layout.tsx` dùng raw `<input>` thay vì component `Input` th?ng nh?t.
  - `chat-page.tsx` có grid fixed width c?ng (`lg:grid-cols-[21rem_minmax(0,1fr)_18rem]`) d? kém thích ?ng màn hình trung gian.
  - `dialog.tsx` có class Tailwind không chu?n (`backdrop-blur-xs`).
  - `select.tsx` có do?n JSX c?n chu?n hóa cú pháp self-closing d? d? d?c/d?ng nh?t style.

