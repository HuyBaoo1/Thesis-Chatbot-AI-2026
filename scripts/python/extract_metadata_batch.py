#!/usr/bin/env python3
"""Batch extract admission metadata for existing crawled content.

This script processes all crawled content that doesn't have metadata extracted yet
and applies the hybrid extraction system to populate admission metadata fields.

Usage:
    python scripts/python/extract_metadata_batch.py [--limit N] [--dry-run]
    
Options:
    --limit N       Process only N documents (default: all)
    --dry-run       Show what would be done without making changes
    --force         Re-extract metadata even if already present
"""
import sys
import os
import argparse
import logging
from datetime import datetime
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/web-crawler-rag-backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import CrawledURL
from app.utils.hybrid_extraction import HybridOrchestrator, ExtractionMethod
from app.utils.admission_metadata import AdmissionMetadataExtractor
from app.utils.complexity_detector import ComplexityDetector
from app.utils.pii_detector import PIIDetector
from app.utils.ai_agent import AIAgent
from app.config import HybridExtractionSettings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_orchestrator(ai_enabled: bool = False) -> HybridOrchestrator:
    """Create HybridOrchestrator instance.
    
    Args:
        ai_enabled: Whether to enable AI agent extraction
        
    Returns:
        Configured HybridOrchestrator instance
    """
    config = HybridExtractionSettings(
        ai_enabled=ai_enabled,
        rule_confidence_threshold=0.8,
        complexity_score_threshold=0.5,
        pii_detection_enabled=True
    )
    
    rule_extractor = AdmissionMetadataExtractor()
    complexity_detector = ComplexityDetector()
    pii_detector = PIIDetector()
    
    # Only create AI agent if enabled and API key is available
    ai_agent = None
    if ai_enabled and settings.openai_api_key:
        try:
            ai_agent = AIAgent(api_key=settings.openai_api_key)
            logger.info("AI agent enabled for extraction")
        except Exception as e:
            logger.warning(f"Failed to initialize AI agent: {e}. Using rule-based only.")
    else:
        logger.info("AI agent disabled - using rule-based extraction only")
    
    return HybridOrchestrator(
        config=config,
        rule_extractor=rule_extractor,
        complexity_detector=complexity_detector,
        pii_detector=pii_detector,
        ai_agent=ai_agent
    )


def extract_metadata_for_content(
    content: CrawledURL,
    orchestrator: HybridOrchestrator,
    dry_run: bool = False
) -> bool:
    """Extract metadata for a single content item.
    
    Args:
        content: CrawledURL instance to process
        orchestrator: HybridOrchestrator instance
        dry_run: If True, don't save changes
        
    Returns:
        True if extraction succeeded, False otherwise
    """
    try:
        logger.info(f"Processing content {content.id}: {content.url}")
        
        # Extract metadata using hybrid orchestrator
        result = orchestrator.extract(
            url=content.url,
            title=content.title,
            content=content.content[:5000] if content.content else None  # Limit content size
        )
        
        if dry_run:
            logger.info(f"[DRY RUN] Would extract metadata:")
            logger.info(f"  - Method: {result.extraction_method}")
            logger.info(f"  - Confidence: {result.confidence_scores.get('document_level', 0.0):.2f}")
            logger.info(f"  - Metadata: {result.metadata}")
            return True
        
        # Update content with extracted metadata
        content.extraction_method = result.extraction_method.value
        content.complexity_score = result.complexity_score
        content.metadata_confidence = result.confidence_scores
        
        # Update structured fields
        if "document_type" in result.metadata:
            # Store in metadata JSON for now (can add to document_types field later)
            if not content.metadata_:
                content.metadata_ = {}
            content.metadata_["document_type"] = result.metadata["document_type"]
        
        if "program" in result.metadata:
            if not content.metadata_:
                content.metadata_ = {}
            content.metadata_["program"] = result.metadata["program"]
        
        if "academic_year" in result.metadata:
            if not content.metadata_:
                content.metadata_ = {}
            content.metadata_["academic_year"] = result.metadata["academic_year"]
        
        if "major" in result.metadata:
            if not content.metadata_:
                content.metadata_ = {}
            content.metadata_["major"] = result.metadata["major"]
        
        # Extract structured data if available
        if result.structured_data:
            if result.structured_data.gpa_cutoff:
                content.gpa_cutoff = result.structured_data.gpa_cutoff
            if result.structured_data.gpa_range:
                content.gpa_min = result.structured_data.gpa_range[0]
                content.gpa_max = result.structured_data.gpa_range[1]
            if result.structured_data.deadline:
                content.deadline = result.structured_data.deadline
            if result.structured_data.tuition_amount:
                content.tuition_amount = result.structured_data.tuition_amount
            if result.structured_data.admission_requirements:
                content.admission_requirements = result.structured_data.admission_requirements
            if result.structured_data.document_types:
                content.document_types = result.structured_data.document_types
        
        logger.info(f"✓ Extracted metadata for {content.id} using {result.extraction_method}")
        return True
        
    except Exception as e:
        logger.error(f"✗ Failed to extract metadata for {content.id}: {e}", exc_info=True)
        return False


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Batch extract admission metadata")
    parser.add_argument("--limit", type=int, help="Process only N documents")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--force", action="store_true", help="Re-extract even if metadata exists")
    parser.add_argument("--ai", action="store_true", help="Enable AI agent extraction")
    args = parser.parse_args()
    
    logger.info("=" * 80)
    logger.info("Batch Metadata Extraction")
    logger.info("=" * 80)
    logger.info(f"Dry run: {args.dry_run}")
    logger.info(f"Force re-extraction: {args.force}")
    logger.info(f"AI enabled: {args.ai}")
    logger.info(f"Limit: {args.limit or 'None'}")
    logger.info("")
    
    # Create database session
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Create orchestrator
        orchestrator = create_orchestrator(ai_enabled=args.ai)
        
        # Query content to process
        query = db.query(CrawledURL).filter(CrawledURL.status == "CRAWLED")
        
        if not args.force:
            # Only process content without metadata
            query = query.filter(CrawledURL.extraction_method.is_(None))
        
        if args.limit:
            query = query.limit(args.limit)
        
        content_items = query.all()
        total = len(content_items)
        
        logger.info(f"Found {total} content items to process")
        logger.info("")
        
        if total == 0:
            logger.info("No content to process. Exiting.")
            return
        
        # Process each content item
        success_count = 0
        fail_count = 0
        
        for idx, content in enumerate(content_items, 1):
            logger.info(f"[{idx}/{total}] Processing {content.id}")
            
            if extract_metadata_for_content(content, orchestrator, dry_run=args.dry_run):
                success_count += 1
            else:
                fail_count += 1
            
            # Commit every 10 items to avoid large transactions
            if not args.dry_run and idx % 10 == 0:
                db.commit()
                logger.info(f"Committed batch (processed {idx}/{total})")
        
        # Final commit
        if not args.dry_run:
            db.commit()
            logger.info("Final commit completed")
        
        # Summary
        logger.info("")
        logger.info("=" * 80)
        logger.info("Summary")
        logger.info("=" * 80)
        logger.info(f"Total processed: {total}")
        logger.info(f"Success: {success_count}")
        logger.info(f"Failed: {fail_count}")
        logger.info(f"Success rate: {success_count/total*100:.1f}%")
        
        if args.dry_run:
            logger.info("")
            logger.info("DRY RUN - No changes were made to the database")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
