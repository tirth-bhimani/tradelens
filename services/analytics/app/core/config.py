from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "tradelens-analytics"
    version: str = "0.1.0"
    environment: str = "development"
    log_level: str = "INFO"

    # API Configuration
    api_prefix: str = "/api/v1"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/tradelens"


settings = Settings()
