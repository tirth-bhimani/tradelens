"""TradeLens In-Memory Sliding Window Rate Limiter for FastAPI.

Protects sensitive analytics endpoints (AI Insights generation, CSV upload parsing)
from denial-of-service, model quota exhaustion, and automated credential stuffing.
Uses an in-memory sliding window algorithm with automatic TTL eviction.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Sliding window rate limiter with microsecond timestamp resolution."""

    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, identifier: str) -> tuple[bool, int, float]:
        """Checks if the request is permitted.

        Returns:
            (allowed, remaining_quota, reset_seconds)
        """
        now = time.time()
        window_start = now - self.window_seconds

        # Clean timestamps older than window_start
        active_timestamps = [t for t in self._hits[identifier] if t > window_start]
        self._hits[identifier] = active_timestamps

        if len(active_timestamps) >= self.limit:
            oldest = active_timestamps[0]
            reset_seconds = max(0.0, (oldest + self.window_seconds) - now)
            return False, 0, reset_seconds

        # Record new hit
        self._hits[identifier].append(now)
        remaining = self.limit - len(self._hits[identifier])
        return True, remaining, self.window_seconds

    def reset(self, identifier: str | None = None) -> None:
        """Resets rate limit counter for an identifier or all callers."""
        if identifier:
            self._hits.pop(identifier, None)
        else:
            self._hits.clear()


# Pre-configured institutional rate limiters
ai_rate_limiter = SlidingWindowRateLimiter(limit=10, window_seconds=60.0)
upload_rate_limiter = SlidingWindowRateLimiter(limit=5, window_seconds=60.0)


def rate_limit_dependency(limiter: SlidingWindowRateLimiter) -> Callable[[Request], None]:
    """Factory creating a FastAPI route dependency enforcing rate limits."""

    async def dependency(request: Request) -> None:
        # Determine caller identifier (User token, X-Forwarded-For, or client IP)
        auth_header = request.headers.get("Authorization", "")
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        client_host = request.client.host if request.client else "127.0.0.1"

        identifier = auth_header or (forwarded_for.split(",")[0].strip() if forwarded_for else client_host)

        allowed, remaining, reset_seconds = limiter.check(identifier)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded ({limiter.limit} requests per {int(limiter.window_seconds)}s). Try again in {int(reset_seconds)}s.",
                headers={
                    "Retry-After": str(int(reset_seconds) + 1),
                    "X-RateLimit-Limit": str(limiter.limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

    return dependency
