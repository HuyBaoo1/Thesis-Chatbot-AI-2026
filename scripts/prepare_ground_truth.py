#!/usr/bin/env python3
"""
Ground Truth Dataset Preparation Script

This script selects 500 pages from existing crawled documents (100 per document type)
and marks them with is_ground_truth = TRUE flag for validation purposes.
The selected documents are exported to CSV for manual labeling by reviewers.

Requirements: 15.5

Usage:
    python scripts/prepare_ground_truth.py [--output OUTPUT_FILE] [--dry-run]

Options:
    --output OUTPUT_FILE    Path to output CSV file (default: ground_truth_dataset.csv)
    --dry-run              Preview selection without updating database
    --help                 Show this help message
"""

import argparse
import csv
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "web-crawler-rag-backend"))

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import CrawledURL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Document types to sample from
DOCUMENT_TYPES = [
    "brochure",
    "faq",
    "regulation",
    "tuition_info",
    "admission_criteria"
]

# Number of samples per document type
SAMPLES_PER_TYPE = 100
TOTAL_SAMPLES = 500


def get_document_type_from_metadata(metadata: Dict[str, Any]) -> str:
    """Extract document_type from metadata JSON field.
    
    Args:
        metadata: Metadata dictionary from crawled_urls.metadata column
        
    Returns:
        Document type string or "unknown" if not found
    """
    if not metadata:
        return "unknown"
    
    # Check for document_type in metadata
    doc_type = metadata.get("document_type", "unknown")
    
    # Handle case where document_type might be a list (multi-label)
    if isinstance(doc_type, list) and doc_type:
        return doc_type[0]  # Use first label as primary
    
    return doc_type


def select_ground_truth_documents(
    db: Session,
    samples_per_type: int = SAMPLES_PER_TYPE,
    dry_run: bool = False
) -> List[CrawledURL]:
    """Select documents for ground truth dataset.
    
    Selects documents that:
    - Have status = 'CRAWLED' (successfully crawled)
    - Have non-empty content
    - Are not already marked as ground truth
    - Are distributed across document types (100 per type)
    
    Args:
        db: Database session
        samples_per_type: Number of samples to select per document type
        dry_run: If True, only preview selection without updating database
        
    Returns:
        List of selected CrawledURL objects
    """
    selected_documents = []
    
    logger.info(f"Selecting {samples_per_type} documents per type from {len(DOCUMENT_TYPES)} types")
    logger.info(f"Target total: {samples_per_type * len(DOCUMENT_TYPES)} documents")
    
    for doc_type in DOCUMENT_TYPES:
        logger.info(f"\nProcessing document type: {doc_type}")
        
        # Query for documents of this type
        # Note: metadata is JSONB, so we use ->> operator for text extraction
        query = (
            select(CrawledURL)
            .where(CrawledURL.status == "CRAWLED")
            .where(CrawledURL.content.isnot(None))
            .where(CrawledURL.content != "")
            .where(CrawledURL.is_ground_truth == False)
            .where(CrawledURL.metadata_["document_type"].astext == doc_type)
            .order_by(func.random())  # Random sampling
            .limit(samples_per_type)
        )
        
        documents = db.execute(query).scalars().all()
        
        logger.info(f"  Found {len(documents)} documents for type '{doc_type}'")
        
        if len(documents) < samples_per_type:
            logger.warning(
                f"  WARNING: Only {len(documents)} documents available for type '{doc_type}' "
                f"(target: {samples_per_type})"
            )
        
        selected_documents.extend(documents)
    
    logger.info(f"\nTotal documents selected: {len(selected_documents)}")
    
    return selected_documents


def mark_as_ground_truth(db: Session, document_ids: List[str], dry_run: bool = False) -> int:
    """Mark selected documents as ground truth in database.
    
    Args:
        db: Database session
        document_ids: List of document IDs to mark
        dry_run: If True, skip database update
        
    Returns:
        Number of documents updated
    """
    if dry_run:
        logger.info(f"DRY RUN: Would mark {len(document_ids)} documents as ground truth")
        return 0
    
    logger.info(f"Marking {len(document_ids)} documents as ground truth...")
    
    # Update is_ground_truth flag
    stmt = (
        update(CrawledURL)
        .where(CrawledURL.id.in_(document_ids))
        .values(is_ground_truth=True)
    )
    
    result = db.execute(stmt)
    db.commit()
    
    updated_count = result.rowcount
    logger.info(f"Successfully marked {updated_count} documents as ground truth")
    
    return updated_count


