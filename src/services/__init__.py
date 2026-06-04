from importlib import import_module

_EXPORTED_MODULES = {
    "admin_analytics_service",
    "application_service",
    "auth_service",
    "bootstrap_service",
    "conversation_service",
    "crawl_service",
    "daily_analytic_service",
    "embedding_service",
    "faq_analytics_service",
    "firecrawl_service",
    "knowledge_chunk_service",
    "lead_activity_service",
    "lead_major_interest_service",
    "lead_service",
    "major_matcher",
    "message_chunk_usage_retention_scheduler",
    "message_chunk_usage_retention_service",
    "message_chunk_usage_service",
    "message_service",
    "metadata_extraction",
    "notification_service",
    "ocr_service",
    "qdrant_service",
    "r2_service",
    "scholarship_policy_service",
    "semantic_answer_cache_cleanup_scheduler",
    "semantic_answer_cache_cleanup_service",
    "staff_service",
    "text_processing_service",
    "tuition_policy_service",
}

__all__ = sorted(_EXPORTED_MODULES)


def __getattr__(name: str):
    if name not in _EXPORTED_MODULES:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module = import_module(f"{__name__}.{name}")
    globals()[name] = module
    return module
