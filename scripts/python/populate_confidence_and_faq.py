#!/usr/bin/env python3
"""
Populate confidence scores and FAQ analytics.

This script:
1. Estimates confidence_score for messages without it
2. Links assistant messages to normalized questions
3. Updates FAQ analytics success rates

Usage:
    python scripts/python/populate_confidence_and_faq.py
"""
import sys
import os
import re
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'services' / 'web-crawler-rag-backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import ConversationMessage
from app.logging_config import get_logger

logger = get_logger(__name__)


def normalize_question(question: str) -> str:
    """Normalize question text for matching."""
    text = question.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def estimate_confidence(content: str) -> float:
    """Estimate confidence score based on response content."""
    content_lower = content.lower()
    
    # Fallback responses (low confidence)
    fallback_indicators = [
        "sorry, i don't have information",
        "i don't have specific information",
        "i couldn't find",
        "no information available",
        "xin lỗi, tôi không có thông tin",
        "tôi không tìm thấy",
    ]
    
    for indicator in fallback_indicators:
        if indicator in content_lower:
            return 0.2
    
    # High confidence indicators
    high_confidence_indicators = [
        "according to",
        "based on",
        "the information shows",
        "here is",
        "here are",
        "you can find",
        "theo như",
        "dựa trên",
        "thông tin cho thấy",
    ]
    
    for indicator in high_confidence_indicators:
        if indicator in content_lower:
            return 0.85
    
    # Medium confidence (has substantial content)
    if len(content) > 100:
        return 0.65
    
    return 0.5


def populate_confidence_scores(db):
    """Populate confidence_score and normalized_question for existing messages."""
    logger.info("Step 1: Populating confidence scores...")
    
    # Get all messages without confidence_score
    messages = db.query(ConversationMessage).filter(
        ConversationMessage.confidence_score == None
    ).all()
    
    logger.info(f"Found {len(messages)} messages without confidence_score")
    
    updated_count = 0
    for msg in messages:
        if msg.role == 'assistant':
            estimated_confidence = estimate_confidence(msg.content)
            msg.confidence_score = estimated_confidence
            
            if estimated_confidence < 0.3:
                msg.is_fallback = 'true'
            else:
                msg.is_fallback = 'false'
            
            updated_count += 1
        elif msg.role == 'user':
            normalized = normalize_question(msg.content)
            msg.normalized_question = normalized
            updated_count += 1
    
    db.commit()
    logger.info(f"✓ Updated {updated_count} messages with confidence scores")


def link_normalized_questions(db):
    """Link assistant messages to normalized questions from user messages."""
    logger.info("Step 2: Linking assistant messages to normalized questions...")
    
    result = db.execute(text("""
        SELECT DISTINCT session_id 
        FROM conversation_messages 
        WHERE normalized_question IS NULL 
        AND role = 'assistant';
    """))
    session_ids = [row[0] for row in result]
    
    logger.info(f"Processing {len(session_ids)} sessions...")
    
    linked_count = 0
    for session_id in session_ids:
        messages = db.query(ConversationMessage).filter(
            ConversationMessage.session_id == session_id
        ).order_by(ConversationMessage.timestamp).all()
        
        current_user_question = None
        for msg in messages:
            if msg.role == 'user':
                current_user_question = msg.normalized_question
            elif msg.role == 'assistant' and current_user_question:
                if not msg.normalized_question:
                    msg.normalized_question = current_user_question
                    linked_count += 1
    
    db.commit()
    logger.info(f"✓ Linked {linked_count} assistant messages to normalized questions")


def update_faq_success_rates(engine):
    """Update success rates in faq_analytics."""
    logger.info("Step 3: Updating FAQ analytics success rates...")
    
    with engine.connect() as conn:
        result = conn.execute(text("""
            WITH question_success AS (
                SELECT 
                    faq.id,
                    faq.normalized,
                    COUNT(m.id) as total_responses,
                    COUNT(CASE WHEN m.confidence_score >= 0.7 THEN 1 END) as successful_responses,
                    CASE 
                        WHEN COUNT(m.id) > 0 THEN 
                            COUNT(CASE WHEN m.confidence_score >= 0.7 THEN 1 END)::float / COUNT(m.id)
                        ELSE 0.0
                    END as success_rate
                FROM faq_analytics faq
                LEFT JOIN conversation_messages m 
                    ON m.normalized_question = faq.normalized 
                    AND m.role = 'assistant'
                GROUP BY faq.id, faq.normalized
            )
            UPDATE faq_analytics
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{success_rate}',
                to_jsonb(question_success.success_rate)
            )
            FROM question_success
            WHERE faq_analytics.id = question_success.id
            RETURNING faq_analytics.question, question_success.success_rate;
        """))
        
        updated = result.fetchall()
        conn.commit()
        
        logger.info(f"✓ Updated {len(updated)} FAQ analytics records")


def print_summary(engine):
    """Print summary statistics."""
    with engine.connect() as conn:
        # Message stats
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(confidence_score) as with_confidence,
                COUNT(CASE WHEN confidence_score >= 0.7 THEN 1 END) as high_confidence,
                COUNT(normalized_question) as with_normalized
            FROM conversation_messages
            WHERE role = 'assistant';
        """))
        msg_stats = result.fetchone()
        
        # FAQ stats
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_questions,
                AVG((metadata->>'success_rate')::float) as avg_success_rate,
                COUNT(CASE WHEN (metadata->>'success_rate')::float >= 0.7 THEN 1 END) as high_success,
                COUNT(CASE WHEN (metadata->>'success_rate')::float < 0.3 THEN 1 END) as low_success
            FROM faq_analytics
            WHERE metadata->>'success_rate' IS NOT NULL;
        """))
        faq_stats = result.fetchone()
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print("\nConversation Messages:")
        print(f"  Total assistant messages: {msg_stats.total}")
        print(f"  With confidence_score: {msg_stats.with_confidence}")
        print(f"  High confidence (>=0.7): {msg_stats.high_confidence}")
        print(f"  With normalized_question: {msg_stats.with_normalized}")
        
        print("\nFAQ Analytics:")
        print(f"  Total questions: {faq_stats.total_questions}")
        print(f"  Average success rate: {faq_stats.avg_success_rate:.2%}")
        print(f"  High success (>=70%): {faq_stats.high_success}")
        print(f"  Low success (<30%): {faq_stats.low_success}")
        print("="*60 + "\n")


def main():
    """Main function."""
    logger.info("Starting confidence score and FAQ analytics population...")
    
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        populate_confidence_scores(db)
        link_normalized_questions(db)
        update_faq_success_rates(engine)
        print_summary(engine)
        
        logger.info("✓ All tasks completed successfully!")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
