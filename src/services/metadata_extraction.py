import logging
import re
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlparse

from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CrawledPageMetadata:
    category: str | None = None
    title: str | None = None
    content: str | None = None
    year: int | None = None
    source: str | None = None


YEAR_PATTERN = re.compile(r"(20\d{2}|19\d{2})")

CATEGORY_KEYWORDS = {
    "TUITION": ["tuition", "học phí", "fee", "cost", "price", "financ"],
    "SCHOLARSHIP": ["scholarship", "học bổng", "grant", "award", "funding", "scholarship"],
    "REQUIREMENT": ["requirement", "yêu cầu", "eligibility", "criteria", "condition"],
    "DEADLINE": ["deadline", "hạn nộp", "due date", "closing", "application period"],
    "PROCESS": ["process", "quy trình", "procedure", "step", "how to apply", "hướng dẫn"],
    "MAJOR_INFO": ["major", "ngành", "program", "course", "concentration"],
    "FAQ": ["faq", "question", "câu hỏi", "q&a", "frequently"],
}


def extract_metadata(url: str, title: str | None, content: str | None) -> CrawledPageMetadata:
    """
    Extract structured metadata from crawled page.
    Returns simplified metadata with: category, title, content, year, source
    """
    source = urlparse(url).netloc or "unknown"

    if title:
        clean_title = title.strip()
    else:
        clean_title = None

    combined_text = f"{title or ''} {content or ''}".lower()

    category = None
    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in combined_text for kw in keywords):
            category = cat_name
            break

    year_match = YEAR_PATTERN.search(combined_text)
    year = int(year_match.group()) if year_match else None

    return CrawledPageMetadata(
        category=category,
        title=clean_title,
        content=content,
        year=year,
        source=source,
    )


def extract_metadata_with_ai(url: str, title: str | None, content: str | None) -> CrawledPageMetadata:
    """
    AI-enhanced metadata extraction using OpenAI.
    Falls back to rule-based if AI fails or is disabled.
    """
    if not settings.OPENAI_API_KEY:
        return extract_metadata(url, title, content)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""Analyze this web page and extract metadata.
URL: {url}
Title: {title or 'N/A'}
Content preview: {(content or '')[:500]}

Return JSON with:
- category: one of TUITION|SCHOLARSHIP|REQUIREMENT|DEADLINE|PROCESS|MAJOR_INFO|FAQ|NONE
- year: the year mentioned (e.g. 2025, 2026) or null
- source: the domain name (e.g. vinuni.edu.vn)

Respond with valid JSON only."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You extract structured metadata from web pages. Respond with JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=200,
        )

        import json

        result_text = response.choices[0].message.content.strip()
        result = json.loads(result_text)

        return CrawledPageMetadata(
            category=result.get("category"),
            title=title,
            content=content,
            year=int(result["year"]) if result.get("year") else None,
            source=urlparse(url).netloc or "unknown",
        )

    except Exception as e:
        logger.warning(f"AI metadata extraction failed, falling back to rules: {e}")
        return extract_metadata(url, title, content)
