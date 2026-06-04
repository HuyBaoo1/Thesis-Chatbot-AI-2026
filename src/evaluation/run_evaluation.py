"""CLI entrypoint for RAG evaluation with RAGAS v0.4.

Modes:
  --offline   Run RAGAS on a pre-populated dataset (already has answer + retrieved_contexts)
  --api URL   Run pipeline via HTTP API endpoint, then RAGAS
  (default)   Run pipeline directly in-process, then RAGAS (needs all services)
  --dry-run   Run pipeline only, skip RAGAS evaluation
"""
import argparse
import asyncio
import json
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.evaluation.config import DATASET_DIR, RESULTS_DIR, REPORT_DIR


def run_pipeline_for_question(question: str) -> dict:
    """Run the RAG pipeline for a single question and return enriched result."""
    from src.services.chat_pipeline.graph import build_chat_graph
    from src.services.chat_pipeline.types import PipelineState
    from src.db.session import SessionLocal

    db = SessionLocal()
    try:
        state = PipelineState(query=question, top_k=10, rerank_keep=5)
        graph = build_chat_graph(db)
        final_dict = graph.invoke(state.__dict__)
        final = PipelineState(**final_dict)

        retrieved_contexts = [
            item["content"] for item in final.reranked if item.get("content")
        ]

        return {
            "answer": final.answer,
            "retrieved_contexts": retrieved_contexts,
            "confidence": final.confidence,
            "intent_detected": final.intent,
            "retrieval_mode": final.retrieval_mode,
            "answer_mode": final.answer_mode,
            "blocked": final.blocked,
            "num_candidates": len(final.candidates),
            "num_reranked": len(final.reranked),
        }
    except Exception as e:
        return {
            "answer": f"[PIPELINE_ERROR] {e}",
            "retrieved_contexts": [],
            "confidence": 0.0,
            "intent_detected": "error",
            "retrieval_mode": "none",
            "answer_mode": "error",
            "blocked": False,
            "num_candidates": 0,
            "num_reranked": 0,
            "error": str(e),
        }
    finally:
        db.close()


def run_api_for_question(question: str, api_url: str, lead_id: str | None = None) -> dict:
    """Run pipeline via HTTP API and return enriched result."""
    import httpx

    api_base = api_url.rstrip('/')

    # Origin mapping for deployed APIs
    origin_map = {
        "https://a20-app-165-production.up.railway.app": "https://admin.vinunits.cloud",
        "https://a20-app-165-production-2dd4.up.railway.app": "https://admin.vinunits.cloud",
        "http://localhost:8000": "http://localhost:3000",
    }
    origin = origin_map.get(api_base, "https://admin.vinunits.cloud")
    headers = {"Origin": origin}

    # Auto-create lead if not provided
    if not lead_id:
        try:
            with httpx.Client(timeout=30.0) as client:
                lead_resp = client.post(
                    f"{api_base}/api/chat/init-lead",
                    json={"full_name": "Eval User", "email": "eval@test.com", "phone": "0000000000"},
                    headers=headers
                )
                if lead_resp.status_code == 200:
                    lead_id = lead_resp.json().get("lead_id")
        except Exception:
            pass

    endpoint = f"{api_base}/api/chat/query"
    payload = {"query": question}
    if lead_id:
        payload["lead_id"] = lead_id

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
            if resp.status_code != 200:
                return {
                    "answer": f"[API_ERROR] HTTP {resp.status_code}: {resp.text[:100]}",
                    "retrieved_contexts": [], "confidence": 0.0,
                    "intent_detected": "error", "retrieval_mode": "none",
                    "answer_mode": "error", "blocked": False,
                    "num_candidates": 0, "num_reranked": 0,
                    "error": f"HTTP {resp.status_code}",
                }

            data = resp.json()
            sources = data.get("sources", [])
            retrieved_contexts = [s.get("content", "") for s in sources if s.get("content")]

            return {
                "answer": data.get("answer", ""),
                "retrieved_contexts": retrieved_contexts,
                "confidence": data.get("confidence", 0.0),
                "intent_detected": data.get("retrieval_mode", "unknown"),
                "retrieval_mode": data.get("retrieval_mode", "unknown"),
                "answer_mode": "api",
                "blocked": data.get("blocked", False),
                "num_candidates": len(sources),
                "num_reranked": len(sources),
            }
    except Exception as e:
        return {
            "answer": f"[API_ERROR] {e}",
            "retrieved_contexts": [], "confidence": 0.0,
            "intent_detected": "error", "retrieval_mode": "none",
            "answer_mode": "error", "blocked": False,
            "num_candidates": 0, "num_reranked": 0,
            "error": str(e),
        }


