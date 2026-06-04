"""Simple RAG evaluation using direct OpenAI API calls."""
import asyncio
import json
import os
from pathlib import Path

# Patch httpx to fix unicode encoding in headers (workaround for RAGAS issue #694)
import httpx
import httpx._models as _models
def _patched_normalize(value, encoding=None):
    if isinstance(value, bytes):
        return value
    return value.encode('utf-8')
_models.normalize_header_value = _patched_normalize

from openai import AsyncOpenAI


class SimpleRAGEvaluator:
    """Simple evaluator that computes RAG metrics using GPT-4o directly."""

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def evaluate_faithfulness(self, question: str, answer: str, contexts: list[str]) -> float:
        """Check if answer is faithful to context (grounded)."""
        if not contexts or not answer:
            return 0.0

        context_text = "\n".join(f"- {c}" for c in contexts)

        prompt = f"""You are evaluating whether an answer is faithful to the given context.

Context:
{context_text}

Answer: {answer}

Task: Rate faithfulness on 0-1 scale where:
- 1.0 = Answer is completely grounded in context, no hallucination
- 0.5 = Answer is partially grounded, some information not in context
- 0.0 = Answer contradicts context or contains significant hallucination

Respond ONLY with a single number between 0.0 and 1.0 (e.g., 0.85).
"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0
        )
        try:
            score = float(response.choices[0].message.content.strip())
            return max(0.0, min(1.0, score))
        except:
            return 0.0

    async def evaluate_answer_relevancy(self, question: str, answer: str) -> float:
        """Check if answer is relevant to question."""
        if not answer:
            return 0.0

        prompt = f"""You are evaluating whether an answer is relevant to the question.

Question: {question}
Answer: {answer}

Task: Rate answer relevancy on 0-1 scale where:
- 1.0 = Answer directly addresses the question
- 0.5 = Answer partially addresses the question
- 0.0 = Answer does not address the question at all

Respond ONLY with a single number between 0.0 and 1.0 (e.g., 0.85).
"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0
        )
        try:
            score = float(response.choices[0].message.content.strip())
            return max(0.0, min(1.0, score))
        except:
            return 0.0

    async def evaluate_context_precision(self, question: str, contexts: list[str], answer: str) -> float:
        """Check if retrieved contexts are relevant to answering the question."""
        if not contexts:
            return 0.0

        context_text = "\n".join(f"- {c}" for c in contexts)

        prompt = f"""You are evaluating whether retrieved contexts are relevant for answering the question.

Question: {question}

Retrieved Contexts:
{context_text}

Task: Rate context precision on 0-1 scale where:
- 1.0 = All contexts are highly relevant to answering the question
- 0.5 = Some contexts are relevant, some are not
- 0.0 = None or very few contexts help answer the question

Respond ONLY with a single number between 0.0 and 1.0 (e.g., 0.85).
"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0
        )
        try:
            score = float(response.choices[0].message.content.strip())
            return max(0.0, min(1.0, score))
        except:
            return 0.0

    async def evaluate_context_recall(self, question: str, reference: str, contexts: list[str]) -> float:
        """Check if contexts contain information needed to answer question."""
        if not contexts:
            return 0.0

        context_text = "\n".join(f"- {c}" for c in contexts)

        prompt = f"""You are evaluating whether retrieved contexts can be used to derive the reference answer.

Question: {question}

Reference Answer (ground truth):
{reference}

Retrieved Contexts:
{context_text}

Task: Rate context recall on 0-1 scale where:
- 1.0 = Contexts contain all information needed to answer the question
- 0.5 = Contexts contain some relevant information but incomplete
- 0.0 = Contexts lack key information needed to answer

Respond ONLY with a single number between 0.0 and 1.0 (e.g., 0.85).
"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0
        )
        try:
            score = float(response.choices[0].message.content.strip())
            return max(0.0, min(1.0, score))
        except:
            return 0.0

    async def evaluate_all(self, records: list[dict]) -> dict:
        """Run all evaluations on records."""
        results = []

        for i, record in enumerate(records):
            print(f"  [{i+1}/{len(records)}] {record['question'][:50]}...")

            question = record["question"]
            answer = record.get("answer", "")
            contexts = record.get("retrieved_contexts", [])
            reference = record.get("reference", "")

            # Skip clarify mode (no answer generated)
            if record.get("retrieval_mode") == "clarify" or "clarify" in str(record.get("answer", "")):
                results.append({
                    "question": question,
                    "faithfulness": 0.0,
                    "answer_relevancy": 0.0,
                    "context_precision": 0.0,
                    "context_recall": 0.0,
                    "mode": "clarify"
                })
                print(f"    -> CLARIFY (no answer)")
                continue

            # Run evaluations
            faith, relev, precis, recall = await asyncio.gather(
                self.evaluate_faithfulness(question, answer, contexts),
                self.evaluate_answer_relevancy(question, answer),
                self.evaluate_context_precision(question, contexts, answer),
                self.evaluate_context_recall(question, reference, contexts),
            )

            results.append({
                "question": question,
                "faithfulness": faith,
                "answer_relevancy": relev,
                "context_precision": precis,
                "context_recall": recall,
                "mode": "evaluated"
            })

            print(f"    F={faith:.2f}, R={relev:.2f}, P={precis:.2f}, Rec={recall:.2f}")

        # Calculate overall scores
        evaluated = [r for r in results if r["mode"] == "evaluated"]
        if evaluated:
            overall = {
                "faithfulness": sum(r["faithfulness"] for r in evaluated) / len(evaluated),
                "answer_relevancy": sum(r["answer_relevancy"] for r in evaluated) / len(evaluated),
                "context_precision": sum(r["context_precision"] for r in evaluated) / len(evaluated),
                "context_recall": sum(r["context_recall"] for r in evaluated) / len(evaluated),
            }
        else:
            overall = {"faithfulness": 0, "answer_relevancy": 0, "context_precision": 0, "context_recall": 0}

        return {"overall": overall, "per_record": results}


def load_records(path: str) -> list[dict]:
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


async def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not set")
        return

    # Load enriched data
    records_path = Path(__file__).parent / "results" / "enriched_admissions_eval_v2.jsonl"
    if not records_path.exists():
        print(f"Error: {records_path} not found")
        return

    records = load_records(str(records_path))
    print(f"Loaded {len(records)} records")

    # Run evaluation
    evaluator = SimpleRAGEvaluator(api_key)
    results = await evaluator.evaluate_all(records)

    # Save results
    output_path = Path(__file__).parent / "results" / "simple_eval_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nOverall Scores:")
    for metric, score in results["overall"].items():
        print(f"  {metric}: {score:.4f}")
    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
