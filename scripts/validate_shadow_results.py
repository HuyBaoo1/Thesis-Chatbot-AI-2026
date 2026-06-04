#!/usr/bin/env python3
"""Validate shadow mode results against production baseline.

This script compares extraction results from the crawled_urls_shadow table
against the production crawled_urls table to measure accuracy, latency, cost,
and other metrics before full rollout.

Usage:
    python scripts/validate_shadow_results.py [--output report.json]
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict

import psycopg2
from psycopg2.extras import RealDictCursor


@dataclass
class ValidationMetrics:
    """Metrics for shadow mode validation."""
    total_documents: int
    shadow_documents: int
    production_documents: int
    
    # Accuracy metrics
    exact_matches: int
    partial_matches: int
    mismatches: int
    accuracy_rate: float
    
    # Extraction method distribution
    shadow_rule_based_count: int
    shadow_ai_agent_count: int
    shadow_fallback_count: int
    shadow_agent_usage_rate: float
    
    production_rule_based_count: int
    production_ai_agent_count: int
    production_fallback_count: int
    production_agent_usage_rate: float
    
    # Confidence metrics
    shadow_avg_confidence: float
    production_avg_confidence: float
    shadow_low_confidence_count: int  # confidence < 0.5
    production_low_confidence_count: int
    
    # Complexity metrics
    shadow_avg_complexity: float
    production_avg_complexity: float
    shadow_high_complexity_count: int  # complexity >= 0.5
    production_high_complexity_count: int
    
    # Structured data extraction
    shadow_structured_data_count: int
    production_structured_data_count: int
    structured_data_match_rate: float
    
    # Cost estimation (based on agent usage)
    shadow_estimated_cost_per_10k: float
    production_estimated_cost_per_10k: float
    
    # Field-level accuracy
    field_accuracy: Dict[str, float]
    
    # Timestamp
    validation_timestamp: str


@dataclass
class FieldComparison:
    """Comparison result for a single field."""
    field_name: str
    shadow_value: Any
    production_value: Any
    match: bool
    shadow_confidence: Optional[float]
    production_confidence: Optional[float]


def get_db_connection(db_url: Optional[str] = None) -> psycopg2.extensions.connection:
    """Get database connection from environment or provided URL."""
    if db_url is None:
        # Try to read from .env file
        try:
            with open('services/web-crawler-rag-backend/.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break
        except FileNotFoundError:
            print("Error: .env file not found. Please provide DATABASE_URL.", file=sys.stderr)
            sys.exit(1)
    
    if not db_url:
        print("Error: DATABASE_URL not found in .env file.", file=sys.stderr)
        sys.exit(1)
    
    # Convert SQLAlchemy format to psycopg2 format
    # SQLAlchemy uses: postgresql+psycopg://...
    # psycopg2 expects: postgresql://...
    if 'postgresql+psycopg://' in db_url:
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    elif 'postgresql+psycopg2://' in db_url:
        db_url = db_url.replace('postgresql+psycopg2://', 'postgresql://')
    
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


def fetch_shadow_results(conn: psycopg2.extensions.connection, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Fetch results from shadow table."""
    query = """
        SELECT 
            id, url, session_id,
            metadata, metadata_confidence, extraction_method, complexity_score,
            document_types, gpa_cutoff, gpa_min, gpa_max, deadline, tuition_amount,
            admission_requirements
        FROM crawled_urls_shadow
        WHERE status = 'CRAWLED'
        ORDER BY crawled_at DESC
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    with conn.cursor() as cur:
        cur.execute(query)
        return cur.fetchall()


def fetch_production_results(conn: psycopg2.extensions.connection, shadow_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch corresponding production results by URL and session_id."""
    if not shadow_ids:
        return {}
    
    query = """
        SELECT 
            s.id as shadow_id, p.id, p.url, p.session_id,
            p.metadata, p.metadata_confidence, p.extraction_method, p.complexity_score,
            p.document_types, p.gpa_cutoff, p.gpa_min, p.gpa_max, p.deadline, p.tuition_amount,
            p.admission_requirements
        FROM crawled_urls_shadow s
        JOIN crawled_urls p ON s.url = p.url AND s.session_id = p.session_id
        WHERE s.id::text = ANY(%s) AND p.status = 'CRAWLED'
    """
    
    with conn.cursor() as cur:
        # Convert UUIDs to strings for comparison
        shadow_ids_str = [str(sid) for sid in shadow_ids]
        cur.execute(query, (shadow_ids_str,))
        results = cur.fetchall()
        return {row['shadow_id']: row for row in results}