def export_to_csv(documents: List[CrawledURL], output_file: str) -> None:
    """Export selected documents to CSV for manual labeling.
    
    CSV columns:
    - id: Document UUID
    - url: Document URL
    - title: Document title
    - content_preview: First 500 characters of content
    - current_document_type: Current classification from metadata
    - current_program: Current program from metadata
    - current_admission_method: Current admission method from metadata
    - current_academic_year: Current academic year from metadata
    - current_major: Current major from metadata
    - reviewed_document_type: Empty (for manual labeling)
    - reviewed_program: Empty (for manual labeling)
    - reviewed_admission_method: Empty (for manual labeling)
    - reviewed_academic_year: Empty (for manual labeling)
    - reviewed_major: Empty (for manual labeling)
    - notes: Empty (for reviewer notes)
    
    Args:
        documents: List of CrawledURL objects to export
        output_file: Path to output CSV file
    """
    logger.info(f"Exporting {len(documents)} documents to {output_file}...")
    
    fieldnames = [
        "id",
        "url",
        "title",
        "content_preview",
        "current_document_type",
        "current_program",
        "current_admission_method",
        "current_academic_year",
        "current_major",
        "reviewed_document_type",
        "reviewed_program",
        "reviewed_admission_method",
        "reviewed_academic_year",
        "reviewed_major",
        "notes"
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for doc in documents:
            # Extract current metadata
            metadata = doc.metadata_ or {}
            
            # Truncate content for preview
            content_preview = (doc.content or "")[:500]
            if len(doc.content or "") > 500:
                content_preview += "..."
            
            row = {
                "id": str(doc.id),
                "url": doc.url,
                "title": doc.title or "",
                "content_preview": content_preview,
                "current_document_type": metadata.get("document_type", ""),
                "current_program": metadata.get("program", ""),
                "current_admission_method": metadata.get("admission_method", ""),
                "current_academic_year": metadata.get("academic_year", ""),
                "current_major": metadata.get("major", ""),
                "reviewed_document_type": "",
                "reviewed_program": "",
                "reviewed_admission_method": "",
                "reviewed_academic_year": "",
                "reviewed_major": "",
                "notes": ""
            }
            
            writer.writerow(row)
    
    logger.info(f"Successfully exported to {output_file}")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description="Prepare ground truth dataset for hybrid extraction validation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--output",
        default="ground_truth_dataset.csv",
        help="Path to output CSV file (default: ground_truth_dataset.csv)"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview selection without updating database"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 80)
    logger.info("Ground Truth Dataset Preparation")
    logger.info("=" * 80)
    
    if args.dry_run:
        logger.info("DRY RUN MODE: No database changes will be made")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Step 1: Select documents
        logger.info("\nStep 1: Selecting documents...")
        selected_documents = select_ground_truth_documents(
            db,
            samples_per_type=SAMPLES_PER_TYPE,
            dry_run=args.dry_run
        )
        
        if not selected_documents:
            logger.error("No documents selected. Exiting.")
            return 1
        
        # Step 2: Mark as ground truth
        logger.info("\nStep 2: Marking documents as ground truth...")
        document_ids = [doc.id for doc in selected_documents]
        updated_count = mark_as_ground_truth(db, document_ids, dry_run=args.dry_run)
        
        # Step 3: Export to CSV
        logger.info("\nStep 3: Exporting to CSV...")
        export_to_csv(selected_documents, args.output)
        
        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("Summary")
        logger.info("=" * 80)
        logger.info(f"Documents selected: {len(selected_documents)}")
        logger.info(f"Documents marked as ground truth: {updated_count}")
        logger.info(f"CSV exported to: {args.output}")
        
        if args.dry_run:
            logger.info("\nDRY RUN: No changes were made to the database")
        else:
            logger.info("\nGround truth dataset preparation complete!")
        
        logger.info("\nNext steps:")
        logger.info("1. Review the CSV file and manually label the documents")
        logger.info("2. Update the 'reviewed_*' columns with correct labels")
        logger.info("3. Use the labeled dataset for accuracy validation")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error during ground truth preparation: {e}", exc_info=True)
        db.rollback()
        return 1
        
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
