#!/usr/bin/env python3
"""
Cleanup script for OCR temp files.

Removes temp files older than MAX_AGE_DAYS from the OCR temp directory.
Can be run manually or via cron.

Usage:
    python scripts/cleanup_ocr_temp.py [--dry-run] [--max-age-days N]

Examples:
    # Dry run - show what would be deleted
    python scripts/cleanup_ocr_temp.py --dry-run

    # Delete files older than 7 days
    python scripts/cleanup_ocr_temp.py --max-age-days 7

    # Production: delete files older than 3 days
    python scripts/cleanup_ocr_temp.py --max-age-days 3
"""

import argparse
import os
import sys
import time
from pathlib import Path


def get_cleanup_paths() -> list[Path]:
    """Get paths to clean up based on config."""
    temp_dir = os.environ.get("OCR_TEMP_DIR", "/app/.tmp/admissions-ocr")
    return [
        Path(temp_dir) / "source",
        Path(temp_dir) / "output",
    ]


def cleanup_directory(directory: Path, max_age_days: int, dry_run: bool = True) -> tuple[int, int]:
    """
    Clean up files older than max_age_days in directory.

    Returns: (files_count, bytes_freed)
    """
    if not directory.exists():
        print(f"  Directory does not exist: {directory}")
        return 0, 0

    now = time.time()
    max_age_seconds = max_age_days * 24 * 60 * 60
    files_removed = 0
    bytes_freed = 0

    for file_path in directory.iterdir():
        if not file_path.is_file():
            continue

        file_age = now - file_path.stat().st_mtime

        if file_age > max_age_seconds:
            file_size = file_path.stat().st_size
            if dry_run:
                print(f"  Would delete: {file_path.name} ({file_size} bytes, {file_age / 86400:.1f} days old)")
            else:
                file_path.unlink()
                print(f"  Deleted: {file_path.name} ({file_size} bytes)")
            files_removed += 1
            bytes_freed += file_size

    return files_removed, bytes_freed


def main():
    parser = argparse.ArgumentParser(description="Cleanup old OCR temp files")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=7,
        help="Delete files older than this many days (default: 7)",
    )
    args = parser.parse_args()

    print(f"{'[DRY RUN] ' if args.dry_run else ''}OCR Temp Cleanup")
    print(f"{'='*50}")
    print(f"Max age: {args.max_age_days} days")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print()

    total_files = 0
    total_bytes = 0

    for directory in get_cleanup_paths():
        print(f"Cleaning: {directory}")
        files, bytes_freed = cleanup_directory(directory, args.max_age_days, args.dry_run)
        total_files += files
        total_bytes += bytes_freed
        if files == 0:
            print(f"  No files to clean")
        print()

    print(f"{'='*50}")
    print(f"Total: {total_files} files, {total_bytes / (1024*1024):.2f} MB")

    if args.dry_run:
        print()
        print("Run without --dry-run to actually delete files")

    return 0


if __name__ == "__main__":
    sys.exit(main())
