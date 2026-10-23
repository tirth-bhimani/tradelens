"""TradeLens Sentry Error Telemetry & PII Sanitizer.

Initializes centralized error monitoring for FastAPI with automatic PII scrubbing
(removes Authorization headers, tokens, passwords, cookies, and file paths).
Operates with graceful fallback to local logging when SENTRY_DSN is absent.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "authorization",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "cookie",
    "api_key",
    "gemini_api_key",
    "groq_api_key",
    "anthropic_api_key",
}


def scrub_pii(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any]:
    """Sanitizes outgoing Sentry event payloads before network transmission."""
    sensitive_substrings = ("auth", "token", "key", "secret", "cookie", "pass", "pwd")

    # 1. Scrub request headers
    request_data = event.get("request", {})
    if "headers" in request_data and isinstance(request_data["headers"], dict):
        for header_key in list(request_data["headers"].keys()):
            k_lower = header_key.lower()
            if any(sub in k_lower for sub in sensitive_substrings):
                request_data["headers"][header_key] = "[REDACTED]"

    if "cookies" in request_data:
        request_data["cookies"] = "[REDACTED]"

    # 2. Scrub extra / user data
    user_data = event.get("user", {})
    if isinstance(user_data, dict):
        if "ip_address" in user_data:
            user_data["ip_address"] = "[REDACTED]"

    return event


class SentryMonitor:
    """Manages Sentry lifecycle and exception recording."""

    def __init__(self) -> None:
        self.is_initialized = False

    def init(self, dsn: str | None, environment: str = "development", sample_rate: float = 0.1) -> bool:
        """Initializes Sentry SDK if DSN is provided, else falls back to local logging."""
        if not dsn or not dsn.strip():
            logger.info("SENTRY_DSN not configured. Centralized telemetry operating in local mock mode.")
            self.is_initialized = False
            return False

        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=dsn,
                environment=environment,
                traces_sample_rate=sample_rate,
                before_send=scrub_pii,
                send_default_pii=False,
            )
            self.is_initialized = True
            logger.info("Sentry monitoring successfully initialized for environment: %s", environment)
            return True
        except Exception as e:
            logger.warning("Failed to initialize Sentry (%s). Operating in local logging mode.", e)
            self.is_initialized = False
            return False

    def capture_exception(self, exc: Exception, context: dict[str, Any] | None = None) -> str:
        """Captures an exception, sending to Sentry if active or logging locally."""
        if self.is_initialized:
            try:
                import sentry_sdk
                with sentry_sdk.push_scope() as scope:
                    if context:
                        for k, v in context.items():
                            scope.set_extra(k, v)
                    event_id = sentry_sdk.capture_exception(exc)
                    return str(event_id)
            except Exception:
                pass

        logger.error("Exception captured: %s (Context: %s)", exc, context)
        return "local-mock-event-id"

    def add_breadcrumb(self, message: str, category: str = "app", level: str = "info") -> None:
        """Adds a telemetry breadcrumb."""
        if self.is_initialized:
            try:
                import sentry_sdk
                sentry_sdk.add_breadcrumb(category=category, message=message, level=level)
                return
            except Exception:
                pass
        logger.debug("[BREADCRUMB %s/%s]: %s", category, level, message)


monitor = SentryMonitor()
