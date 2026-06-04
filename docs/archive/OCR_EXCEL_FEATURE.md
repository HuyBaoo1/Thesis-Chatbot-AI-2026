# OCR Excel — Feature Design

## Mục tiêu

Mở rộng OCR pipeline hiện tại để hỗ trợ file Excel (`.xlsx`, `.xls`, `.csv`), giữ nguyên kiến trúc và luồng xử lý hiện có. Output là markdown table, tương thích với KB chunking pipeline.

## Hiện trạng

Pipeline OCR đang hỗ trợ: PDF, PNG, JPG, WebP, TIFF. File được upload → enqueue RQ job → parse → lưu markdown lên R2 → có thể send-to-kb.

Luồng hiện tại trong `process_ocr_job()`:
```
PDF → smart extraction (DocumentAnalyzer → PyMuPDF hoặc Vision API)
Non-PDF → remote document parser
```

## Thiết kế

### Nguyên tắc

- **Không thay đổi luồng OCR hiện tại** — chỉ thêm nhánh xử lý Excel
- **Tái sử dụng OcrJob model** — Excel output vẫn là markdown, lưu R2 như cũ
- **Tái sử dụng send-to-kb pipeline** — markdown table vẫn chunk + embed bình thường
- **Dùng chung RQ queue**

### Kiến trúc mở rộng

```
Upload file → validate magic bytes
  ├── PDF → smart extraction (giữ nguyên)
  ├── Image (PNG/JPG/...) → remote parser (giữ nguyên)
  └── Excel (.xlsx/.xls/.csv) → ExcelExtractor (MỚI)
       ├── Gửi qua remote document parser API (nếu hỗ trợ)
       └── Fallback: local extraction (openpyxl + pandas)
```

### File thay đổi

| # | File | Việc |
|---|------|------|
| 1 | `src/services/ocr_excel_extractor.py` | **Mới** — Excel → markdown table |
| 2 | `src/services/ocr_service.py` | Thêm nhánh Excel trong `process_ocr_job()` |
| 3 | `src/api/routers/ocr_quick.py` | Thêm magic bytes `.xlsx`, `.xls`, `.csv` |
| 4 | `vite-app/.../quick-processing-upload-dialog.tsx` | Cập nhật accept attribute |
| 5 | `requirements.txt` | Thêm `openpyxl`, `xlrd` |

### Các file không cần đụng

- `src/models/ocr_job.py` — tái sử dụng nguyên
- `src/services/ocr_smart_extractor.py` — không liên quan
- `src/services/ocr_temp_storage.py` — không đổi
- `src/services/r2_service.py` — không đổi
- `src/services/knowledge_chunk_service.py` — không đổi
- KB chunking + embedding pipeline — không đổi

---

## ExcelExtractor Service

### Input/Output

- **Input**: `file_bytes: bytes`, `file_name: str`
- **Output**: `str` — markdown với format:

```markdown
## Sheet: {sheet_name}

| Col A | Col B | Col C |
|-------|-------|-------|
| val1  | val2  | val3  |
| ...   | ...   | ...   |

## Sheet: {sheet_name_2}
...
```

### Xử lý đặc thù Excel

| Vấn đề | Cách xử lý |
|--------|-----------|
| **Multi-sheet** | Mỗi sheet → 1 section `## Sheet: {name}` |
| **Merge cell** | Forward-fill giá trị vào tất cả ô merged |
| **Empty rows/cols** | Strip row trống hoàn toàn, strip column trống hoàn toàn trước khi render |
| **CSV encoding** | Ưu tiên UTF-8 BOM → UTF-8 → Windows-1258 (tiếng Việt) |
| **File .xls cũ** | Dùng `xlrd` để đọc |
| **Số lớn / ngày tháng** | Giữ nguyên định dạng hiển thị trong Excel, không convert |
| **Bảng > 500 dòng** | Giữ nguyên, để chunking pipeline xử lý slice |

### Chiến lược extraction

```python
def extract(self, file_bytes: bytes, file_name: str) -> str:
    suffix = file_name.lower().split('.')[-1]

    if suffix in ('xlsx', 'xls'):
        return self._extract_excel(file_bytes, suffix)
    elif suffix == 'csv':
        return self._extract_csv(file_bytes)
```

