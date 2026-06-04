# Shadow Mode Rollout Infrastructure

This directory contains infrastructure for validating the hybrid metadata extraction system using shadow mode deployment.

## Overview

Shadow mode allows testing the new hybrid extraction system in production without impacting existing functionality. Extraction results are written to a separate `crawled_urls_shadow` table for validation before full rollout.

## Components

### 1. Database Migration

**File**: `services/web-crawler-rag-backend/alembic/versions/2026_04_19_1100-006_add_shadow_table.py`

Creates the `crawled_urls_shadow` table with identical schema to `crawled_urls`, including:
- All original columns from the base schema
- All hybrid extraction fields (GPA, deadline, tuition, confidence scores, etc.)
- Matching indexes for performance testing

**Run migration**:
```bash
cd services/web-crawler-rag-backend
alembic upgrade head
```

**Rollback migration**:
```bash
cd services/web-crawler-rag-backend
alembic downgrade -1
```

### 2. Validation Script

**File**: `scripts/validate_shadow_results.py`

Compares shadow results against production baseline to measure:
- **Accuracy**: Exact matches, partial matches, mismatches
- **Agent Usage**: Percentage of documents using AI agent
- **Cost**: Estimated cost per 10K pages
- **Confidence**: Average confidence scores and low-confidence counts
- **Complexity**: Average complexity scores and high-complexity counts
- **Structured Data**: Extraction success rate for GPA, deadlines, tuition
- **Field-Level Accuracy**: Per-field comparison (document_types, GPA, deadline, etc.)

**Usage**:
```bash
# Basic usage (outputs to console)
python scripts/validate_shadow_results.py

# Save report to file
python scripts/validate_shadow_results.py --output validation_report.json

# Limit number of documents to compare
python scripts/validate_shadow_results.py --limit 100

# Specify custom database URL
python scripts/validate_shadow_results.py --db-url "postgresql://user:pass@host:5432/db"
```

**Requirements**:
- Python 3.8+
- psycopg2 (install: `pip install -r scripts/requirements.txt`)
- Database URL in `services/web-crawler-rag-backend/.env` or via `--db-url` flag

**Installation**:
```bash
# From workspace root
pip install -r scripts/requirements.txt
```

## Rollout Strategy

### Week 1: Shadow Mode Validation

1. **Deploy shadow table**: Run migration to create `crawled_urls_shadow`
2. **Enable shadow writes**: Configure extraction pipeline to write to both tables
3. **Collect data**: Run for 1 week to gather sufficient samples
4. **Run validation**: Execute `validate_shadow_results.py` to compare results
5. **Review metrics**: Check accuracy, cost, latency against targets

**Success Criteria**:
- Accuracy ≥ 90% (exact matches)
- Agent usage ≤ 30%
- Cost < $2 per 10K pages
- Structured data match rate ≥ 80%

### Week 2-3: Gradual Rollout

If validation passes:
1. **25% rollout**: Route 25% of traffic to hybrid system (production table)
2. **Monitor metrics**: Track accuracy, latency, cost in production
3. **50% rollout**: Increase to 50% if metrics remain stable
4. **100% rollout**: Full production deployment

### Rollback Plan

If validation fails or production issues occur:
1. **Disable AI agent**: Set `ai_enabled = False` in configuration
2. **Fall back to rule-based**: System automatically uses rule-based extraction only
3. **Investigate issues**: Review mismatches and low-confidence extractions
4. **Adjust thresholds**: Tune confidence/complexity thresholds if needed
5. **Re-validate**: Run shadow mode again with adjusted parameters

## Validation Report Format

The validation script generates a JSON report with the following structure:

