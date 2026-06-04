"""Test RAG improvements via HTTP API.

Usage:
    python scripts/test_via_api.py
    python scripts/test_via_api.py --limit 10
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


API_BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{API_BASE_URL}/api/chat/query"


def load_dataset(path: str) -> list[dict]:
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def get_or_create_lead_id() -> str:
    """Get a valid lead_id for testing."""
    from src.models.lead import Lead
    db = SessionLocal()
    try:
        lead = db.query(Lead).first()
        if lead:
            return str(lead.id)
        return None
    finally:
        db.close()


# Reuse client across requests to avoid socket exhaustion
_http_client = None


def get_http_client():
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=30.0)
    return _http_client


def call_chat_api(question: str, lead_id: str = None) -> dict | None:
    if not lead_id:
        lead_id = get_or_create_lead_id()
        if not lead_id:
            print("  Error: No valid lead_id found")
            return None

    payload = {
        "query": question,
        "lead_id": lead_id,
    }

    try:
        client = get_http_client()
        response = client.post(API_ENDPOINT, json=payload)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  Error: {response.status_code} - {response.text[:100]}")
            return None
    except Exception as e:
        print(f"  Exception: {e}")
        return None


def run_api_evaluation(limit: int = 10) -> list[dict]:
    """Run evaluation via HTTP API."""
    db = SessionLocal()
    results = []

    try:
        faq_records = (
            db.query(FAQAnalytics)
            .filter(FAQAnalytics.count >= 3)
            .filter(FAQAnalytics.is_fallback.is_(False))
            .filter(FAQAnalytics.intent.isnot(None))
            .order_by(FAQAnalytics.count.desc())
            .limit(limit)
            .all()
        )

        print(f"Testing {len(faq_records)} questions via API...")

        for i, faq in enumerate(faq_records, 1):
            question = faq.question.strip()
            if len(question) < 5:
                continue

            print(f"[{i}/{len(faq_records)}] {question[:60]}...")

            result = call_chat_api(question)
            if result:
                results.append({
                    "question": question,
                    "intent": faq.intent,
                    "faq_count": faq.count,
                    "answer": result.get("answer", ""),
                    "confidence": result.get("confidence", 0.0),
                    "retrieval_mode": result.get("retrieval_mode", "unknown"),
                    "blocked": result.get("blocked", False),
                })
                print(f"  -> confidence={result.get('confidence', 0):.2f}, blocked={result.get('blocked', False)}")
            else:
                print(f"  -> FAILED")

            time.sleep(0.5)

        return results

    finally:
        db.close()


def save_results(results: list[dict], output_path: str):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for record in results:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"\nResults saved to: {output_path}")


def print_summary(results: list[dict]):
    if not results:
        print("No results to summarize")
        return

    total = len(results)
    blocked = sum(1 for r in results if r.get("blocked"))
    avg_confidence = sum(r.get("confidence", 0) for r in results) / total

    confidence_buckets = {
        "high (>=0.7)": 0,
        "medium (0.4-0.7)": 0,
        "low (<0.4)": 0,
    }

    for r in results:
        conf = r.get("confidence", 0)
        if conf >= 0.7:
            confidence_buckets["high (>=0.7)"] += 1
        elif conf >= 0.4:
            confidence_buckets["medium (0.4-0.7)"] += 1
        else:
            confidence_buckets["low (<0.4)"] += 1

    print(f"\n=== API Evaluation Summary ===")
    print(f"Total questions: {total}")
    print(f"Blocked: {blocked} ({blocked/total*100:.1f}%)")
    print(f"Average confidence: {avg_confidence:.3f}")
    print(f"\nConfidence distribution:")
    for bucket, count in confidence_buckets.items():
        print(f"  {bucket}: {count} ({count/total*100:.1f}%)")

    retrieval_modes = {}
    for r in results:
        mode = r.get("retrieval_mode", "unknown")
        retrieval_modes[mode] = retrieval_modes.get(mode, 0) + 1

    print(f"\nRetrieval modes:")
    for mode, count in sorted(retrieval_modes.items(), key=lambda x: -x[1]):
        print(f"  {mode}: {count}")


def main():
    parser = argparse.ArgumentParser(description="Test RAG via HTTP API")
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Number of questions to test",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="src/evaluation/datasets/api_test_results.jsonl",
        help="Output file path",
    )

    args = parser.parse_args()

    results = run_api_evaluation(limit=args.limit)

    if results:
        save_results(results, args.output)
        print_summary(results)
    else:
        print("No results collected. Check if API is running at http://localhost:8000")


def close_http_client():
    global _http_client
    if _http_client is not None:
        _http_client.close()
        _http_client = None


if __name__ == "__main__":
    main()
    close_http_client()