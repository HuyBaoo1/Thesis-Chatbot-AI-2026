from src.core.config import Settings


def _settings(**overrides):
    values = {
        "DATABASE_URL": "postgresql+psycopg://user:pass@localhost:5432/db",
        "QDRANT_HOST": "localhost",
        "QDRANT_PORT": 6333,
        "QDRANT_API_KEY": "",
        "QDRANT_HTTPS": False,
        "OPENAI_API_KEY": "test",
        "FIRECRAWL_API_KEY": "test",
        "SECRET_KEY": "test",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 60,
        "REFRESH_TOKEN_EXPIRE_MINUTES": 1440,
        "ALGORITHM": "HS256",
        "CORS_ALLOW_ORIGINS": "http://localhost:5173",
    }
    values.update(overrides)
    return Settings(**values)


def test_api_docs_enabled_defaults_to_true():
    assert _settings().API_DOCS_ENABLED is True


def test_api_docs_can_be_disabled_by_environment_value():
    assert _settings(API_DOCS_ENABLED=False).API_DOCS_ENABLED is False


def test_firecrawl_key_is_not_required_for_core_settings():
    values = _settings().model_dump()
    values.pop("FIRECRAWL_API_KEY")

    assert Settings(**values).FIRECRAWL_API_KEY == ""
