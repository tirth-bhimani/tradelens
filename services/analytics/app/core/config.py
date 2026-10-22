
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
    allowed_origins: str | list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @property
    def cors_origins(self) -> list[str]:
        if isinstance(self.allowed_origins, str):
            import json
            if self.allowed_origins.startswith("["):
                loaded = json.loads(self.allowed_origins)
                return [str(x) for x in loaded] if isinstance(loaded, list) else []
            return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        return list(self.allowed_origins)

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/tradelens"

    # AI Configuration (Free Cloud Providers, Anthropic Claude & Deterministic Engine)
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    anthropic_api_key: str | None = None
    ai_provider: str = "auto"  # "auto", "anthropic", "gemini", "groq", or "deterministic"


settings = Settings()