def enrich_records(records: list[dict], limit: int | None = None,
                   mode: str = "pipeline", api_url: str | None = None) -> list[dict]:
    """Run pipeline for each question and enrich records with results."""
    enriched = []
    subset = records[:limit] if limit else records

    for i, record in enumerate(subset):
        question = record["question"]
        print(f"  [{i+1}/{len(subset)}] {question[:60]}...")

        if mode == "api" and api_url:
            pipeline_result = run_api_for_question(question, api_url)
            time.sleep(0.5)
        elif mode == "offline":
            if "answer" not in record or "retrieved_contexts" not in record:
                pipeline_result = {
                    "answer": "[MISSING_DATA]", "retrieved_contexts": [],
                    "confidence": 0.0, "intent_detected": record.get("intent", "?"),
                    "retrieval_mode": "none", "answer_mode": "offline",
                    "blocked": False, "num_candidates": 0, "num_reranked": 0,
                }
            else:
                pipeline_result = {
                    "answer": record["answer"],
                    "retrieved_contexts": record["retrieved_contexts"],
                    "confidence": record.get("confidence", 0.0),
                    "intent_detected": record.get("intent", "?"),
                    "retrieval_mode": record.get("retrieval_mode", "offline"),
                    "answer_mode": "offline",
                    "blocked": record.get("blocked", False),
                    "num_candidates": len(record.get("retrieved_contexts", [])),
                    "num_reranked": len(record.get("retrieved_contexts", [])),
                }
        else:
            pipeline_result = run_pipeline_for_question(question)

        enriched_record = {**record, **pipeline_result}
        enriched.append(enriched_record)

        status = "OK" if "error" not in pipeline_result else "ERR"
        print(f"       -> {status} | confidence={pipeline_result['confidence']:.2f} "
              f"| mode={pipeline_result['retrieval_mode']} | "
              f"contexts={len(pipeline_result['retrieved_contexts'])}")

    return enriched


def rating(score: float) -> str:
    if score >= 0.80:
        return "Good"
    elif score >= 0.50:
        return "Needs Improvement"
    return "Poor"


def rating_emoji(score: float) -> str:
    if score >= 0.80:
        return "✅"
    elif score >= 0.50:
        return "⚠️"
    return "❌"


