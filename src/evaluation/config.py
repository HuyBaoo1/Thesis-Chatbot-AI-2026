"""RAG evaluation configuration."""
from pathlib import Path

DATASET_DIR = Path(__file__).parent / "datasets"
RESULTS_DIR = Path(__file__).parent / "results"
REPORT_DIR = Path(__file__).parent.parent.parent / "docs"

RAGAS_EVALUATOR_MODEL = "gpt-4o-mini"
RAGAS_METRICS = [
    "faithfulness",
    "answer_relevancy",
    "context_precision",
    "context_recall",
]

DEFAULT_CHUNK_SIZE = 1024
DEFAULT_CHUNK_OVERLAP = 128

BM25_K1 = 1.5
BM25_B = 0.75

TOP_K = 10
RERANK_TOP_K = 5