#!/usr/bin/env python3
"""Populate shadow table with test data for validation.

This script copies existing crawled_urls data to crawled_urls_shadow table
and applies hybrid extraction to generate test data for shadow mode validation.

Usage:
    python scripts/populate_shadow_data.py [--limit 100] [--session-id UUID]
"""

import argparse
import sys
import os
from datetime import datetime
from uuid import UUID
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'web-crawler-rag-backend'))

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values


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
    if 'postgresql+psycopg://' in db_url:
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')
    elif 'postgresql+psycopg2://' in db_url:
        db_url = db_url.replace('postgresql+psycopg2://', 'postgresql://')
    
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


def copy_to_shadow(
    conn: psycopg2.extensions.connection,
    limit: Optional[int] = None,
    session_id: Optional[UUID] = None
) -> int:
    """Copy crawled_urls data to crawled_urls_shadow table.
    
    Args:
        conn: Database connection
        limit: Maximum number of records to copy
        session_id: Optional session ID to filter by
        
    Returns:
        Number of records copied
    """
    with conn.cursor() as cur:
        # Build query
        query = """
            INSERT INTO crawled_urls_shadow (
                id, session_id, url, content_hash, status, title, content,
                crawled_at, error_message, retry_count, metadata,
                gpa_cutoff, gpa_min, gpa_max, deadline, tuition_amount,
                metadata_confidence, extraction_method, complexity_score,
                document_types, admission_requirements, is_ground_truth, is_manually_reviewed
            )
            SELECT 
                id, session_id, url, content_hash, status, title, content,
                crawled_at, error_message, retry_count, metadata,
                gpa_cutoff, gpa_min, gpa_max, deadline, tuition_amount,
                metadata_confidence, extraction_method, complexity_score,
                document_types, admission_requirements, is_ground_truth, is_manually_reviewed
            FROM crawled_urls
            WHERE status = 'CRAWLED'
        """
        
        params = []
        if session_id:
            query += " AND session_id = %s"
            params.append(str(session_id))
        
        query += " ORDER BY crawled_at DESC"
        
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        
        query += """
            ON CONFLICT (url, session_id) 
            DO UPDATE SET
                content_hash = EXCLUDED.content_hash,
                status = EXCLUDED.status,
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                crawled_at = EXCLUDED.crawled_at,
                error_message = EXCLUDED.error_message,
                retry_count = EXCLUDED.retry_count,
                metadata = EXCLUDED.metadata,
                gpa_cutoff = EXCLUDED.gpa_cutoff,
                gpa_min = EXCLUDED.gpa_min,
                gpa_max = EXCLUDED.gpa_max,
                deadline = EXCLUDED.deadline,
                tuition_amount = EXCLUDED.tuition_amount,
                metadata_confidence = EXCLUDED.metadata_confidence,
                extraction_method = EXCLUDED.extraction_method,
                complexity_score = EXCLUDED.complexity_score,
                document_types = EXCLUDED.document_types,
                admission_requirements = EXCLUDED.admission_requirements,
                is_ground_truth = EXCLUDED.is_ground_truth,
                is_manually_reviewed = EXCLUDED.is_manually_reviewed
        """
        
        cur.execute(query, params)
        count = cur.rowcount
        conn.commit()
        
        return count


