"""Cleanup script: Find and fix error pages already stored in the database.

This script scans CrawledURL records with status='CRAWLED' that contain
error page content (500 Internal Server Error, 404, page moved, etc.)
and:
1. Deletes their ContentChunk records from DB
2. Deletes their Qdrant vector points
3. Updates CrawledURL status to FAILED
4. Clears the content field

Usage:
    # Dry run (preview only, no changes):
    python scripts/python/cleanup_error_pages.py --dry-run

    # Actually fix the data:
    python scripts/python/cleanup_error_pages.py --no-dry-run

    # Fix specific session only:
    python scripts/python/cleanup_error_pages.py --session-id <uuid>

    # Running locally (not inside Docker) - specify DB and Qdrant URLs:
    python scripts/python/cleanup_error_pages.py --db-url postgresql+psycopg://app:app_password@localhost:5433/app_db --qdrant-url http://localhost:6333

    # Or use environment variables:
    set DATABASE_URL=postgresql+psycopg://app:app_password@localhost:5433/app_db
    python scripts/python/cleanup_error_pages.py --dry-run --verbose

    # Verbose output:
    python scripts/python/cleanup_error_pages.py --dry-run --verbose
"""
import os
import sys
import re
import argparse
import logging
from typing import List, Tuple
from uuid import UUID

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'web-crawler-rag-backend'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Error page detection patterns (same as in crawl_tasks.py)
ERROR_PATTERNS = {
    'server_error': [
        r'500\s*internal\s*server\s*error',
        r'internal server error',
        r'bad gateway',
        r'gateway timeout',
        r'service (temporarily )?unavailable',
        r'service error',
    ],
    'vi_error': [
        r'xin lỗi.*trang.*(di chuyển|không còn tồn tại|không tồn tại)',
        r'trang này đã được di chuyển',
        r'trang này không còn tồn tại',
        r'không tìm thấy trang',
        r'trang không tồn tại',
        r'liên kết.*không hợp lệ',
        r'đường dẫn.*không tồn tại',
        r'lỗi.*trang',
    ],
    'en_error': [
        r'page not found',
        r'this page (has been moved|no longer exists|can\'t be found)',
        r'the page you (are looking for|requested) (could not be found|does not exist|has been moved)',
        r'sorry.*page.*(moved|not found|no longer exists|doesn\'t exist)',
        r'404\s*(error|page not found|not found)?',
        r'page has (been moved|expired)',
        r'page (is|was) (unavailable|removed|deleted)',
        r'content (not available|no longer available)',
    ],
    'short_error': [
        r'404', r'not found', r'page not found',
        r'không tồn tại', r'không tìm thấy',
        r'internal server error', r'500',
        r'đã bị lỗi', r'lỗi server',
    ],
}


def is_error_content(content: str, title: str = "", metadata: dict = None) -> Tuple[bool, str]:
    """Check if content is an error page.
    
    Returns (is_error, reason).
    """
    if not content:
        return False, ""
    
    content_lower = content.lower().strip()
    metadata = metadata or {}
    
    # Check HTTP status from metadata
    http_status = metadata.get("statusCode") or metadata.get("statuscode")
    if http_status is not None:
        try:
            status_code = int(http_status)
            if status_code >= 400:
                return True, f"HTTP {status_code}"
        except (ValueError, TypeError):
            pass
    
    # Very short content with error keywords
    if len(content_lower) < 100:
        for pattern in ERROR_PATTERNS['short_error']:
            if re.search(pattern, content_lower):
                return True, f"Short error page ({len(content_lower)} chars): matches '{pattern}'"
    
    # Vietnamese patterns
    for pattern in ERROR_PATTERNS['vi_error']:
        if re.search(pattern, content_lower):
            return True, f"Vietnamese error page: matches '{pattern}'"
    
    # English patterns
    for pattern in ERROR_PATTERNS['en_error']:
        if re.search(pattern, content_lower):
            return True, f"English error page: matches '{pattern}'"
    
    # Server error patterns
    for pattern in ERROR_PATTERNS['server_error']:
        if re.search(pattern, content_lower):
            return True, f"Server error page: matches '{pattern}'"
    
    # Title check with short content
    title_lower = (title or "").lower()
    if title_lower:
        title_error_patterns = [r'404', r'page not found', r'not found', r'error', r'lỗi',
                                r'không tồn tại', r'không tìm thấy', r'trang.*di chuyển']
        for pattern in title_error_patterns:
            if re.search(pattern, title_lower) and len(content_lower) < 500:
                return True, f"Error title '{title}': matches '{pattern}' with short content ({len(content_lower)} chars)"
    
    return False, ""