def compare_field(shadow_val: Any, prod_val: Any, field_name: str) -> bool:
    """Compare two field values for equality."""
    # Handle None values
    if shadow_val is None and prod_val is None:
        return True
    if shadow_val is None or prod_val is None:
        return False
    
    # Handle JSONB fields (lists, dicts)
    if isinstance(shadow_val, (list, dict)) and isinstance(prod_val, (list, dict)):
        return json.dumps(shadow_val, sort_keys=True) == json.dumps(prod_val, sort_keys=True)
    
    # Handle numeric fields with tolerance
    if field_name in ['gpa_cutoff', 'gpa_min', 'gpa_max', 'complexity_score']:
        try:
            return abs(float(shadow_val) - float(prod_val)) < 0.01
        except (ValueError, TypeError):
            return False
    
    # Handle string comparison (case-insensitive for metadata fields)
    if isinstance(shadow_val, str) and isinstance(prod_val, str):
        return shadow_val.strip().lower() == prod_val.strip().lower()
    
    # Default equality
    return shadow_val == prod_val


def compare_documents(shadow_doc: Dict[str, Any], prod_doc: Dict[str, Any]) -> Tuple[bool, List[FieldComparison]]:
    """Compare shadow and production documents field by field.
    
    Returns:
        (is_exact_match, field_comparisons)
    """
    fields_to_compare = [
        'document_types', 'gpa_cutoff', 'gpa_min', 'gpa_max', 
        'deadline', 'tuition_amount', 'admission_requirements',
        'extraction_method', 'complexity_score'
    ]
    
    comparisons = []
    all_match = True
    
    for field in fields_to_compare:
        shadow_val = shadow_doc.get(field)
        prod_val = prod_doc.get(field)
        match = compare_field(shadow_val, prod_val, field)
        
        if not match:
            all_match = False
        
        # Get confidence scores if available
        shadow_conf = None
        prod_conf = None
        if shadow_doc.get('metadata_confidence'):
            shadow_conf = shadow_doc['metadata_confidence'].get(field)
        if prod_doc.get('metadata_confidence'):
            prod_conf = prod_doc['metadata_confidence'].get(field)
        
        comparisons.append(FieldComparison(
            field_name=field,
            shadow_value=shadow_val,
            production_value=prod_val,
            match=match,
            shadow_confidence=shadow_conf,
            production_confidence=prod_conf
        ))
    
    return all_match, comparisons