```json
{
  "total_documents": 1000,
  "shadow_documents": 1000,
  "production_documents": 950,
  "exact_matches": 920,
  "partial_matches": 25,
  "mismatches": 5,
  "accuracy_rate": 0.92,
  
  "shadow_agent_usage_rate": 0.23,
  "production_agent_usage_rate": 0.0,
  
  "shadow_estimated_cost_per_10k": 1.84,
  "production_estimated_cost_per_10k": 0.0,
  
  "shadow_avg_confidence": 0.85,
  "production_avg_confidence": 0.72,
  
  "shadow_structured_data_count": 450,
  "production_structured_data_count": 120,
  "structured_data_match_rate": 0.88,
  
  "field_accuracy": {
    "document_types": 0.95,
    "gpa_cutoff": 0.89,
    "deadline": 0.91,
    "tuition_amount": 0.87,
    "extraction_method": 1.0,
    "complexity_score": 0.98
  },
  
  "summary": {
    "overall_accuracy": "92.00%",
    "agent_usage_delta": "23.00%",
    "cost_delta": "$1.84 per 10K pages",
    "structured_data_improvement": "330 documents"
  },
  
  "recommendations": [
    "✓ Accuracy target met (≥90%). Ready for rollout.",
    "✓ Agent usage within target (≤30%): 23.00%",
    "✓ Cost target met (<$2 per 10K): $1.84",
    "✓ Structured data extraction reliable: 88.00% match rate"
  ],
  
  "validation_timestamp": "2026-04-19T10:30:00.000000"
}
```

## Monitoring During Rollout

Key metrics to monitor:
1. **Accuracy**: Compare extracted metadata against manual reviews
2. **Latency**: p50 and p95 extraction latency
3. **Cost**: Daily OpenAI API costs
4. **Agent Usage**: Percentage of documents using AI agent
5. **Error Rate**: API failures, timeouts, fallback rate
6. **Confidence Distribution**: Track low-confidence extractions for review

## Cleanup

After successful rollout, the shadow table can be dropped:

```bash
cd services/web-crawler-rag-backend
alembic downgrade -1  # Rolls back to migration 005
```

Or manually:
```sql
DROP TABLE IF EXISTS crawled_urls_shadow CASCADE;
```

## Troubleshooting

### No shadow results found
- Verify shadow table exists: `SELECT COUNT(*) FROM crawled_urls_shadow;`
- Check extraction pipeline is writing to shadow table
- Verify documents have `status = 'completed'`

### Validation script fails with database error
- Check DATABASE_URL in `.env` file
- Verify database connection: `psql $DATABASE_URL`
- Ensure migration has been run: `alembic current`

### Low accuracy rate
- Review mismatches: Query documents where shadow != production
- Check confidence scores: Low confidence may indicate uncertain extractions
- Adjust thresholds: Tune `rule_confidence_threshold` or `complexity_score_threshold`

### High agent usage rate
- Review complexity detection: May be flagging too many documents as complex
- Adjust complexity weights: Reduce weight of length or multi-topic indicators
- Increase confidence threshold: Require higher confidence before routing to AI

## References

- Requirements: `.kiro/specs/hybrid-metadata-extraction/requirements.md`
- Design: `.kiro/specs/hybrid-metadata-extraction/design.md`
- Tasks: `.kiro/specs/hybrid-metadata-extraction/tasks.md`
- Design Clarifications: See "Design Clarifications" section in design.md (item 6)


## Quick Start Guide

### Option 1: Populate with Existing Data (Recommended for Testing)

If you already have crawled data in the `crawled_urls` table, you can quickly populate the shadow table for testing:

```bash
# From workspace root

# Copy 100 most recent crawled URLs to shadow table
python scripts/populate_shadow_data.py --limit 100

# Copy all URLs from a specific session
python scripts/populate_shadow_data.py --session-id "your-session-uuid"

# Copy without applying simulated extraction (if you want to test real extraction)
python scripts/populate_shadow_data.py --limit 100 --skip-extraction
```

**What this script does**:
- Copies existing `crawled_urls` records to `crawled_urls_shadow`
- Applies simulated hybrid extraction data:
  - `extraction_method`: Randomly assigns 'rule_based' (75%) or 'ai_agent' (25%)
  - `complexity_score`: Random scores (30% high complexity ≥0.5, 70% low complexity <0.5)
  - `metadata_confidence`: Random confidence scores per field (0.6-1.0)
  - `gpa_cutoff`: Simulated GPA values for 30% of records (6.0-10.0)
  - `deadline`: Simulated deadlines for 20% of records (next 180 days)
  - `tuition_amount`: Simulated tuition for 25% of records (10-30 million VND)
  - `document_types`: Multi-label classification (10% have multiple types)

