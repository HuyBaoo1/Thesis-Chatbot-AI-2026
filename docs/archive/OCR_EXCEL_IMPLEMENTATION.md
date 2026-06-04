# Excel OCR — Implementation Report

**Date**: 2026-05-08
**Status**: Code complete, pending manual testing

## Changes Summary

### New file

| File | Purpose |
|------|---------|
| `src/services/ocr_excel_extractor.py` | Excel → markdown table converter |

### Modified files

| File | Change |
|------|--------|
| `requirements.txt` | Added `openpyxl==3.1.5`, `xlrd==2.0.2` |
| `src/services/ocr_service.py` | Added Excel branch in `process_ocr_job()` |
| `src/api/routers/ocr_quick.py` | Added `.xlsx`, `.xls`, `.csv` to allowed types |
| `vite-app/src/.../quick-processing-upload-dialog.tsx` | Added `.xlsx,.xls,.csv` to file accept |

## Design Decisions

### Why local extraction instead of remote API?

Excel files don't need OCR — they are structured data. Local extraction with `openpyxl`/`xlrd` is:
- **Faster** — no network round-trip
- **Free** — no API cost per file
- **Reliable** — handles merge cells, multi-sheet, encoding without external dependency

### Merge cell handling

Merged cells are forward-filled: every cell in a merged range gets the top-left value. This ensures the markdown table is complete and no data is lost during chunking/embedding.

### Multi-sheet

Each sheet becomes a `## Sheet: {name}` section with its own markdown table. Empty sheets are skipped.

### CSV encoding

Detection order: UTF-8 BOM → UTF-16 BOM → UTF-8 → Windows-1258 (Vietnamese) → Latin-1 (fallback).

## What's NOT changed

- `OcrJob` model — reused as-is
- KB pipeline (`send-to-kb`) — unchanged, markdown tables chunk normally
- RQ queue — same queue, same worker
- PDF/Image OCR flow — untouched

## How to test

```bash
# 1. Install new deps
pip install openpyxl==3.1.5 xlrd==2.0.2

# 2. Start backend + worker
uvicorn src.main:app --reload &
python -m rq worker &

# 3. Create test file
# (use any .xlsx / .xls / .csv)

# 4. Upload via API
curl -X POST http://localhost:8000/api/ocr-quick/jobs \
  -F "file=@test.xlsx" \
  -F "title=Test Excel" \
  -F "category=FAQ"

# 5. Check job status
curl http://localhost:8000/api/ocr-quick/jobs/{job_id}

# 6. View markdown output
curl http://localhost:8000/api/ocr-quick/jobs/{job_id}/content
```

## Known Limitations

- `.xls` (legacy format) merge cells are NOT forwarded-fill (xlrd doesn't expose merged ranges easily)
- Excel files with >10,000 rows will produce large markdown — chunking handles this downstream
- Encrypted/password-protected Excel files will fail