def cleanup_error_pages(dry_run: bool = True, session_id: str = None, verbose: bool = False,
                        db_url: str = None, qdrant_url: str = None):
    """Find and fix error pages in the database.
    
    Args:
        dry_run: If True, only preview changes without applying them
        session_id: If provided, only process URLs from this session
        verbose: If True, show detailed output
        db_url: Override database URL (for running outside Docker)
        qdrant_url: Override Qdrant URL (for running outside Docker)
    """
    # Override database URL if provided (for running outside Docker)
    if db_url:
        os.environ["DATABASE_URL"] = db_url
        logger.info(f"Using custom DATABASE_URL: {db_url.split('@')[-1]}")  # Hide credentials
    
    if qdrant_url:
        os.environ["QDRANT_URL"] = qdrant_url
        logger.info(f"Using custom QDRANT_URL: {qdrant_url}")
    
    from app.database import SessionLocal
    from app.models import CrawledURL, ContentChunk
    from app.schemas import URLStatus
    
    db = SessionLocal()
    
    try:
        # Build query for CRAWLED URLs
        query = db.query(CrawledURL).filter(CrawledURL.status == URLStatus.CRAWLED)
        
        if session_id:
            try:
                session_uuid = UUID(session_id)
                query = query.filter(CrawledURL.session_id == session_uuid)
            except ValueError:
                logger.error(f"Invalid session ID: {session_id}")
                return
        
        crawled_urls = query.all()
        logger.info(f"Found {len(crawled_urls)} CRAWLED URLs to scan")
        
        error_urls = []
        
        for url_record in crawled_urls:
            is_err, reason = is_error_content(
                url_record.content or "",
                url_record.title or "",
                url_record.metadata_ or {}
            )
            
            if is_err:
                error_urls.append((url_record, reason))
                if verbose:
                    logger.info(f"  ERROR PAGE: {url_record.url}")
                    logger.info(f"    Reason: {reason}")
                    logger.info(f"    Content preview: {(url_record.content or '')[:200]}")
                    logger.info(f"    Title: {url_record.title}")
        
        logger.info(f"\nFound {len(error_urls)} error pages out of {len(crawled_urls)} CRAWLED URLs")
        
        if not error_urls:
            logger.info("No error pages found. Database is clean!")
            return
        
        # Show summary
        logger.info("\n--- Error pages found ---")
        for url_record, reason in error_urls:
            chunk_count = db.query(ContentChunk).filter(
                ContentChunk.crawled_url_id == url_record.id
            ).count()
            has_qdrant = db.query(ContentChunk).filter(
                ContentChunk.crawled_url_id == url_record.id,
                ContentChunk.qdrant_point_id.isnot(None)
            ).count()
            logger.info(f"  URL: {url_record.url}")
            logger.info(f"    Reason: {reason}")
            logger.info(f"    Chunks in DB: {chunk_count}, With Qdrant points: {has_qdrant}")
        
        if dry_run:
            logger.info("\n*** DRY RUN - No changes made ***")
            logger.info("Run without --dry-run to apply fixes:")
            logger.info(f"  - Update {len(error_urls)} CrawledURL records: CRAWLED -> FAILED")
            logger.info(f"  - Delete ContentChunk records for these URLs")
            logger.info(f"  - Delete Qdrant vector points for these URLs")
            logger.info(f"  - Clear content field to prevent future issues")
            return
        
        # Apply fixes
        total_chunks_deleted = 0
        total_qdrant_deleted = 0
        total_urls_fixed = 0
        
        # Collect Qdrant point IDs to delete
        qdrant_point_ids_to_delete = []
        
        for url_record, reason in error_urls:
            # Get chunks with Qdrant points
            chunks_with_qdrant = db.query(ContentChunk).filter(
                ContentChunk.crawled_url_id == url_record.id,
                ContentChunk.qdrant_point_id.isnot(None)
            ).all()
            
            for chunk in chunks_with_qdrant:
                qdrant_point_ids_to_delete.append(chunk.qdrant_point_id)
                total_qdrant_deleted += 1
            
            # Delete all chunks for this URL
            chunk_count = db.query(ContentChunk).filter(
                ContentChunk.crawled_url_id == url_record.id
            ).delete()
            total_chunks_deleted += chunk_count
            
            # Update URL status
            url_record.status = URLStatus.FAILED
            url_record.error_message = f"Error page (cleanup): {reason}"
            url_record.content = None  # Clear error content
            total_urls_fixed += 1
            
            if verbose:
                logger.info(f"  Fixed: {url_record.url} -> FAILED (deleted {chunk_count} chunks)")
        
        # Commit DB changes
        db.commit()
        logger.info(f"\nDatabase changes committed:")
        logger.info(f"  - URLs fixed: {total_urls_fixed}")
        logger.info(f"  - Chunks deleted from DB: {total_chunks_deleted}")
        
        # Delete Qdrant points
        if qdrant_point_ids_to_delete:
            try:
                _delete_qdrant_points(qdrant_point_ids_to_delete, verbose)
            except Exception as e:
                logger.error(f"Failed to delete Qdrant points: {e}")
                logger.info("DB changes were committed. You may need to manually clean Qdrant.")
        else:
            logger.info("No Qdrant points to delete.")
        
        logger.info(f"\nCleanup complete!")
        logger.info(f"  Total URLs fixed: {total_urls_fixed}")
        logger.info(f"  Total chunks deleted: {total_chunks_deleted}")
        logger.info(f"  Total Qdrant points deleted: {total_qdrant_deleted}")
        
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def _delete_qdrant_points(point_ids: List[str], verbose: bool = False):
    """Delete points from Qdrant vector store.
    
    Args:
        point_ids: List of Qdrant point IDs to delete
        verbose: If True, show detailed output
    """
    try:
        from qdrant_client import QdrantClient
        from app.config import settings
        
        client = QdrantClient(url=settings.qdrant_url, timeout=30.0)
        collection_name = settings.qdrant_collection_name
        
        # Check collection exists
        try:
            client.get_collection(collection_name)
        except Exception:
            logger.warning(f"Qdrant collection '{collection_name}' not found, skipping Qdrant cleanup")
            return
        
        # Delete in batches of 100
        batch_size = 100
        total_deleted = 0
        
        for i in range(0, len(point_ids), batch_size):
            batch = point_ids[i:i + batch_size]
            try:
                from qdrant_client.models import PointIdsList
                client.delete(
                    collection_name=collection_name,
                    points_selector=PointIdsList(points=batch)
                )
                total_deleted += len(batch)
                if verbose:
                    logger.info(f"  Deleted Qdrant batch {i//batch_size + 1}: {len(batch)} points")
            except Exception as e:
                logger.error(f"  Failed to delete Qdrant batch: {e}")
        
        logger.info(f"Deleted {total_deleted}/{len(point_ids)} Qdrant points from collection '{collection_name}'")
        
    except ImportError:
        logger.warning("qdrant_client not installed, skipping Qdrant cleanup")
    except Exception as e:
        logger.error(f"Qdrant cleanup error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Cleanup error pages from the database")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Preview only, no changes (default: True)")
    parser.add_argument("--no-dry-run", dest="dry_run", action="store_false",
                        help="Actually apply changes")
    parser.add_argument("--session-id", type=str, default=None,
                        help="Only process URLs from this session ID")
    parser.add_argument("--db-url", type=str, default=None,
                        help="Database URL (for running outside Docker, e.g. postgresql+psycopg://app:app_password@localhost:5433/app_db)")
    parser.add_argument("--qdrant-url", type=str, default=None,
                        help="Qdrant URL (for running outside Docker, e.g. http://localhost:6333)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show detailed output")
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("=" * 60)
        logger.info("RUNNING IN DRY-RUN MODE (no changes will be made)")
        logger.info("Use --no-dry-run to apply changes")
        logger.info("=" * 60)
    
    cleanup_error_pages(
        dry_run=args.dry_run,
        session_id=args.session_id,
        verbose=args.verbose,
        db_url=args.db_url,
        qdrant_url=args.qdrant_url
    )


if __name__ == "__main__":
    main()
