"""Pre-warm the answer cache by running top FAQ questions through the pipeline.

Usage:
    python scripts/warmup_faq_cache.py              # top 30 questions
    python scripts/warmup_faq_cache.py --limit 50   # top 50
    python scripts/warmup_faq_cache.py --intent scholarship_lookup  # per intent

Run on deploy or nightly to keep Redis populated with fresh answers for
the most common admission-season questions.
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx

from src.db.session import SessionLocal
from src.models.faq_analytics import FAQAnalytics
from src.models.lead import Lead

API_BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{API_BASE_URL}/api/chat/query"


def get_or_create_lead_id(db) -> str | None:
    lead = db.query(Lead).first()
    return str(lead.id) if lead else None


def warmup(limit: int = 30, intent: str | None = None) -> dict:
    db = SessionLocal()
    try:
        q = (
            db.query(FAQAnalytics)
            .filter(FAQAnalytics.count >= 3)
            .filter(FAQAnalytics.is_fallback.is_(False))
            .order_by(FAQAnalytics.count.desc())
        )
        if intent:
            q = q.filter(FAQAnalytics.intent == intent)
        records = q.limit(limit).all()

        if not records:
            print("No FAQ records found.")
            return {"total": 0, "cached": 0}

        print(f"Warming cache for {len(records)} FAQ questions...")

        lead_id = get_or_create_lead_id(db)
        if not lead_id:
            print("No lead found — creating one via API")
            r = httpx.post(
                f"{API_BASE_URL}/api/chat/init-lead",
                json={
                    "full_name": "Cache Warmup",
                    "email": "cache-warmup@vinuni.edu.vn",
                    "phone": "0000000000",
                },
            )
            if r.status_code == 200:
                lead_id = r.json().get("lead_id")
            else:
                print(f"Failed to create lead: {r.status_code}")
                return {"total": len(records), "cached": 0}

        cached = 0
        errors = 0
        client = httpx.Client(timeout=60.0)
        t0 = time.monotonic()

        for i, rec in enumerate(records):
            query = rec.question.strip()
            if not query:
                continue
            try:
                r = client.post(API_ENDPOINT, json={
                    "lead_id": lead_id,
                    "query": query,
                    "top_k": 10,
                })
                if r.status_code == 200:
                    cached += 1
                else:
                    errors += 1
            except Exception:
                errors += 1

            if (i + 1) % 10 == 0:
                elapsed = time.monotonic() - t0
                print(f"  {i + 1}/{len(records)}  cached={cached}  errors={errors}  elapsed={elapsed:.0f}s")

        elapsed = time.monotonic() - t0
        print(f"\nDone. {cached} cached, {errors} errors in {elapsed:.0f}s")
        client.close()
        return {"total": len(records), "cached": cached, "errors": errors, "elapsed_s": round(elapsed)}
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Warm up the answer cache")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--intent", type=str, default=None,
                        choices=["scholarship_lookup", "tuition_lookup", "admission_requirement",
                                 "timeline_process", "program_info"])
    args = parser.parse_args()
    warmup(limit=args.limit, intent=args.intent)