def calculate_metrics(
    shadow_results: List[Dict[str, Any]], 
    production_results: Dict[str, Dict[str, Any]]
) -> ValidationMetrics:
    """Calculate validation metrics from shadow and production results."""
    
    total_shadow = len(shadow_results)
    total_production = len(production_results)
    
    exact_matches = 0
    partial_matches = 0
    mismatches = 0
    
    shadow_method_counts = defaultdict(int)
    prod_method_counts = defaultdict(int)
    
    shadow_confidences = []
    prod_confidences = []
    shadow_low_conf = 0
    prod_low_conf = 0
    
    shadow_complexities = []
    prod_complexities = []
    shadow_high_complex = 0
    prod_high_complex = 0
    
    shadow_structured = 0
    prod_structured = 0
    structured_matches = 0
    
    field_matches = defaultdict(int)
    field_totals = defaultdict(int)
    
    for shadow_doc in shadow_results:
        shadow_id = shadow_doc['id']
        prod_doc = production_results.get(shadow_id)
        
        if not prod_doc:
            mismatches += 1
            continue
        
        # Compare documents
        is_exact, field_comparisons = compare_documents(shadow_doc, prod_doc)
        
        if is_exact:
            exact_matches += 1
        else:
            # Check if partial match (at least 50% of fields match)
            matching_fields = sum(1 for fc in field_comparisons if fc.match)
            if matching_fields >= len(field_comparisons) / 2:
                partial_matches += 1
            else:
                mismatches += 1
        
        # Track field-level accuracy
        for fc in field_comparisons:
            field_totals[fc.field_name] += 1
            if fc.match:
                field_matches[fc.field_name] += 1
        
        # Track extraction methods
        shadow_method = shadow_doc.get('extraction_method', 'unknown')
        prod_method = prod_doc.get('extraction_method', 'unknown')
        shadow_method_counts[shadow_method] += 1
        prod_method_counts[prod_method] += 1
        
        # Track confidence scores
        if shadow_doc.get('metadata_confidence'):
            shadow_conf_values = [v for v in shadow_doc['metadata_confidence'].values() if isinstance(v, (int, float))]
            if shadow_conf_values:
                avg_conf = sum(shadow_conf_values) / len(shadow_conf_values)
                shadow_confidences.append(avg_conf)
                if avg_conf < 0.5:
                    shadow_low_conf += 1
        
        if prod_doc.get('metadata_confidence'):
            prod_conf_values = [v for v in prod_doc['metadata_confidence'].values() if isinstance(v, (int, float))]
            if prod_conf_values:
                avg_conf = sum(prod_conf_values) / len(prod_conf_values)
                prod_confidences.append(avg_conf)
                if avg_conf < 0.5:
                    prod_low_conf += 1
        
        # Track complexity scores
        if shadow_doc.get('complexity_score') is not None:
            shadow_complexities.append(float(shadow_doc['complexity_score']))
            if float(shadow_doc['complexity_score']) >= 0.5:
                shadow_high_complex += 1
        
        if prod_doc.get('complexity_score') is not None:
            prod_complexities.append(float(prod_doc['complexity_score']))
            if float(prod_doc['complexity_score']) >= 0.5:
                prod_high_complex += 1
        
        # Track structured data extraction
        shadow_has_structured = any([
            shadow_doc.get('gpa_cutoff'),
            shadow_doc.get('deadline'),
            shadow_doc.get('tuition_amount')
        ])
        prod_has_structured = any([
            prod_doc.get('gpa_cutoff'),
            prod_doc.get('deadline'),
            prod_doc.get('tuition_amount')
        ])
        
        if shadow_has_structured:
            shadow_structured += 1
        if prod_has_structured:
            prod_structured += 1
        if shadow_has_structured and prod_has_structured:
            structured_matches += 1
    
    # Calculate rates
    total_compared = exact_matches + partial_matches + mismatches
    accuracy_rate = exact_matches / total_compared if total_compared > 0 else 0.0
    
    shadow_agent_usage = (shadow_method_counts['ai_agent'] / total_shadow) if total_shadow > 0 else 0.0
    prod_agent_usage = (prod_method_counts['ai_agent'] / total_production) if total_production > 0 else 0.0
    
    structured_match_rate = (structured_matches / max(shadow_structured, prod_structured)) if max(shadow_structured, prod_structured) > 0 else 0.0
    
    # Estimate cost per 10K pages (assuming $0.001 per AI call, $0 for rule-based)
    shadow_cost = (shadow_agent_usage * 0.001 * 10000)
    prod_cost = (prod_agent_usage * 0.001 * 10000)
    
    # Calculate field-level accuracy
    field_accuracy = {
        field: (field_matches[field] / field_totals[field]) if field_totals[field] > 0 else 0.0
        for field in field_totals.keys()
    }
    
    return ValidationMetrics(
        total_documents=total_compared,
        shadow_documents=total_shadow,
        production_documents=total_production,
        exact_matches=exact_matches,
        partial_matches=partial_matches,
        mismatches=mismatches,
        accuracy_rate=accuracy_rate,
        shadow_rule_based_count=shadow_method_counts['rule_based'],
        shadow_ai_agent_count=shadow_method_counts['ai_agent'],
        shadow_fallback_count=shadow_method_counts['fallback'],
        shadow_agent_usage_rate=shadow_agent_usage,
        production_rule_based_count=prod_method_counts['rule_based'],
        production_ai_agent_count=prod_method_counts['ai_agent'],
        production_fallback_count=prod_method_counts['fallback'],
        production_agent_usage_rate=prod_agent_usage,
        shadow_avg_confidence=sum(shadow_confidences) / len(shadow_confidences) if shadow_confidences else 0.0,
        production_avg_confidence=sum(prod_confidences) / len(prod_confidences) if prod_confidences else 0.0,
        shadow_low_confidence_count=shadow_low_conf,
        production_low_confidence_count=prod_low_conf,
        shadow_avg_complexity=sum(shadow_complexities) / len(shadow_complexities) if shadow_complexities else 0.0,
        production_avg_complexity=sum(prod_complexities) / len(prod_complexities) if prod_complexities else 0.0,
        shadow_high_complexity_count=shadow_high_complex,
        production_high_complexity_count=prod_high_complex,
        shadow_structured_data_count=shadow_structured,
        production_structured_data_count=prod_structured,
        structured_data_match_rate=structured_match_rate,
        shadow_estimated_cost_per_10k=shadow_cost,
        production_estimated_cost_per_10k=prod_cost,
        field_accuracy=field_accuracy,
        validation_timestamp=datetime.utcnow().isoformat()
    )