def apply_hybrid_extraction_simulation(
    conn: psycopg2.extensions.connection,
    limit: Optional[int] = None
) -> int:
    """Apply simulated hybrid extraction to shadow table records.
    
    This simulates the hybrid extraction system by:
    - Setting extraction_method to 'rule_based' or 'ai_agent' randomly
    - Adding confidence scores
    - Adding complexity scores
    - Extracting some structured data (GPA, deadlines, tuition)
    
    Args:
        conn: Database connection
        limit: Maximum number of records to update
        
    Returns:
        Number of records updated
    """
    with conn.cursor() as cur:
        # Update shadow records with simulated hybrid extraction data
        query = """
            UPDATE crawled_urls_shadow
            SET 
                extraction_method = CASE 
                    WHEN random() < 0.25 THEN 'ai_agent'
                    ELSE 'rule_based'
                END,
                complexity_score = CASE
                    WHEN random() < 0.3 THEN random() * 0.5 + 0.5  -- High complexity (0.5-1.0)
                    ELSE random() * 0.5  -- Low complexity (0.0-0.5)
                END,
                metadata_confidence = jsonb_build_object(
                    'document_type', 0.7 + random() * 0.3,
                    'program', 0.6 + random() * 0.4,
                    'admission_method', 0.6 + random() * 0.4,
                    'academic_year', 0.7 + random() * 0.3,
                    'major', 0.6 + random() * 0.4
                ),
                -- Simulate GPA extraction for some records
                gpa_cutoff = CASE 
                    WHEN random() < 0.3 THEN (6.0 + random() * 4.0)::numeric(3,1)
                    ELSE NULL
                END,
                -- Simulate deadline extraction for some records
                deadline = CASE
                    WHEN random() < 0.2 THEN (NOW() + (random() * 180 || ' days')::interval)::date
                    ELSE NULL
                END,
                -- Simulate tuition extraction for some records
                tuition_amount = CASE
                    WHEN random() < 0.25 THEN jsonb_build_object(
                        'amount', (10000000 + random() * 20000000)::integer,
                        'currency', 'VND'
                    )
                    ELSE NULL
                END,
                -- Simulate document types (multi-label for some)
                document_types = CASE
                    WHEN random() < 0.1 THEN '["tuition_info", "scholarship"]'::jsonb
                    WHEN random() < 0.3 THEN '["admission_criteria"]'::jsonb
                    WHEN random() < 0.5 THEN '["brochure"]'::jsonb
                    ELSE '["faq"]'::jsonb
                END
            WHERE extraction_method IS NULL
        """
        
        if limit:
            query += f" AND id IN (SELECT id FROM crawled_urls_shadow WHERE extraction_method IS NULL LIMIT {limit})"
        
        cur.execute(query)
        count = cur.rowcount
        conn.commit()
        
        return count


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Populate shadow table with test data for validation'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        help='Maximum number of records to copy',
        default=None
    )
    parser.add_argument(
        '--session-id', '-s',
        type=str,
        help='Filter by specific session ID',
        default=None
    )
    parser.add_argument(
        '--db-url',
        help='Database URL (defaults to DATABASE_URL from .env)',
        default=None
    )
    parser.add_argument(
        '--skip-extraction',
        action='store_true',
        help='Skip applying simulated hybrid extraction'
    )
    
    args = parser.parse_args()
    
    # Parse session ID if provided
    session_id = None
    if args.session_id:
        try:
            session_id = UUID(args.session_id)
        except ValueError:
            print(f"Error: Invalid session ID format: {args.session_id}", file=sys.stderr)
            sys.exit(1)
    
    print("Connecting to database...")
    conn = get_db_connection(args.db_url)
    
    try:
        print("Copying data to shadow table...")
        copied_count = copy_to_shadow(conn, args.limit, session_id)
        print(f"✓ Copied {copied_count} records to crawled_urls_shadow")
        
        if not args.skip_extraction:
            print("\nApplying simulated hybrid extraction...")
            updated_count = apply_hybrid_extraction_simulation(conn, args.limit)
            print(f"✓ Updated {updated_count} records with hybrid extraction data")
        
        print("\n" + "="*80)
        print("SHADOW DATA POPULATION COMPLETE")
        print("="*80)
        print(f"Total records in shadow table: {copied_count}")
        if not args.skip_extraction:
            print(f"Records with hybrid extraction: {updated_count}")
        print("\nNext steps:")
        print("1. Run validation: python scripts/validate_shadow_results.py --output report.json")
        print("2. Review the validation report")
        print("3. Decide on rollout based on metrics")
        print("="*80)
        
    finally:
        conn.close()


if __name__ == '__main__':
    main()