**Example output**:
```
Connecting to database...
Copying data to shadow table...
✓ Copied 100 records to crawled_urls_shadow

Applying simulated hybrid extraction...
✓ Updated 100 records with hybrid extraction data

================================================================================
SHADOW DATA POPULATION COMPLETE
================================================================================
Total records in shadow table: 100
Records with hybrid extraction: 100

Next steps:
1. Run validation: python scripts/validate_shadow_results.py --output report.json
2. Review the validation report
3. Decide on rollout based on metrics
================================================================================
```

### Option 2: Enable Shadow Mode for New Crawls

To enable shadow mode for production crawls (writes to both tables automatically):

1. **Set environment variable** in `services/web-crawler-rag-backend/.env`:
   ```bash
   SHADOW_MODE_ENABLED=true
   ```

2. **Use ShadowModeWriter in your code**:
   ```python
   from app.utils.shadow_mode import get_shadow_mode_writer
   
   # In your crawl processing code (e.g., crawl_tasks.py)
   shadow_writer = get_shadow_mode_writer(db)
   
   # Instead of creating CrawledURL directly:
   # crawled_url = CrawledURL(...)
   # db.add(crawled_url)
   
   # Use shadow writer (writes to both tables):
   crawled_url = shadow_writer.create_crawled_url(
       session_id=session_id,
       url=url,
       content=content,
       title=title,
       status="CRAWLED",
       # Hybrid extraction fields
       extraction_method="ai_agent",
       complexity_score=0.75,
       metadata_confidence={"document_type": 0.9, "program": 0.85},
       gpa_cutoff=7.5,
       document_types=["tuition_info", "scholarship"]
   )
   ```

3. **Run your normal crawls** - data will be written to both tables automatically

### Validate Results

After populating the shadow table (either method):

```bash
# From workspace root

# Run validation
python scripts/validate_shadow_results.py --output validation_report.json

# View the report
cat validation_report.json

# Or on Windows
type validation_report.json
```

The validation script will:
- Compare shadow vs production results
- Calculate accuracy, agent usage, cost metrics
- Generate recommendations for rollout
- Output detailed JSON report + console summary

### Complete Workflow Example

```bash
# 1. Run migration (if not done yet)
cd services/web-crawler-rag-backend
alembic upgrade head
cd ../..

# 2. Populate shadow table with test data
python scripts/populate_shadow_data.py --limit 100

# 3. Run validation
python scripts/validate_shadow_results.py --output week1_validation.json

# 4. Review results
cat week1_validation.json

# 5. If validation passes, enable shadow mode for production
echo "SHADOW_MODE_ENABLED=true" >> services/web-crawler-rag-backend/.env

# 6. Run production crawls (will write to both tables)
# ... your normal crawl workflow ...

# 7. Validate again with real production data
python scripts/validate_shadow_results.py --output week2_validation.json
```

## Integration with Existing Code

To integrate shadow mode into your existing crawl pipeline:

### Before (Direct CrawledURL creation):
```python
from app.models import CrawledURL

crawled_url = CrawledURL(
    session_id=session_id,
    url=url,
    content=content,
    # ... other fields
)
db.add(crawled_url)
db.commit()
```

### After (Shadow mode enabled):
```python
from app.utils.shadow_mode import get_shadow_mode_writer

# Get shadow writer (checks SHADOW_MODE_ENABLED env var)
shadow_writer = get_shadow_mode_writer(db)

# Creates in both tables if shadow mode enabled
crawled_url = shadow_writer.create_crawled_url(
    session_id=session_id,
    url=url,
    content=content,
    # ... other fields
    # Add hybrid extraction fields
    extraction_method="ai_agent",
    complexity_score=0.75,
    metadata_confidence={"document_type": 0.9}
)
db.commit()
```

**Benefits**:
- ✅ Zero impact on production if shadow write fails (errors are logged but not raised)
- ✅ Easy to enable/disable via environment variable
- ✅ Same API as direct CrawledURL creation
- ✅ Automatic deduplication (uses ON CONFLICT DO UPDATE)