def generate_report(metrics: ValidationMetrics, output_file: Optional[str] = None) -> None:
    """Generate validation report in JSON format."""
    report = asdict(metrics)
    
    # Add summary and recommendations
    report['summary'] = {
        'overall_accuracy': f"{metrics.accuracy_rate * 100:.2f}%",
        'agent_usage_delta': f"{(metrics.shadow_agent_usage_rate - metrics.production_agent_usage_rate) * 100:.2f}%",
        'cost_delta': f"${metrics.shadow_estimated_cost_per_10k - metrics.production_estimated_cost_per_10k:.2f} per 10K pages",
        'structured_data_improvement': f"{metrics.shadow_structured_data_count - metrics.production_structured_data_count} documents"
    }
    
    # Add recommendations based on metrics
    recommendations = []
    
    if metrics.accuracy_rate >= 0.90:
        recommendations.append("✓ Accuracy target met (≥90%). Ready for rollout.")
    else:
        recommendations.append(f"✗ Accuracy below target: {metrics.accuracy_rate * 100:.2f}% < 90%. Review mismatches.")
    
    if metrics.shadow_agent_usage_rate <= 0.30:
        recommendations.append(f"✓ Agent usage within target (≤30%): {metrics.shadow_agent_usage_rate * 100:.2f}%")
    else:
        recommendations.append(f"✗ Agent usage exceeds target: {metrics.shadow_agent_usage_rate * 100:.2f}% > 30%. Adjust thresholds.")
    
    if metrics.shadow_estimated_cost_per_10k <= 2.0:
        recommendations.append(f"✓ Cost target met (<$2 per 10K): ${metrics.shadow_estimated_cost_per_10k:.2f}")
    else:
        recommendations.append(f"✗ Cost exceeds target: ${metrics.shadow_estimated_cost_per_10k:.2f} > $2.00. Reduce agent usage.")
    
    if metrics.structured_data_match_rate >= 0.80:
        recommendations.append(f"✓ Structured data extraction reliable: {metrics.structured_data_match_rate * 100:.2f}% match rate")
    else:
        recommendations.append(f"⚠ Structured data extraction needs review: {metrics.structured_data_match_rate * 100:.2f}% match rate")
    
    report['recommendations'] = recommendations
    
    # Output report
    report_json = json.dumps(report, indent=2, default=str)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(report_json)
        print(f"Validation report written to {output_file}")
    else:
        print(report_json)
    
    # Print summary to console
    print("\n" + "="*80)
    print("SHADOW MODE VALIDATION SUMMARY")
    print("="*80)
    print(f"Total Documents Compared: {metrics.total_documents}")
    print(f"Exact Matches: {metrics.exact_matches} ({metrics.accuracy_rate * 100:.2f}%)")
    print(f"Partial Matches: {metrics.partial_matches}")
    print(f"Mismatches: {metrics.mismatches}")
    print()
    print(f"Shadow Agent Usage: {metrics.shadow_agent_usage_rate * 100:.2f}%")
    print(f"Production Agent Usage: {metrics.production_agent_usage_rate * 100:.2f}%")
    print()
    print(f"Shadow Estimated Cost: ${metrics.shadow_estimated_cost_per_10k:.2f} per 10K pages")
    print(f"Production Estimated Cost: ${metrics.production_estimated_cost_per_10k:.2f} per 10K pages")
    print()
    print("Recommendations:")
    for rec in recommendations:
        print(f"  {rec}")
    print("="*80)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Validate shadow mode results against production baseline'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output file for validation report (JSON format)',
        default=None
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        help='Limit number of documents to compare',
        default=None
    )
    parser.add_argument(
        '--db-url',
        help='Database URL (defaults to DATABASE_URL from .env)',
        default=None
    )
    
    args = parser.parse_args()
    
    print("Connecting to database...")
    conn = get_db_connection(args.db_url)
    
    try:
        print("Fetching shadow results...")
        shadow_results = fetch_shadow_results(conn, args.limit)
        print(f"Found {len(shadow_results)} shadow documents")
        
        if not shadow_results:
            print("No shadow results found. Exiting.")
            return
        
        print("Fetching corresponding production results...")
        shadow_ids = [doc['id'] for doc in shadow_results]
        production_results = fetch_production_results(conn, shadow_ids)
        print(f"Found {len(production_results)} matching production documents")
        
        print("Calculating metrics...")
        metrics = calculate_metrics(shadow_results, production_results)
        
        print("Generating report...")
        generate_report(metrics, args.output)
        
    finally:
        conn.close()


if __name__ == '__main__':
    main()
