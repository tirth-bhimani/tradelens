"""TradeLens AI Behavioral Insights Router.

FastAPI endpoint for requesting structured behavioral insights, leak explanations,
anti-hallucination numeric grounding validation, and high-performance caching.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.ai.cache import (
    DailyRateLimiter,
    InsightCache,
    compute_stats_hash,
    get_insight_cache,
    get_rate_limiter,
)
from app.ai.client import AIClient, get_ai_client
from app.ai.grounding import GroundingValidator
from app.ai.schemas import InsightReport, InsightRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Behavioral Insights"])


@router.post(
    "/insights",
    response_model=InsightReport,
    status_code=status.HTTP_200_OK,
    summary="Generate Structured Behavioral Insights",
    description=(
        "Analyzes pre-computed trading performance and behavioral leak metrics "
        "to deliver structured explanations, risk grades, and targeted rule suggestions, "
        "with anti-hallucination grounding validation and intelligent caching."
    ),
)
async def generate_behavioral_insights(
    request: InsightRequest,
    client: Annotated[AIClient, Depends(get_ai_client)],
    cache: Annotated[InsightCache, Depends(get_insight_cache)],
    rate_limiter: Annotated[DailyRateLimiter, Depends(get_rate_limiter)],
    bypass_cache: Annotated[bool, Query(description="Force regeneration bypassing cache")] = False,
) -> InsightReport:
    """Generates structured AI insights with caching, rate limits, and anti-hallucination checks."""
    user_id = request.user_id
    stats_hash = compute_stats_hash(user_id, request)

    # 1. Check Cache Layer (unless explicitly bypassed)
    if not bypass_cache:
        cached_report = await cache.get(user_id, stats_hash)
        if cached_report is not None:
            logger.info("Served behavioral insights from cache for user=%s stats_hash=%s", user_id, stats_hash)
            return cached_report

    # 2. Daily Quota Check (Rate Limiter)
    if not rate_limiter.check_and_increment(user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Daily AI behavioral insights limit exceeded (maximum 20 requests per day on free tier). "
                "Please try again tomorrow."
            ),
        )

    # 3. Generate Insights (via Free LLM or Deterministic Engine)
    report = await client.generate_insights(request)

    # 4. Anti-Hallucination Numeric Grounding Validation (2% tolerance)
    grounding = GroundingValidator.validate_report(report, request, tolerance=0.02)
    if not grounding.is_valid:
        logger.warning(
            "AI report for user=%s failed numeric grounding (%d discrepancies). Falling back to deterministic engine.",
            user_id,
            len(grounding.discrepancies),
        )
        report = client._generate_deterministic(request)
        report.grounding_verified = True
    else:
        report.grounding_verified = True

    # 5. Attach Fingerprint and Persist to Cache
    report.stats_hash = stats_hash
    report.cached = False
    await cache.set(user_id, stats_hash, report)

    return report
