from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Qdrant
    QDRANT_HOST: str 
    QDRANT_PORT: int
    QDRANT_API_KEY: str | None = None
    QDRANT_HTTPS: bool = False
    QDRANT_KNOWLEDGE_COLLECTION: str = "knowledge_chunks"
    QDRANT_FAQ_COLLECTION: str = "faq_analytics"
    
    # AI providers
    OPENAI_API_KEY: str
    GEMINI_API_KEY: str = Field(default="", description="Optional Google Gemini API key")

    # OCR
    USE_SMART_EXTRACTION: bool = Field(default=True, description="Enable smart routing for OCR (PyMuPDF/RapidOCR/Vision)")
    ENABLE_VISION_FALLBACK: bool = Field(default=True, description="Allow Vision API fallback for complex documents")
    OCR_PIPELINE_VERSION: str = Field(default="v2", description="Version tag for OCR parse cache invalidation")
    OCR_PARSE_API_KEY: str = Field(default="", description="Remote document parse API key")
    OCR_PARSE_API_BASE_URL: str = Field(default="", description="Base URL for document parse API")
    OCR_PARSE_POLL_INTERVAL_SECONDS: float = Field(default=2.0, description="Polling interval for parse jobs")
    OCR_PARSE_TIMEOUT_SECONDS: int = Field(default=600, description="Timeout for parse job completion")
    OCR_TEMP_DIR: str = Field(default="/tmp/admissions-ocr", description="Temp directory for OCR files")

    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    SEMANTIC_ANSWER_CACHE_ENABLED: bool = True
    SEMANTIC_ANSWER_CACHE_TTL_SECONDS: int = 43200
    SEMANTIC_ANSWER_CACHE_SCORE_THRESHOLD: float = 0.92
    SEMANTIC_ANSWER_CACHE_TOP_K: int = 5
    QDRANT_SEMANTIC_ANSWER_CACHE_COLLECTION: str = "semantic_answer_cache"
    SEMANTIC_ANSWER_CACHE_CLEANUP_ENABLED: bool = True
    SEMANTIC_ANSWER_CACHE_CLEANUP_INTERVAL_SECONDS: float = 1800.0
    SEMANTIC_ANSWER_CACHE_CLEANUP_BATCH_SIZE: int = 200
    SEMANTIC_ANSWER_CACHE_CLEANUP_MAX_BATCHES: int = 20
    GEMINI_ROUTER_MODEL: str = Field(
        default="",
        description="Gemini Flash model for intent routing, e.g. gemini-2.5-flash. Empty to use OpenAI router.",
    )
    
    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    CONVERSATION_ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    ALGORITHM: str
    COOKIE_SECURE: bool = False
    
    # Cloudflare R2
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_PUBLIC_BASE_URL: str

    # Firecrawl
    FIRECRAWL_API_KEY: str

    # Bootstrap admin
    BOOTSTRAP_ADMIN_ENABLED: bool = True
    BOOTSTRAP_ADMIN_NAME: str = "System Admin"
    BOOTSTRAP_ADMIN_EMAIL: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""

    # Redis / RQ
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"
    RQ_QUEUE_NAME: str = "default"
    RQ_JOB_TIMEOUT: int = Field(default=900, description="Max seconds an RQ job may run before being killed")

    # Handoff -> AI fallback
    HANDOFF_AI_FALLBACK_ENABLED: bool = True
    HANDOFF_AI_FALLBACK_TIMEOUT_SECONDS: int = Field(
        default=180,
        description="How long to wait for staff while a conversation is in HANDOFF before resuming AI chat.",
    )
    HANDOFF_AI_FALLBACK_POLL_INTERVAL_SECONDS: float = Field(
        default=30.0,
        description="How often the scheduler checks for expired HANDOFF conversations.",
    )
    HANDOFF_AI_FALLBACK_BATCH_SIZE: int = Field(
        default=100,
        description="Maximum number of expired HANDOFF conversations processed in one scheduler cycle.",
    )

    # Retention jobs
    MESSAGE_CHUNK_USAGE_RETENTION_ENABLED: bool = True
    MESSAGE_CHUNK_USAGE_RETENTION_DAYS: int = 60
    MESSAGE_CHUNK_USAGE_RETENTION_RUN_HOUR: int = 3
    MESSAGE_CHUNK_USAGE_RETENTION_BATCH_SIZE: int = 1000
    MESSAGE_CHUNK_USAGE_RETENTION_MAX_BATCHES: int = 100

    # Rate limits
    CHAT_QUERY_RATE_LIMIT_PER_MINUTE: int = 12
    CHAT_QUERY_RATE_LIMIT_PER_HOUR: int = 120
    CHAT_QUERY_IP_RATE_LIMIT_PER_MINUTE: int = 30
    CHAT_INIT_RATE_LIMIT_PER_MINUTE: int = 10
    
    # App
    API_PORT: int = 8000
    TRUSTED_HOSTS: str = "a20-app-165-production.up.railway.app,a20-app-165.up.railway.app,localhost,127.0.0.1"
    CORS_ALLOW_ORIGINS: str
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: str = "*"
    CORS_ALLOW_HEADERS: str = "*"

    # BM25 parameters
    BM25_K1: float = 1.5
    BM25_B: float = 0.75

    # Evaluation
    EVAL_TOP_K: int = 10
    EVAL_RERANK_TOP_K: int = 5

    # Telegram
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_POLLING_ENABLED: bool = False

    # Zalo Bot (official Zalo Bot API — https://bot.zapps.me/docs)
    ZALO_BOT_TOKEN: str | None = None
    ZALO_POLLING_ENABLED: bool = False
    ZALO_WEBHOOK_SECRET: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"

    @staticmethod
    def _parse_csv(value: str) -> list[str]:
        cleaned = [item.strip() for item in value.split(",")]
        return [item for item in cleaned if item]

    @property
    def trusted_hosts(self) -> list[str]:
        hosts = self._parse_csv(self.TRUSTED_HOSTS)
        return hosts if hosts else ["localhost", "127.0.0.1"]

    @property
    def cors_allow_origins(self) -> list[str]:
        return self._parse_csv(self.CORS_ALLOW_ORIGINS)

    @property
    def cors_allow_methods(self) -> list[str]:
        methods = self._parse_csv(self.CORS_ALLOW_METHODS)
        return methods or ["*"]

    @property
    def cors_allow_headers(self) -> list[str]:
        headers = self._parse_csv(self.CORS_ALLOW_HEADERS)
        return headers or ["*"]

settings = Settings()
