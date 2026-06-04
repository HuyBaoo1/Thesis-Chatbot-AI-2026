# Hướng Dẫn Sử Dụng Shadow Mode - Tiếng Việt

## Tổng Quan

Shadow mode cho phép bạn test hệ thống hybrid extraction mới mà không ảnh hưởng đến production. Dữ liệu extraction được ghi vào bảng `crawled_urls_shadow` riêng biệt để validation trước khi rollout chính thức.

## Bước 1: Chạy Migration

```bash
cd services/web-crawler-rag-backend
alembic upgrade head
cd ../..
```

Migration sẽ tạo bảng `crawled_urls_shadow` với schema giống hệt `crawled_urls`.

## Bước 2: Populate Dữ Liệu Test

### Cách 1: Copy từ dữ liệu có sẵn (Khuyến nghị cho testing)

```bash
# Copy 100 URLs gần nhất vào shadow table
python scripts/populate_shadow_data.py --limit 100

# Copy tất cả URLs từ một session cụ thể
python scripts/populate_shadow_data.py --session-id "uuid-của-session"

# Copy không áp dụng simulated extraction (nếu muốn test extraction thật)
python scripts/populate_shadow_data.py --limit 100 --skip-extraction
```

**Script này sẽ**:
- Copy dữ liệu từ `crawled_urls` sang `crawled_urls_shadow`
- Tự động tạo dữ liệu hybrid extraction giả lập:
  - `extraction_method`: 75% rule_based, 25% ai_agent
  - `complexity_score`: Điểm độ phức tạp ngẫu nhiên
  - `metadata_confidence`: Điểm confidence cho từng field
  - `gpa_cutoff`: GPA cho 30% records
  - `deadline`: Deadline cho 20% records
  - `tuition_amount`: Học phí cho 25% records

### Cách 2: Enable Shadow Mode cho crawls mới

1. **Thêm biến môi trường** vào `services/web-crawler-rag-backend/.env`:
   ```bash
   SHADOW_MODE_ENABLED=true
   ```

2. **Sử dụng ShadowModeWriter trong code**:
   ```python
   from app.utils.shadow_mode import get_shadow_mode_writer
   
   # Trong code xử lý crawl
   shadow_writer = get_shadow_mode_writer(db)
   
   # Thay vì tạo CrawledURL trực tiếp:
   crawled_url = shadow_writer.create_crawled_url(
       session_id=session_id,
       url=url,
       content=content,
       # ... các fields khác
       extraction_method="ai_agent",
       complexity_score=0.75,
       metadata_confidence={"document_type": 0.9}
   )
   ```

3. **Chạy crawls bình thường** - dữ liệu sẽ tự động ghi vào cả 2 bảng

## Bước 3: Chạy Validation

```bash
# Chạy validation
python scripts/validate_shadow_results.py --output validation_report.json

# Xem kết quả
cat validation_report.json

# Hoặc trên Windows
type validation_report.json
```

## Bước 4: Đọc Kết Quả Validation

Script sẽ tạo report JSON với các metrics:

```json
{
  "total_documents": 100,
  "exact_matches": 92,
  "accuracy_rate": 0.92,
  "shadow_agent_usage_rate": 0.23,
  "shadow_estimated_cost_per_10k": 1.84,
  "recommendations": [
    "✓ Accuracy target met (≥90%). Ready for rollout.",
    "✓ Agent usage within target (≤30%): 23.00%",
    "✓ Cost target met (<$2 per 10K): $1.84"
  ]
}
```

### Tiêu Chí Thành Công

- ✅ **Accuracy ≥ 90%**: Tỷ lệ exact matches
- ✅ **Agent usage ≤ 30%**: Tỷ lệ sử dụng AI agent
- ✅ **Cost < $2 per 10K pages**: Chi phí ước tính
- ✅ **Structured data match rate ≥ 80%**: Tỷ lệ khớp dữ liệu có cấu trúc

## Bước 5: Quyết Định Rollout

### Nếu validation PASS (đạt tất cả tiêu chí):

1. **Week 2: 25% rollout**
   - Route 25% traffic vào hybrid system
   - Monitor metrics trong production

2. **Week 3: 50% rollout**
   - Tăng lên 50% nếu metrics ổn định

3. **Week 4: 100% rollout**
   - Deploy toàn bộ production

### Nếu validation FAIL:

1. **Disable AI agent**: Set `ai_enabled = False` trong config
2. **Fall back to rule-based**: Hệ thống tự động dùng rule-based only
3. **Investigate**: Review mismatches và low-confidence extractions
4. **Adjust thresholds**: Tune confidence/complexity thresholds
5. **Re-validate**: Chạy shadow mode lại với parameters đã điều chỉnh

## Workflow Hoàn Chỉnh

```bash
# 1. Chạy migration
cd services/web-crawler-rag-backend
alembic upgrade head
cd ../..

# 2. Populate shadow table
python scripts/populate_shadow_data.py --limit 100

# 3. Chạy validation
python scripts/validate_shadow_results.py --output week1_validation.json

# 4. Xem kết quả
cat week1_validation.json

# 5. Nếu PASS, enable shadow mode cho production
echo "SHADOW_MODE_ENABLED=true" >> services/web-crawler-rag-backend/.env

# 6. Chạy production crawls (sẽ ghi vào cả 2 bảng)
# ... workflow crawl bình thường của bạn ...

# 7. Validate lại với dữ liệu production thật
python scripts/validate_shadow_results.py --output week2_validation.json
```

## Troubleshooting

### Không tìm thấy shadow results

```bash
# Kiểm tra shadow table có dữ liệu không
psql $DATABASE_URL -c "SELECT COUNT(*) FROM crawled_urls_shadow WHERE status = 'CRAWLED';"
```

### Validation script báo lỗi database

```bash
# Kiểm tra DATABASE_URL trong .env
cat services/web-crawler-rag-backend/.env | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Accuracy thấp

- Review mismatches: Query documents có shadow != production
- Check confidence scores: Low confidence có thể chỉ ra extractions không chắc chắn
- Adjust thresholds: Tune `rule_confidence_threshold` hoặc `complexity_score_threshold`

### Agent usage cao

- Review complexity detection: Có thể đang flag quá nhiều documents là complex
- Adjust complexity weights: Giảm weight của length hoặc multi-topic indicators
- Increase confidence threshold: Yêu cầu confidence cao hơn trước khi route to AI

## Cleanup

Sau khi rollout thành công, có thể xóa shadow table:

```bash
cd services/web-crawler-rag-backend
alembic downgrade -1  # Rollback về migration 005
```

Hoặc xóa thủ công:
```sql
DROP TABLE IF EXISTS crawled_urls_shadow CASCADE;
```

## Tài Liệu Tham Khảo

- **README tiếng Anh**: `scripts/README_SHADOW_MODE.md`
- **Requirements**: `.kiro/specs/hybrid-metadata-extraction/requirements.md`
- **Design**: `.kiro/specs/hybrid-metadata-extraction/design.md`
- **Tasks**: `.kiro/specs/hybrid-metadata-extraction/tasks.md`
