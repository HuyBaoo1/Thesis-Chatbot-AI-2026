#!/usr/bin/env python3
"""
Re-embed all knowledge chunks from PostgreSQL into local Qdrant.
Usage: python scripts/reembed_chunks.py [--limit N]
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.services.knowledge_chunk_service import rebuild_missing_embeddings


def main():
    parser = argparse.ArgumentParser(description="Re-embed all chunks into Qdrant")
    parser.add_argument("--limit", type=int, default=500, help="Max chunks to process per batch")
    parser.add_argument("--reset", action="store_true", help="Reset needs_embedding flag for all chunks first")
    args = parser.parse_args()

    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    if args.reset:
        print("[reembed] Resetting needs_embedding flag for all active chunks...")
        from src.models.knowledge_chunk import KnowledgeChunk
        db.query(KnowledgeChunk).filter(
            KnowledgeChunk.is_active.is_(True)
        ).update({KnowledgeChunk.needs_embedding: True})
        db.commit()
        print("[reembed] Reset complete.")

    print(f"[reembed] Starting re-embedding (limit={args.limit})...")

    total_embedded = 0
    total_failed = 0

    while True:
        result = rebuild_missing_embeddings(db, limit=args.limit)
        embedded = result["embedded"]
        failed = result["failed"]
        processed = result["processed"]

        total_embedded += embedded
        total_failed += failed

        print(f"[reembed] Batch: processed={processed}, embedded={embedded}, failed={failed}")
        print(f"[reembed] Running total: embedded={total_embedded}, failed={total_failed}")

        if processed == 0 or embedded == 0:
            break

    print(f"\n[reembed] Done! Total: embedded={total_embedded}, failed={total_failed}")
    db.close()


if __name__ == "__main__":
    main()