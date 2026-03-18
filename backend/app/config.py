from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "VidShield AI"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vidshield"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/vidshield"

    # ── Redis ────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── Auth / JWT ───────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-at-least-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AWS ──────────────────────────────────────────────────
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "vidshield-videos"
    S3_PRESIGNED_URL_EXPIRE: int = 3600  # seconds

    # ── OpenAI ───────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MINI_MODEL: str = "gpt-4o-mini"

    # ── Pinecone ─────────────────────────────────────────────
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "vidshield-embeddings"

    # ── Sentry ───────────────────────────────────────────────
    SENTRY_DSN: str = ""

    # ── CORS ─────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # ── Pagination ───────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
