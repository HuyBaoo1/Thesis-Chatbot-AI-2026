#!/usr/bin/env python3
"""
Re-embed all FAQ analytics from PostgreSQL into Qdrant.
Usage: python scripts/reembed_faq.py [--limit N]
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.models.faq_analytics import FAQAnalytics
from src.services import embedding_service, qdrant_service


def main():
    parser = argparse.ArgumentParser(description="Re-embed all FAQ into Qdrant")
    parser.add_argument("--limit", type=int, default=500, help="Max records to process")
    args = parser.parse_args()

    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print(f"[reembed_faq] Starting FAQ re-embedding (limit={args.limit})...")

    # Ensure collection exists
    qdrant_service.ensure_faq_collection()

    faqs = db.query(FAQAnalytics).filter(
        FAQAnalytics.normalized.isnot(None)
    ).limit(args.limit).all()

    embedded = 0
    failed = 0

    for faq in faqs:
        try:
            vector = embedding_service.generate_embedding(faq.question)
            qdrant_service.upsert_faq_vector(
                faq.id,
                vector,
                {
                    "faq_id": str(faq.id),
                    "question": faq.question,
                    "normalized": faq.normalized,
                    "intent": faq.intent,
                    "count": faq.count,
                    "is_fallback": faq.is_fallback,
                    "last_conversation_id": (
                        str(faq.last_conversation_id)
                        if faq.last_conversation_id
                        else None
                    ),
                    "last_user_message_id": (
                        str(faq.last_user_message_id)
                        if faq.last_user_message_id
                        else None
                    ),
                    "last_assistant_message_id": (
                        str(faq.last_assistant_message_id)
                        if faq.last_assistant_message_id
                        else None
                    ),
                },
            )
            embedded += 1
            print(f"[reembed_faq] Embedded FAQ: {faq.id} ({faq.intent})")
        except Exception as e:
            failed += 1
            print(f"[reembed_faq] Failed FAQ {faq.id}: {e}")

    print(f"\n[reembed_faq] Done! Total: embedded={embedded}, failed={failed}")
    db.close()


if __name__ == "__main__":
    main()