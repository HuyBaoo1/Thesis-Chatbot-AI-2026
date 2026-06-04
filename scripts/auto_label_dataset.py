"""Auto-labeling script for RAG evaluation dataset.

Usage:
    python scripts/auto_label_dataset.py
    python scripts/auto_label_dataset.py --min-count 5 --output src/evaluation/datasets/v1.jsonl

Flow:
    1. Question -> FAQAnalytics real queries (high count)
    2. Retrieved contexts -> run retrieval pipeline
    3. Answer -> run synthesis
    4. Ground truth -> use retrieved chunk content as proxy ground truth
"""
import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db.session import SessionLocal
from src.models.faq_analytics import FAQAnalytics
from src.services.chat_pipeline.types import PipelineState
from src.services.chat_pipeline.retrieval_orchestrator import run_retrieval_orchestrator
from src.services.chat_pipeline.rerank import run_rerank
from src.services.chat_pipeline.context_builder import build_context_block
from src.services.chat_pipeline.prompt_builder import build_grounded_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def auto_label_question(question: str, db, top_k: int = 10) -> dict | None:
    """Run retrieval + synthesis for a single question."""
    state = PipelineState(query=question.strip(), top_k=top_k)

    try:
        run_retrieval_orchestrator(state, db)

        if not state.candidates:
            logger.warning(f"No candidates for: {question[:50]}")
            return None

        run_rerank(state, keep=top_k)

        if not state.reranked:
            logger.warning(f"No reranked for: {question[:50]}")
            return None

        build_context_block(state)
        prompt = build_grounded_prompt(state)

        from src.services.chat_pipeline.synthesis import run_synthesis
        state.grounded_prompt = prompt
        run_synthesis(state)

        retrieved_contexts = [
            {
                "chunk_id": str(item.get("chunk_id", "")),
                "content": item.get("content", "")[:500],
                "score": float(item.get("score", 0)),
            }
            for item in state.reranked
        ]

        ground_truth_chunks = [ctx["content"] for ctx in retrieved_contexts]
        ground_truth = " ".join(ground_truth_chunks[:3])

        return {
            "question": question,
            "ground_truth": ground_truth,
            "retrieved_contexts": [ctx["content"] for ctx in retrieved_contexts],
            "answer": state.answer or "",
            "confidence": state.confidence or 0.0,
            "retrieval_mode": state.retrieval_mode or "unknown",
            "num_candidates": len(state.reranked),
        }

    except Exception as e:
        logger.error(f"Error processing '{question[:50]}...': {e}")
        return None


def generate_dataset(output_path: str, min_count: int = 3, limit: int = 50):
    """Generate auto-labeled dataset from FAQAnalytics."""
    db = SessionLocal()
    records = []
    errors = 0

    try:
        faq_records = (
            db.query(FAQAnalytics)
            .filter(FAQAnalytics.count >= min_count)
            .filter(FAQAnalytics.is_fallback.is_(False))
            .filter(FAQAnalytics.intent.isnot(None))
            .order_by(FAQAnalytics.count.desc())
            .limit(limit)
            .all()
        )

        logger.info(f"Processing {len(faq_records)} FAQ records...")

        for i, faq in enumerate(faq_records, 1):
            question = faq.question.strip()
            if len(question) < 5:
                continue

            logger.info(f"[{i}/{len(faq_records)}] Processing: {question[:60]}...")

            record = auto_label_question(question, db, top_k=5)
            if record:
                record["source"] = "faq_analytics"
                record["intent"] = faq.intent
                record["faq_count"] = faq.count
                records.append(record)
            else:
                errors += 1

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

        logger.info(f"\n=== Done ===")
        logger.info(f"Generated: {len(records)} records -> {output_path}")
        logger.info(f"Errors: {errors}")
        logger.info(f"Success rate: {len(records) / (len(records) + errors) * 100:.1f}%")

        return records

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Auto-label RAG evaluation dataset")
    parser.add_argument(
        "--output",
        type=str,
        default="src/evaluation/datasets/auto_v1.jsonl",
        help="Output JSONL file path",
    )
    parser.add_argument(
        "--min-count",
        type=int,
        default=3,
        help="Minimum FAQ query count to include",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum number of records to process",
    )

    args = parser.parse_args()
    generate_dataset(args.output, args.min_count, args.limit)


if __name__ == "__main__":
    main()