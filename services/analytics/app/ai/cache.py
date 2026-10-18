"""TradeLens AI Insight Caching Layer & Token Quota Tracker.

Provides deterministic SHA-256 dataset fingerprinting, hybrid PostgreSQL / in-memory
caching for behavioral insights, and daily rate limit enforcement.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.ai.schemas import InsightReport, InsightRequest

logger = logging.getLogger(__name__)

# Default daily limit on free-tier behavioral insights requests
DEFAULT_DAILY_RATE_LIMIT = 20


def compute_stats_hash(user_id: str, request: InsightRequest | dict[str, Any]) -> str:
    """Computes a deterministic SHA-256 fingerprint for a given user's dataset metrics."""
    if isinstance(request, InsightRequest):
        data = request.model_dump(exclude={"user_id"})
    else:
        data = {k: v for k, v in request.items() if k != "user_id"}

    # Canonicalize JSON: sorted keys, compact separators
    canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
    raw_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
    return f"{user_id}:{raw_hash}"


class DailyRateLimiter:
    """In-memory daily quota tracker enforcing daily caps per user."""

    def __init__(self, max_daily_calls: int = DEFAULT_DAILY_RATE_LIMIT) -> None:
        self.max_daily_calls = max_daily_calls
        # Maps (user_id, date_str) -> call_count
        self._counts: dict[tuple[str, str], int] = {}

    def _today_key(self, user_id: str) -> tuple[str, str]:
        today_str = datetime.now(UTC).strftime("%Y-%m-%d")
        return (user_id, today_str)

    def check_and_increment(self, user_id: str) -> bool:
        """Returns True and increments count if quota is available; False if exceeded."""
        key = self._today_key(user_id)
        current = self._counts.get(key, 0)
        if current >= self.max_daily_calls:
            logger.warning(
                "Daily AI quota exceeded for user %s (used %d / limit %d)",
                user_id,
                current,
                self.max_daily_calls,
            )
            return False
        self._counts[key] = current + 1
        return True

    def get_usage(self, user_id: str) -> int:
        """Returns current usage count for today."""
        return self._counts.get(self._today_key(user_id), 0)

    def reset(self, user_id: str | None = None) -> None:
        """Resets quota counts (used in tests or maintenance)."""
        if user_id is None:
            self._counts.clear()
        else:
            to_del = [k for k in self._counts if k[0] == user_id]
            for k in to_del:
                del self._counts[k]


class InsightCache:
    """Hybrid caching layer for AI behavioral insights with memory and PostgreSQL support."""

    def __init__(
        self,
        database_url: str | None = None,
        ttl_seconds: int = 86400 * 7,  # 7-day cache TTL
    ) -> None:
        env_url = os.getenv("DATABASE_URL")
        self.database_url: str = database_url or env_url or "postgresql://postgres:postgres@localhost:5432/tradelens"
        self.ttl_seconds = ttl_seconds
        # In-memory store: stats_hash -> (InsightReport, timestamp)
        self._memory_store: dict[str, tuple[InsightReport, float]] = {}

    def get_memory(self, stats_hash: str) -> InsightReport | None:
        """Looks up insight report from in-memory cache."""
        item = self._memory_store.get(stats_hash)
        if not item:
            return None
        report, created_at = item
        if time.time() - created_at > self.ttl_seconds:
            del self._memory_store[stats_hash]
            return None
        # Return a copy marked as cached
        report_copy = report.model_copy()
        report_copy.cached = True
        report_copy.stats_hash = stats_hash
        return report_copy

    def set_memory(self, stats_hash: str, report: InsightReport) -> None:
        """Stores insight report in memory cache."""
        self._memory_store[stats_hash] = (report, time.time())

    def clear(self) -> None:
        """Empties in-memory cache."""
        self._memory_store.clear()

    async def get(self, user_id: str, stats_hash: str) -> InsightReport | None:
        """Retrieves cached insight report from memory or PostgreSQL."""
        # 1. Fast memory check
        cached = self.get_memory(stats_hash)
        if cached:
            return cached

        # 2. Database check (if valid user UUID and reachable DB)
        try:
            valid_uuid = uuid.UUID(user_id)
        except (ValueError, AttributeError):
            return None

        try:
            with (
                psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=1) as conn,
                conn.cursor() as cur,
            ):
                cur.execute(
                    """
                    SELECT top_leaks, suggested_rules, confidence_notes, model_used, stats_hash
                    FROM insights
                    WHERE user_id = %s AND stats_hash = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (valid_uuid, stats_hash),
                )
                row = cur.fetchone()
                if row:
                    report = InsightReport(
                        overall_summary=row.get("confidence_notes") or "Cached Behavioral Insight Report",
                        discipline_grade="A",
                        discipline_score=100,
                        top_leaks=row.get("top_leaks") or [],
                        suggested_rules=row.get("suggested_rules") or [],
                        provider_used=row.get("model_used") or "FREE_DETERMINISTIC",
                        cached=True,
                        stats_hash=stats_hash,
                        grounding_verified=True,
                    )
                    # Warm memory cache
                    self.set_memory(stats_hash, report)
                    return report
        except (psycopg.OperationalError, psycopg.Error, OSError) as exc:
            logger.debug("Database unreachable for cache read (%s); memory fallback active.", exc)

        return None

    async def set(
        self,
        user_id: str,
        stats_hash: str,
        report: InsightReport,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ) -> None:
        """Persists insight report and logs AI usage in memory and PostgreSQL."""
        # 1. Store in memory cache
        self.set_memory(stats_hash, report)

        # 2. Store in database (if valid UUID and reachable DB)
        try:
            valid_uuid = uuid.UUID(user_id)
        except (ValueError, AttributeError):
            return

        try:
            with (
                psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=1) as conn,
                conn.cursor() as cur,
            ):
                # Write to insights table
                cur.execute(
                    """
                    INSERT INTO insights (user_id, top_leaks, suggested_rules, confidence_notes, model_used, stats_hash)
                    VALUES (%s, %s::jsonb, %s::jsonb, %s, %s, %s)
                    """,
                    (
                        valid_uuid,
                        json.dumps([leak.model_dump() for leak in report.top_leaks]),
                        json.dumps([rule.model_dump() for rule in report.suggested_rules]),
                        report.overall_summary,
                        report.provider_used,
                        stats_hash,
                    ),
                )

                # Write to ai_usage table (free tier cost = $0.0000)
                cur.execute(
                    """
                    INSERT INTO ai_usage (user_id, calls_count, prompt_tokens, completion_tokens, cost_usd)
                    VALUES (%s, 1, %s, %s, 0.0000)
                    """,
                    (
                        valid_uuid,
                        prompt_tokens,
                        completion_tokens,
                    ),
                )
                conn.commit()
        except (psycopg.OperationalError, psycopg.Error, OSError) as exc:
            logger.debug("Database unreachable for cache write (%s); saved to memory only.", exc)


# Singleton instances
_global_rate_limiter = DailyRateLimiter()
_global_cache = InsightCache()


def get_rate_limiter() -> DailyRateLimiter:
    """Dependency injector for DailyRateLimiter."""
    return _global_rate_limiter


def get_insight_cache() -> InsightCache:
    """Dependency injector for InsightCache."""
    return _global_cache
