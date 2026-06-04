"""RAG evaluator using RAGAS v0.4 metrics."""
import json
import os
from pathlib import Path
from typing import Any

from ragas import SingleTurnSample, EvaluationDataset, evaluate
from ragas.metrics import (
    Faithfulness,
    AnswerRelevancy,
    ContextPrecision,
    ContextRecall,
)
from ragas.llms import llm_factory
from ragas.embeddings import OpenAIEmbeddings
from openai import AsyncOpenAI

from src.evaluation.config import RAGAS_EVALUATOR_MODEL


class RAGEvaluator:
    def __init__(self, dataset_path: str | Path):
        self.dataset_path = Path(dataset_path)
        self.results: list[dict[str, Any]] = []
        self._api_key: str | None = None

    def load_dataset(self) -> list[dict[str, Any]]:
        """Load dataset from JSONL file."""
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found: {self.dataset_path}")

        records = []
        with open(self.dataset_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records

    def _get_api_key(self) -> str:
        """Get OpenAI API key from environment."""
        if self._api_key:
            return self._api_key
        self._api_key = os.environ.get("OPENAI_API_KEY")
        if not self._api_key:
            raise ValueError("OPENAI_API_KEY not set in environment")
        return self._api_key

    async def run_evaluation(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        """Run RAGAS evaluation on enriched dataset (with answer + retrieved_contexts)."""
        api_key = self._get_api_key()
        llm = self._init_llm(api_key)
        embeddings = self._init_embeddings(api_key)
        metrics = self._get_metrics(llm, embeddings)
        dataset = self._build_ragas_dataset(records)

        result = evaluate(dataset=dataset, metrics=metrics)
        return result

    def _init_llm(self, api_key: str):
        """Initialize RAGAS evaluator LLM."""
        client = AsyncOpenAI(api_key=api_key)
        return llm_factory(RAGAS_EVALUATOR_MODEL, client=client)

    def _init_embeddings(self, api_key: str):
        """Initialize RAGAS embeddings."""
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        return OpenAIEmbeddings(client=client)

    def _get_metrics(self, llm, embeddings):
        """Get RAGAS v0.4 metric instances."""
        return [
            Faithfulness(llm=llm),
            AnswerRelevancy(llm=llm, embeddings=embeddings),
            ContextPrecision(llm=llm),
            ContextRecall(llm=llm),
        ]

    def _build_ragas_dataset(self, records: list[dict[str, Any]]) -> EvaluationDataset:
        """Convert enriched records to RAGAS EvaluationDataset."""
        samples = []
        for r in records:
            samples.append(SingleTurnSample(
                user_input=r["question"],
                response=r.get("answer", ""),
                retrieved_contexts=r.get("retrieved_contexts", []),
                reference=r.get("reference", ""),
            ))
        return EvaluationDataset(samples=samples)

    def save_results(self, results: dict[str, Any], output_path: Path):
        """Save evaluation results to JSON."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        serializable = {}
        if hasattr(results, "scores"):
            serializable = {"raw_scores": results.scores}
        elif isinstance(results, dict):
            serializable = results
        else:
            serializable = {"result": str(results)}

        with open(output_path, "w") as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)
