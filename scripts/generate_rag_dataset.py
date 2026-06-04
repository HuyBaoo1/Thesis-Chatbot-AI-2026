"""Script to generate ground-truth dataset for RAG evaluation.

Usage:
    python scripts/generate_rag_dataset.py
    python scripts/generate_rag_dataset.py --output src/evaluation/datasets/v1.jsonl
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db.session import SessionLocal
from src.models.faq_analytics import FAQAnalytics
from src.models.knowledge_chunk import KnowledgeChunk


def generate_dataset(output_path: str, min_count: int = 3):
    """Generate ground-truth dataset from FAQAnalytics + KnowledgeChunk.

    - 50% from FAQAnalytics (high-count real queries)
    - 50% from KnowledgeChunk (ensure category coverage)
    """
    db = SessionLocal()
    records = []

    try:
        faq_records = (
            db.query(FAQAnalytics)
            .filter(FAQAnalytics.count >= min_count)
            .filter(FAQAnalytics.is_fallback.is_(False))
            .order_by(FAQAnalytics.count.desc())
            .limit(30)
            .all()
        )

        for faq in faq_records:
            records.append({
                "question": faq.question,
                "ground_truth": "",  # Manual label needed
                "retrieved_contexts": [],
                "answer": "",
                "intent": faq.intent,
                "source": "faq_analytics",
            })

        categories = [
            "ADMISSION_POLICY",
            "SCHOLARSHIP",
            "TUITION_POLICY",
            "MAJOR_INFO",
            "PROGRAM_INFO",
        ]

        per_category = max(5, (50 - len(records)) // len(categories))
        for cat in categories:
            chunks = (
                db.query(KnowledgeChunk)
                .filter(KnowledgeChunk.category.in_(categories))
                .filter(KnowledgeChunk.is_active.is_(True))
                .limit(per_category)
                .all()
            )
            for chunk in chunks:
                if chunk.title:
                    question = f"Thông tin về: {chunk.title}"
                else:
                    question = f"Nội dung: {chunk.content[:100]}..."

                records.append({
                    "question": question,
                    "ground_truth": chunk.content[:500],
                    "retrieved_contexts": [str(chunk.id)],
                    "answer": "",
                    "category": chunk.category.value if chunk.category else "unknown",
                    "source": "knowledge_chunk",
                })

        with open(output_path, "w", encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

        print(f"Generated {len(records)} records -> {output_path}")
        print(f"  - From FAQAnalytics: {sum(1 for r in records if r.get('source') == 'faq_analytics')}")
        print(f"  - From KnowledgeChunk: {sum(1 for r in records if r.get('source') == 'knowledge_chunk')}")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Generate RAG evaluation dataset")
    parser.add_argument(
        "--output",
        type=str,
        default="src/evaluation/datasets/v1.jsonl",
        help="Output JSONL file path",
    )
    parser.add_argument(
        "--min-count",
        type=int,
        default=3,
        help="Minimum FAQ query count to include",
    )

    args = parser.parse_args()
    generate_dataset(args.output, args.min_count)


if __name__ == "__main__":
    main()