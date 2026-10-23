
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
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
    gemini_model: str = "gemini-3-flash-preview"
    groq_api_key: str | None = None
    anthropic_api_key: str | None = None
    ai_provider: str = "auto"  # "auto", "anthropic", "gemini", "groq", or "deterministic"

    # Transactional Email (Resend) & Scheduled Reports
    resend_api_key: str | None = None
    email_from: str = "TradeLens Reports <reports@tradelens.app>"
    cron_secret: str = "tradelens-cron-secret-dev"

    # Monitoring & Telemetry (Sentry)
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1

    def validate_environment(self) -> list[str]:
        """Audits runtime configuration and returns any critical warnings or errors."""
        warnings: list[str] = []

        if self.environment == "production":
            if not self.database_url or "localhost" in self.database_url:
                warnings.append("Production database_url should not point to localhost.")
            if not self.cron_secret or self.cron_secret == "tradelens-cron-secret-dev":
                warnings.append("Default cron_secret in production must be rotated.")
            if not self.sentry_dsn:
                warnings.append("Sentry DSN recommended for production error tracking.")

        return warnings


settings = Settings()
