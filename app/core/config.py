from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # AI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AWS S3 and Local Storage
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET_NAME: Optional[str] = None
    AWS_S3_REGION: str = "us-east-1"
    MEDIA_ROOT: str = "uploads"

    # Environment
    ENVIRONMENT: str = "development"  # "development" | "production"

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # Email (SendGrid or Resend)
    EMAIL_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@educomfort.com"

    # SMS — Eskiz (O'zbekiston)
    ESKIZ_EMAIL: Optional[str] = None
    ESKIZ_PASSWORD: Optional[str] = None

    # Click Integration
    CLICK_MERCHANT_ID: Optional[str] = None
    CLICK_SERVICE_ID: Optional[str] = None
    CLICK_SECRET_KEY: Optional[str] = None

    # Uzum Integration
    UZUM_TERMINAL_ID: Optional[str] = None
    UZUM_SECRET_KEY: Optional[str] = None

    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