def generate_markdown_report(
    records: list[dict],
    overall_scores: dict[str, float],
    per_record_scores: list[dict],
    dataset_name: str,
) -> str:
    """Generate markdown evaluation report."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        "# RAG Evaluation Report — VinUni Admissions Chatbot",
        "",
        f"**Ngày đánh giá:** {now}",
        f"**Dataset:** {dataset_name} ({len(records)} câu hỏi)",
        f"**Pipeline model:** GPT-4o (synthesis) + Gemini Flash (routing)",
        f"**Evaluator model:** GPT-4o-mini (RAGAS)",
        "",
        "---",
        "",
        "## Overall Scores",
        "",
        "| Metric | Score | Rating |",
        "|--------|-------|--------|",
    ]

    for metric_name, score in overall_scores.items():
        lines.append(f"| {metric_name} | {score:.4f} | {rating_emoji(score)} {rating(score)} |")

    avg_overall = mean(overall_scores.values()) if overall_scores else 0
    lines.append(f"| **Overall Average** | **{avg_overall:.4f}** | {rating_emoji(avg_overall)} {rating(avg_overall)} |")
    lines.append("")

    # Per-question table
    lines.extend([
        "---",
        "",
        "## Per-Question Scores",
        "",
        "| # | Question | Intent | Faith. | Relv. | Ctx Prec | Ctx Rec | Conf |",
        "|---|----------|--------|--------|-------|----------|---------|------|",
    ])

    for i, rec in enumerate(records):
        q = rec["question"][:50] + ("..." if len(rec["question"]) > 50 else "")
        intent = rec.get("intent_detected", rec.get("intent", "?"))
        conf = rec.get("confidence", 0)
        scores = per_record_scores[i] if i < len(per_record_scores) else {}

        faith = scores.get("faithfulness", 0)
        relv = scores.get("answer_relevancy", 0)
        ctx_p = scores.get("context_precision", 0)
        ctx_r = scores.get("context_recall", 0)

        has_error = "error" in rec or rec.get("answer_mode") == "error"
        marker = "🔴 " if has_error else ""

        lines.append(
            f"| {i+1} | {marker}{q} | {intent} | {faith:.2f} | {relv:.2f} | "
            f"{ctx_p:.2f} | {ctx_r:.2f} | {conf:.2f} |"
        )

    lines.append("")

    # Analysis by category
    lines.extend([
        "---",
        "",
        "## Analysis by Category",
        "",
    ])

    categories: dict[str, list[tuple[int, dict]]] = {}
    for i, rec in enumerate(records):
        cat = rec.get("category", "other")
        categories.setdefault(cat, []).append((i, rec))

    lines.append("| Category | Count | Avg Faith. | Avg Relv. | Avg Ctx Prec | Avg Ctx Rec | Avg Conf |")
    lines.append("|----------|-------|------------|-----------|--------------|-------------|----------|")

    for cat, items in sorted(categories.items()):
        scores_list = [per_record_scores[i] for i, _ in items if i < len(per_record_scores)]
        confs = [r.get("confidence", 0) for _, r in items]

        avg_faith = mean([s.get("faithfulness", 0) for s in scores_list]) if scores_list else 0
        avg_relv = mean([s.get("answer_relevancy", 0) for s in scores_list]) if scores_list else 0
        avg_ctxp = mean([s.get("context_precision", 0) for s in scores_list]) if scores_list else 0
        avg_ctxr = mean([s.get("context_recall", 0) for s in scores_list]) if scores_list else 0
        avg_conf = mean(confs) if confs else 0

        lines.append(
            f"| {cat} | {len(items)} | {avg_faith:.2f} | {avg_relv:.2f} | "
            f"{avg_ctxp:.2f} | {avg_ctxr:.2f} | {avg_conf:.2f} |"
        )

    lines.append("")

    # Pipeline details
    lines.extend([
        "---",
        "",
        "## Pipeline Details",
        "",
        "| # | Retrieval Mode | Answer Mode | Candidates | Reranked | Blocked |",
        "|---|---------------|-------------|------------|----------|---------|",
    ])

    for i, rec in enumerate(records):
        lines.append(
            f"| {i+1} | {rec.get('retrieval_mode', '?')} | {rec.get('answer_mode', '?')} "
            f"| {rec.get('num_candidates', 0)} | {rec.get('num_reranked', 0)} "
            f"| {'Yes' if rec.get('blocked') else 'No'} |"
        )

    lines.append("")

    # Key findings
    lines.extend([
        "---",
        "",
        "## Key Findings",
        "",
    ])

    errors = [r for r in records if "error" in r or r.get("answer_mode") == "error"]
    if errors:
        lines.append(f"- **Pipeline errors:** {len(errors)}/{len(records)} questions failed")

    if overall_scores:
        best_metric = max(overall_scores, key=overall_scores.get)
        worst_metric = min(overall_scores, key=overall_scores.get)
        lines.append(f"- **Strongest metric:** {best_metric} ({overall_scores[best_metric]:.4f})")
        lines.append(f"- **Weakest metric:** {worst_metric} ({overall_scores[worst_metric]:.4f})")

    low_faith = [i for i, s in enumerate(per_record_scores) if s.get("faithfulness", 1) < 0.5]
    if low_faith:
        lines.append(f"- **Low faithfulness (< 0.5):** {len(low_faith)} questions — answer may not be grounded in retrieved context")

    no_context = [r for r in records if not r.get("retrieved_contexts")]
    if no_context:
        lines.append(f"- **No retrieval:** {len(no_context)} questions had no retrieved contexts")

    blocked = [r for r in records if r.get("blocked")]
    if blocked:
        lines.append(f"- **Blocked by guardrails:** {len(blocked)} questions")

    lines.extend([
        "",
        "---",
        "",
        "## Recommendations",
        "",
    ])

    recs = []
    if overall_scores.get("faithfulness", 0) < 0.5:
        recs.append("Faithfulness thấp — cải thiện context building, thêm citation enforcement trong prompt synthesis")
    if overall_scores.get("answer_relevancy", 0) < 0.5:
        recs.append("Answer Relevancy thấp — kiểm tra router intent classification và query expansion")
    if overall_scores.get("context_precision", 0) < 0.5:
        recs.append("Context Precision thấp — cải thiện rerank logic, tăng rerank_keep threshold")
    if overall_scores.get("context_recall", 0) < 0.5:
        recs.append("Context Recall thấp — tăng top_k retrieval, cải thiện hybrid fusion weights")
    if errors:
        recs.append(f"Fix {len(errors)} pipeline errors — kiểm tra logs cho details")
    if not recs:
        recs.append("Hệ thống hoạt động tốt! Tiếp tục monitoring và mở rộng dataset.")

    for j, rec_text in enumerate(recs, 1):
        lines.append(f"{j}. {rec_text}")

    lines.extend(["", "---", f"*Report generated at {now}*"])
    return "\n".join(lines)


async def run_eval(dataset_name: str, output_report: str, output_json: str,
                   limit: int | None, dry_run: bool, mode: str = "pipeline",
                   api_url: str | None = None):
    """Main evaluation flow."""
    dataset_path = DATASET_DIR / dataset_name
    report_path = REPORT_DIR / output_report
    results_path = RESULTS_DIR / output_json

    # Load dataset
    print(f"Loading dataset: {dataset_path}")
    from src.evaluation.rag_evaluator import RAGEvaluator
    evaluator = RAGEvaluator(dataset_path)

    try:
        records = evaluator.load_dataset()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    print(f"Loaded {len(records)} records")

    if mode == "offline":
        print("\n--- Running in OFFLINE mode (using pre-populated data) ---")
    elif mode == "api":
        print(f"\n--- Running in API mode (endpoint: {api_url}) ---")
    else:
        print("\n--- Running in PIPELINE mode (in-process) ---")

    enriched = enrich_records(records, limit=limit, mode=mode, api_url=api_url)

    if dry_run:
        print("\n[Dry run] Skipping RAGAS evaluation. Pipeline results:")
        for i, r in enumerate(enriched):
            print(f"  {i+1}. {r['question'][:50]}...")
            print(f"     Answer: {r.get('answer', '')[:80]}...")
            print(f"     Contexts: {len(r.get('retrieved_contexts', []))}, "
                  f"Confidence: {r.get('confidence', 0):.2f}")
        return

    # Save enriched dataset (for debugging / reuse in offline mode)
    enriched_path = RESULTS_DIR / f"enriched_{dataset_name}"
    enriched_path.parent.mkdir(parents=True, exist_ok=True)
    with open(enriched_path, "w", encoding="utf-8") as f:
        for r in enriched:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Enriched dataset saved to: {enriched_path}")

    # Run RAGAS evaluation
    print("\n--- Running RAGAS evaluation ---")
    try:
        result = await evaluator.run_evaluation(enriched)
        print("RAGAS evaluation complete")

        # Extract scores
        overall_scores = {}
        per_record_scores = []

        if hasattr(result, "scores_pandas"):
            df = result.scores_pandas
            metric_cols = [c for c in df.columns if c not in ("user_input", "response", "reference", "retrieved_contexts")]
            for col in metric_cols:
                overall_scores[col] = df[col].mean()
            for _, row in df.iterrows():
                per_record_scores.append({col: row[col] for col in metric_cols})
        elif hasattr(result, "_scores_dict"):
            overall_scores = result._scores_dict
        elif isinstance(result, dict):
            overall_scores = result.get("metrics", result)

        # Fallback
        if not per_record_scores and overall_scores:
            per_record_scores = [overall_scores.copy() for _ in enriched]

    except Exception as e:
        print(f"RAGAS evaluation failed: {e}")
        traceback.print_exc()
        overall_scores = {"faithfulness": 0, "answer_relevancy": 0,
                          "context_precision": 0, "context_recall": 0}
        per_record_scores = [{} for _ in enriched]

    # Save raw results
    evaluator.save_results({"overall": overall_scores, "per_record": per_record_scores}, results_path)
    print(f"Results saved to: {results_path}")

    # Generate markdown report
    report = generate_markdown_report(enriched, overall_scores, per_record_scores, dataset_name)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    print(f"Report saved to: {report_path}")

    # Print summary
    print("\n=== Evaluation Summary ===")
    for metric_name, score in overall_scores.items():
        print(f"  {metric_name}: {score:.4f} ({rating(score)})")


def main():
    parser = argparse.ArgumentParser(description="Run RAG evaluation with RAGAS")
    parser.add_argument(
        "--dataset", type=str, default="admissions_eval_v2.jsonl",
        help="Dataset filename in datasets/ directory",
    )
    parser.add_argument(
        "--output-report", type=str, default="ragas_evaluation_report.md",
        help="Output markdown report filename in docs/",
    )
    parser.add_argument(
        "--output-json", type=str, default=None,
        help="Output JSON filename for raw results",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Only evaluate first N questions",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Run pipeline only, skip RAGAS evaluation",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--api", type=str, metavar="URL",
        help="Run pipeline via HTTP API (e.g. http://localhost:8000)",
    )
    mode_group.add_argument(
        "--offline", action="store_true",
        help="Use pre-populated dataset (skip pipeline, run RAGAS only)",
    )

    args = parser.parse_args()

    output_json = args.output_json or f"ragas_results_{args.dataset.replace('.jsonl', '')}.json"

    if args.api:
        mode = "api"
        api_url = args.api
    elif args.offline:
        mode = "offline"
        api_url = None
    else:
        mode = "pipeline"
        api_url = None

    asyncio.run(run_eval(
        dataset_name=args.dataset,
        output_report=args.output_report,
        output_json=output_json,
        limit=args.limit,
        dry_run=args.dry_run,
        mode=mode,
        api_url=api_url,
    ))


if __name__ == "__main__":
    main()