#### `_extract_excel()`
1. Mở workbook bằng `openpyxl` (`.xlsx`) hoặc `xlrd` (`.xls`)
2. Lặp qua từng sheet:
   - Đọc toàn bộ dữ liệu vào `list[list[str]]`
   - Forward-fill merge cell (openpyxl có `merged_cells.ranges`)
   - Strip empty rows & columns
   - Render thành markdown table
3. Join các sheet bằng `\n\n`

#### `_extract_csv()`
1. Detect encoding (thử UTF-8 BOM → UTF-8 → Windows-1258)
2. Parse bằng `csv.reader` hoặc `pandas.read_csv()`
3. Strip empty rows & columns
4. Render thành markdown table (chỉ 1 sheet ảo tên file)

### Dependencies mới

```txt
openpyxl>=3.1.0    # .xlsx reader
xlrd>=2.0.0        # .xls reader
pandas>=2.0.0      # CSV + data handling (đã có thể dùng csv module built-in)
```

---

## Magic Bytes Validation

Thêm vào `MAGIC_NUMBERS` dict:

```python
MAGIC_NUMBERS = {
    # ... existing ...
    "xlsx": b"PK\x03\x04",       # ZIP-based OOXML
    "xls": b"\xd0\xcf\x11\xe0",  # OLE2 compound document
    "csv": b"",                   # plain text, no magic bytes
}
```

Lưu ý: `.xlsx` magic bytes trùng với `.docx`, `.pptx` — cần validate thêm bằng extension whitelist.

---

## Tích hợp vào process_ocr_job()

Thêm nhánh trước khi gọi smart extraction:

```python
EXCEL_EXTENSIONS = {'.xlsx', '.xls', '.csv'}

def process_ocr_job(...):
    # ... existing setup ...

    file_ext = os.path.splitext(file_name)[1].lower()

    if file_ext in EXCEL_EXTENSIONS:
        _update_job_progress(35, "Extracting Excel to markdown...")
        from src.services.ocr_excel_extractor import ExcelExtractor
        extractor = ExcelExtractor()
        md_content = extractor.extract(file_bytes, file_name)
        extraction_info = {
            "strategy": "excel",
            "provider": "local_excel_extractor",
            "source_filename": file_name,
        }
        page_count = extraction_info.get("sheet_count", 1)
    elif should_use_smart_extraction and file_name.lower().endswith('.pdf'):
        # ... existing PDF smart extraction ...
    else:
        # ... existing remote parser ...
```

---

## Frontend

Cập nhật `accept` attribute trong `quick-processing-upload-dialog.tsx`:

```tsx
accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.xlsx,.xls,.csv"
```

---

## Test Plan

### Manual tests
1. Upload `.xlsx` đơn giản (1 sheet, không merge) → verify markdown table đúng
2. Upload `.xlsx` multi-sheet → verify mỗi sheet 1 section
3. Upload `.xlsx` có merge cell → verify giá trị được forward-fill đúng
4. Upload `.xls` (format cũ) → verify vẫn đọc được
5. Upload `.csv` UTF-8 → verify encoding đúng
6. Upload `.csv` Windows-1258 (tiếng Việt) → verify encoding được detect
7. Upload file Excel rỗng → verify báo lỗi thân thiện
8. Send to KB → verify chunking hoạt động với markdown table
9. Chatbot hỏi về nội dung Excel → verify RAG trả về đúng

### Edge cases
- File Excel có sheet trống
- File Excel chỉ có 1 dòng (header only)
- File CSV không có header
- File Excel có công thức (chỉ lấy giá trị hiển thị)
- File > 10MB

---

## Checklist triển khai

- [ ] Tạo `src/services/ocr_excel_extractor.py`
- [ ] Thêm `openpyxl`, `xlrd` vào `requirements.txt`
- [ ] Sửa `ocr_service.py` — thêm nhánh Excel
- [ ] Sửa `ocr_quick.py` — thêm magic bytes + accept extensions
- [ ] Sửa `quick-processing-upload-dialog.tsx` — thêm file types
- [ ] Test manual các case trên
