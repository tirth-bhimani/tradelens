"""Unit and Integration Tests for Numeric Grounding Validation, Caching & Rate Limiting."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from app.ai.cache import (
    DailyRateLimiter,
    InsightCache,
    compute_stats_hash,
    get_insight_cache,
    get_rate_limiter,
)
from app.ai.client import AIClient
from app.ai.grounding import GroundingValidator
from app.ai.schemas import (
    InsightReport,
    InsightRequest,
    LeakDiagnosis,
    SuggestedRuleRecommendation,
)
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture
def sample_request() -> InsightRequest:
    return InsightRequest(
        user_id="test-trader-uuid-1",
        total_trades=25,
        win_rate=44.0,
        total_net_pnl=-14500.0,
        profit_factor=0.85,
        expectancy_inr=-580.0,
        max_drawdown_inr=22000.0,
        max_consecutive_losses=4,
        discipline_score=68,
        identified_leaks=[
            {
                "leak_type": "RE_ENTRY_TILT",
                "trade_count": 5,
                "pnl_impact": -8500.0,
            }
        ],
    )


@pytest.fixture
def accurate_report() -> InsightReport:
    return InsightReport(
        overall_summary="The trader took 25 total trades with a win rate of 44.0% resulting in net loss of ₹14,500.",
        discipline_grade="C",
        discipline_score=68,
        top_leaks=[
            LeakDiagnosis(
                leak_type="RE_ENTRY_TILT",
                severity="HIGH",
                title="Rapid Re-Entry Tilt",
                diagnosis="Re-entering immediately after losses contributed ₹8,500 in avoidable drawdown across 5 trades.",
                evidence="5 re-entry trades caused ₹8,500 in losses while maximum losing streak reached 4 consecutive trades.",
            )
        ],
        suggested_rules=[
            SuggestedRuleRecommendation(
                rule_id="COOL_OFF_AFTER_LOSS",
                rule_name="Cool-Off Window After Loss",
                rationale="Impose a mandatory 30 minute cool-off window to halt revenge trading impulses.",
                recommended_parameters={"cooldown_minutes": 30},
            )
        ],
        provider_used="GEMINI_FLASH",
    )


# 1. Grounding Validation Unit Tests


def test_grounding_passes_for_accurate_metrics(sample_request: InsightRequest, accurate_report: InsightReport) -> None:
    """Verifies that an AI report quoting real numbers passes grounding validation."""
    result = GroundingValidator.validate_report(accurate_report, sample_request, tolerance=0.02)
    assert result.is_valid is True
    assert len(result.discrepancies) == 0
    assert result.rejection_reason is None
    # 25, 44.0, 14500, 8500, 5, 4, 30 should all be recognized
    assert len(result.extracted_numbers) > 0


def test_grounding_tolerance_two_percent(sample_request: InsightRequest) -> None:
    """Tests that numbers within 2% margin pass, while >2% discrepancy is rejected."""
    # 44.0% actual win rate.
    # Claiming 44.5% -> relative error is 0.5/44.0 = 1.13% (< 2% margin) -> PASS
    close_report = InsightReport(
        overall_summary="Win rate was roughly 44.5% across 25 trades.",
        discipline_grade="B",
        discipline_score=68,
        top_leaks=[],
        suggested_rules=[],
    )
    result_close = GroundingValidator.validate_report(close_report, sample_request, tolerance=0.02)
    assert result_close.is_valid is True

    # Claiming 46.0% -> relative error is 2.0/44.0 = 4.54% (> 2% margin) -> FAIL
    far_report = InsightReport(
        overall_summary="Win rate was around 46.0% across 25 trades.",
        discipline_grade="B",
        discipline_score=68,
        top_leaks=[],
        suggested_rules=[],
    )
    result_far = GroundingValidator.validate_report(far_report, sample_request, tolerance=0.02)
    assert result_far.is_valid is False
    assert len(result_far.discrepancies) > 0
    assert "46.0" in result_far.discrepancies[0] or "46" in result_far.discrepancies[0]


def test_grounding_rejects_hallucinated_figures(sample_request: InsightRequest) -> None:
    """Confirms that fabricated financial figures trigger grounding rejection."""
    hallucinated_report = InsightReport(
        overall_summary="The trader lost ₹95,000 across their session.",
        discipline_grade="F",
        discipline_score=30,
        top_leaks=[
            LeakDiagnosis(
                leak_type="OVERTRADING",
                severity="CRITICAL",
                title="Massive Overtrading",
                diagnosis="You lost ₹95,000 due to uncontrolled sizing.",
                evidence="Loss was ₹95,000 on the day.",
            )
        ],
        suggested_rules=[],
    )
    result = GroundingValidator.validate_report(hallucinated_report, sample_request, tolerance=0.02)
    assert result.is_valid is False
    assert result.rejection_reason is not None
    assert any("95000" in d for d in result.discrepancies)


def test_grounding_allows_catalog_rule_constants(sample_request: InsightRequest) -> None:
    """Ensures standard catalog constants (e.g. 15, 30 min cool off, 3 max trades) are not flagged."""
    catalog_report = InsightReport(
        overall_summary="Execution discipline audit completed.",
        discipline_grade="B",
        discipline_score=75,
        top_leaks=[],
        suggested_rules=[
            SuggestedRuleRecommendation(
                rule_id="MAX_DAILY_TRADES_LIMIT",
                rule_name="Max Daily Trades Limit",
                rationale="Cap execution to at most 3 trades per market session.",
                recommended_parameters={"max_trades": 3},
            ),
            SuggestedRuleRecommendation(
                rule_id="COOL_OFF_AFTER_LOSS",
                rule_name="Cool-Off Window",
                rationale="Take a 15 minute breather after any losing trade.",
                recommended_parameters={"cooldown_minutes": 15},
            ),
        ],
    )
    result = GroundingValidator.validate_report(catalog_report, sample_request)
    assert result.is_valid is True
    assert len(result.discrepancies) == 0


def test_grounding_indian_currency_and_lakhs() -> None:
    """Verifies that currency in Lakhs (e.g. 1.5 Lakh) and commas are extracted and parsed accurately."""
    text = "The trader sustained an overall net loss of 1.5 Lakh (₹1,50,000) during market hours 09:15 to 15:30 in 2026."
    numbers = GroundingValidator.extract_numbers_from_text(text)
    # Should extract 150000.0 from both 1.5 Lakh and ₹1,50,000
    assert 150_000.0 in numbers
    # Should ignore 2026 (year) and 09:15 / 15:30 (hours)
    assert 2026.0 not in numbers


# 2. Caching and Rate Limiting Unit Tests


def test_stats_hash_is_deterministic(sample_request: InsightRequest) -> None:
    """Confirms that stats_hash produces identical fingerprints regardless of key ordering."""
    hash1 = compute_stats_hash("user-1", sample_request)

    dict_reordered = {
        "identified_leaks": sample_request.identified_leaks,
        "max_consecutive_losses": sample_request.max_consecutive_losses,
        "discipline_score": sample_request.discipline_score,
        "total_net_pnl": sample_request.total_net_pnl,
        "win_rate": sample_request.win_rate,
        "total_trades": sample_request.total_trades,
        "max_drawdown_inr": sample_request.max_drawdown_inr,
        "profit_factor": sample_request.profit_factor,
        "expectancy_inr": sample_request.expectancy_inr,
    }
    hash2 = compute_stats_hash("user-1", dict_reordered)

    assert hash1 == hash2
    assert hash1.startswith("user-1:")


def test_daily_rate_limiter() -> None:
    """Verifies daily quota enforcement and limit capping."""
    limiter = DailyRateLimiter(max_daily_calls=3)
    user = "trader-quota-test"
    limiter.reset(user)

    assert limiter.check_and_increment(user) is True
    assert limiter.check_and_increment(user) is True
    assert limiter.check_and_increment(user) is True
    # 4th call exceeds quota of 3
    assert limiter.check_and_increment(user) is False
    assert limiter.get_usage(user) == 3


@pytest.mark.asyncio
async def test_insight_cache_in_memory(accurate_report: InsightReport) -> None:
    """Tests setting and getting from in-memory cache layer."""
    cache = InsightCache()
    cache.clear()
    key = "user-1:abc123hash"

    assert cache.get_memory(key) is None

    cache.set_memory(key, accurate_report)
    retrieved = cache.get_memory(key)

    assert retrieved is not None
    assert retrieved.cached is True
    assert retrieved.stats_hash == key
    assert retrieved.discipline_grade == accurate_report.discipline_grade


# 3. Router Integration Tests (FastAPI Endpoint)


def test_router_integration_cache_hit(sample_request: InsightRequest) -> None:
    """Verifies that the first endpoint call executes, while the second returns cached result."""
    cache = get_insight_cache()
    cache.clear()

    payload = sample_request.model_dump()

    # Call 1: Misses cache -> generates fresh report
    resp1 = client.post("/api/v1/ai/insights", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["cached"] is False
    assert data1["stats_hash"] is not None
    assert data1["grounding_verified"] is True

    # Call 2: Hits cache -> returns cached report with cached=True
    resp2 = client.post("/api/v1/ai/insights", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["cached"] is True
    assert data2["stats_hash"] == data1["stats_hash"]
    assert data2["discipline_score"] == data1["discipline_score"]


def test_router_integration_rate_limit_exceeded(sample_request: InsightRequest) -> None:
    """Verifies that exceeding 20 daily requests returns HTTP 429 Too Many Requests."""
    rate_limiter = get_rate_limiter()
    unique_user = "user-rate-limit-test-429"
    rate_limiter.reset(unique_user)

    # Artificially set usage to max limit
    for _ in range(20):
        rate_limiter.check_and_increment(unique_user)

    payload = sample_request.model_dump()
    payload["user_id"] = unique_user

    # Request with bypass_cache=true to trigger rate limiter
    resp = client.post("/api/v1/ai/insights?bypass_cache=true", json=payload)
    assert resp.status_code == 429
    assert "Daily AI behavioral insights limit exceeded" in resp.json()["detail"]


@patch.object(AIClient, "generate_insights")
def test_router_integration_hallucination_triggers_fallback(
    mock_generate: AsyncMock,
    sample_request: InsightRequest,
) -> None:
    """Verifies that if an LLM returns hallucinated figures, the endpoint automatically falls back."""
    cache = get_insight_cache()
    cache.clear()

    # Mock an AI report with heavily hallucinated loss numbers
    mock_generate.return_value = InsightReport(
        overall_summary="Trader lost ₹850,000 with a win rate of 98.5%.",
        discipline_grade="A",
        discipline_score=95,
        top_leaks=[
            LeakDiagnosis(
                leak_type="TILT",
                severity="CRITICAL",
                title="Fake Leak",
                diagnosis="Fabricated diagnosis with ₹850,000 loss.",
                evidence="Invented ₹850,000 loss figure.",
            )
        ],
        suggested_rules=[],
        provider_used="GEMINI_FLASH",
    )

    payload = sample_request.model_dump()
    payload["user_id"] = "hallucination-test-user"

    resp = client.post("/api/v1/ai/insights", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    # The hallucinated report must be rejected and replaced by deterministic engine
    assert data["provider_used"] == "FREE_DETERMINISTIC"
    assert data["grounding_verified"] is True
    # Real numbers from sample_request (44.0% win rate or -14500.0 P&L) should be used
    assert "850,000" not in data["overall_summary"]
