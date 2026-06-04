"""RAG evaluation using DeepEval (alternative to RAGAS)."""
import asyncio
import json
import os
from pathlib import Path

import httpx
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
)
from deepeval.test_case import LLMTestCase


async def run_deepeval_evaluation(records: list[dict], api_url: str) -> dict:
    """Run DeepEval evaluation on enriched records."""
    # Initialize metrics
    faithfulness = FaithfulnessMetric(model="gpt-4o")
    answer_relevancy = AnswerRelevancyMetric(model="gpt-4o")
    contextual_precision = ContextualPrecisionMetric(model="gpt-4o")
    contextual_recall = ContextualRecallMetric(model="gpt-4o")

    test_results = []

    for i, record in enumerate(records):
        print(f"  Evaluating {i+1}/{len(records)}: {record['question'][:50]}...")

        test_case = LLMTestCase(
            input=record["question"],
            actual_output=record.get("answer", ""),
            expected_output=record.get("reference", ""),
            retrieval_context=record.get("retrieved_contexts", []),
        )

        # Run each metric
        await faithfulness.a_measure(test_case)
        await answer_relevancy.a_measure(test_case)
        await contextual_precision.a_measure(test_case)
        await contextual_recall.a_measure(test_case)

        test_results.append({
            "question": record["question"],
            "faithfulness": faithfulness.score,
            "answer_relevancy": answer_relevancy.score,
            "contextual_precision": contextual_precision.score,
            "contextual_recall": contextual_recall.score,
        })

        print(f"    F={faithfulness.score:.2f}, R={answer_relevancy.score:.2f}, "
              f"P={contextual_precision.score:.2f}, Rec={contextual_recall.score:.2f}")

    # Calculate overall scores
    overall = {
        "faithfulness": sum(r["faithfulness"] for r in test_results) / len(test_results),
        "answer_relevancy": sum(r["answer_relevancy"] for r in test_results) / len(test_results),
        "contextual_precision": sum(r["contextual_precision"] for r in test_results) / len(test_results),
        "contextual_recall": sum(r["contextual_recall"] for r in test_results) / len(test_results),
    }

    return {"overall": overall, "per_record": test_results}


def load_enriched_data(path: str) -> list[dict]:
    """Load enriched JSONL data."""
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


async def main():
    # Load enriched data
    enriched_path = Path(__file__).parent / "results" / "enriched_admissions_eval_v2.jsonl"
    if not enriched_path.exists():
        print(f"Error: {enriched_path} not found")
        return

    records = load_enriched_data(enriched_path)
    print(f"Loaded {len(records)} records")

    # Run evaluation
    results = await run_deepeval_evaluation(records, "https://a20-app-165-production.up.railway.app")

    # Save results
    output_path = Path(__file__).parent.parent / "results" / "deepeval_results.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nOverall Scores:")
    for metric, score in results["overall"].items():
        print(f"  {metric}: {score:.4f}")

    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
