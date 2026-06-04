"""Purge old OpenAI API call logs from the database.

This script deletes OpenAI API call logs older than the configured retention period
(default: 30 days) to comply with data retention policies and manage database size.

The script:
1. Connects to the database
2. Deletes records from openai_api_calls where created_at < NOW() - retention_days
3. Logs purge statistics (records deleted, timestamp)

Usage:
    # Use default retention period (30 days from config):
    python scripts/purge_api_logs.py

    # Use custom retention period:
    python scripts/purge_api_logs.py --retention-days 60

    # Dry run (preview only, no changes):
    python scripts/purge_api_logs.py --dry-run

    # Running locally (not inside Docker) - specify DB URL:
    python scripts/purge_api_logs.py --db-url postgresql+psycopg://app:app_password@localhost:5433/app_db

    # Or use environment variables:
    set DATABASE_URL=postgresql+psycopg://app:app_password@localhost:5433/app_db
    python scripts/purge_api_logs.py

    # Verbose output:
    python scripts/purge_api_logs.py --verbose

Requirements:
    - Requirement 21.4: Delete records from openai_api_calls where created_at < NOW() - 30 days
    - Requirement 21.4: Log purge statistics (records deleted, timestamp)
"""
import os
import sys
import argparse
import logging
from datetime import datetime, timedelta, timezone

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'web-crawler-rag-backend'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def purge_api_logs(retention_days: int = None, dry_run: bool = False, verbose: bool = False, db_url: str = None):
    """Purge old OpenAI API call logs from the database.
    
    Args:
        retention_days: Number of days to retain logs (default: from config, typically 30)
        dry_run: If True, only preview changes without applying them
        verbose: If True, show detailed output
        db_url: Override database URL (for running outside Docker)
    """
    # Override database URL if provided (for running outside Docker)
    if db_url:
        os.environ["DATABASE_URL"] = db_url
        logger.info(f"Using custom DATABASE_URL: {db_url.split('@')[-1]}")  # Hide credentials
    
    from app.database import SessionLocal
    from app.models import OpenAIAPICall
    from app.config import hybrid_settings
    
    # Use retention period from config if not specified
    if retention_days is None:
        retention_days = hybrid_settings.api_call_log_retention_days
    
    logger.info(f"Purging OpenAI API call logs older than {retention_days} days")
    
    db = SessionLocal()
    
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        logger.info(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        
        # Query records to be deleted
        query = db.query(OpenAIAPICall).filter(OpenAIAPICall.created_at < cutoff_date)
        
        # Count records to be deleted
        records_to_delete = query.count()
        
        if records_to_delete == 0:
            logger.info("No records to delete. Database is clean!")
            return
        
        # Show summary
        logger.info(f"\nFound {records_to_delete} records to delete")
        
        if verbose:
            # Show sample of records to be deleted
            sample_records = query.limit(5).all()
            logger.info("\nSample records to be deleted:")
            for record in sample_records:
                logger.info(f"  ID: {record.id}, Document: {record.document_id}, "
                           f"Created: {record.created_at.strftime('%Y-%m-%d %H:%M:%S')}, "
                           f"Model: {record.model}, Success: {record.success}")
            if records_to_delete > 5:
                logger.info(f"  ... and {records_to_delete - 5} more records")
        
        if dry_run:
            logger.info("\n*** DRY RUN - No changes made ***")
            logger.info(f"Run without --dry-run to delete {records_to_delete} records")
            return
        
        # Delete records
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        
        # Log purge statistics
        purge_timestamp = datetime.now(timezone.utc)
        logger.info(f"\n=== Purge Statistics ===")
        logger.info(f"Timestamp: {purge_timestamp.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        logger.info(f"Records deleted: {deleted_count}")
        logger.info(f"Retention period: {retention_days} days")
        logger.info(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        logger.info(f"========================")
        
        logger.info(f"\nPurge complete! Deleted {deleted_count} records.")
        
    except Exception as e:
        logger.error(f"Purge failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Purge old OpenAI API call logs from the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Use default retention period (30 days):
  python scripts/purge_api_logs.py

  # Use custom retention period:
  python scripts/purge_api_logs.py --retention-days 60

  # Dry run (preview only):
  python scripts/purge_api_logs.py --dry-run

  # Running locally (outside Docker):
  python scripts/purge_api_logs.py --db-url postgresql+psycopg://app:app_password@localhost:5433/app_db
        """
    )
    parser.add_argument("--retention-days", type=int, default=None,
                        help="Number of days to retain logs (default: from config, typically 30)")
    parser.add_argument("--dry-run", action="store_true", default=False,
                        help="Preview only, no changes (default: False)")
    parser.add_argument("--db-url", type=str, default=None,
                        help="Database URL (for running outside Docker, e.g. postgresql+psycopg://app:app_password@localhost:5433/app_db)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show detailed output")
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("=" * 60)
        logger.info("RUNNING IN DRY-RUN MODE (no changes will be made)")
        logger.info("Use without --dry-run to apply changes")
        logger.info("=" * 60)
    
    purge_api_logs(
        retention_days=args.retention_days,
        dry_run=args.dry_run,
        verbose=args.verbose,
        db_url=args.db_url
    )


if __name__ == "__main__":
    main()
