"""Unit and Integration Tests for TradeLens Free-Tier AI Insights Pipeline."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.ai.client import AIClient
from app.ai.prompts import SYSTEM_PROMPT, build_insight_user_prompt
from app.ai.schemas import InsightReport, InsightRequest
from app.main import app


@pytest.fixture
def sample_tilt_request() -> InsightRequest:
    return InsightRequest(
        total_trades=24,
        win_rate=58.33,
        total_net_pnl=18500.0,
        profit_factor=1.75,
        expectancy_inr=770.83,
        max_drawdown_inr=9200.0,
        max_consecutive_losses=3,
        discipline_score=68,
        identified_leaks=[
            {
                "leak_type": "RE_ENTRY_TILT",
                "severity": "CRITICAL",
                "re_entry_count": 4,
                "pnl_impact_inr": 8200.0,
            },
            {
                "leak_type": "OVERTRADING",
                "severity": "HIGH",
                "overtrading_days_count": 2,
                "pnl_impact_inr": 4300.0,
            },
        ],
    )


@pytest.fixture
def pristine_request() -> InsightRequest:
    return InsightRequest(
        total_trades=30,
        win_rate=70.0,
        total_net_pnl=54000.0,
        profit_factor=3.1,
        expectancy_inr=1800.0,
        max_drawdown_inr=4000.0,
        max_consecutive_losses=1,
        discipline_score=94,
        identified_leaks=[],
    )


@pytest.mark.asyncio
async def test_deterministic_free_fallback_generates_valid_report(
    sample_tilt_request: InsightRequest,
) -> None:
    client = AIClient(provider="deterministic")
    report = await client.generate_insights(sample_tilt_request)

    assert isinstance(report, InsightReport)
    assert report.discipline_grade == "C"  # Score is 68 -> C
    assert report.discipline_score == 68
    assert report.provider_used == "FREE_DETERMINISTIC"
    assert len(report.top_leaks) == 2

    # Verify Tilt diagnosis
    tilt_leak = report.top_leaks[0]
    assert tilt_leak.leak_type == "RE_ENTRY_TILT"
    assert tilt_leak.severity == "CRITICAL"
    assert "8,200.00" in tilt_leak.evidence

    # Verify Cool-off rule recommendation
    cool_off_rule = next(r for r in report.suggested_rules if r.rule_id == "COOL_OFF_AFTER_LOSS")
    assert cool_off_rule.rule_name == "15-Minute Mandatory Cooldown After Loss"
    assert "cooldown_minutes" in cool_off_rule.recommended_parameters

    # Verify Overtrading rule
    trade_cap_rule = next(r for r in report.suggested_rules if r.rule_id == "MAX_DAILY_TRADES_LIMIT")
    assert trade_cap_rule.rule_name == "Intraday Trade Frequency Cap (5 Trades Max)"

    # Verify educational disclaimer
    assert "DISCLAIMER" in report.educational_disclaimer
    assert "financial advice" in report.educational_disclaimer


@pytest.mark.asyncio
async def test_pristine_journal_receives_grade_a(pristine_request: InsightRequest) -> None:
    client = AIClient(provider="deterministic")
    report = await client.generate_insights(pristine_request)

    assert report.discipline_grade == "A+"
    assert report.discipline_score == 94
    assert len(report.top_leaks) == 1
    assert report.top_leaks[0].leak_type == "GENERAL_DISCIPLINE"


def test_system_prompt_enforces_anti_advice_guardrails() -> None:
    # Strict anti-advice directives
    assert "NEVER predict future stock or index prices" in SYSTEM_PROMPT
    assert "NEVER recommend buying, selling, holding" in SYSTEM_PROMPT
    assert "NEVER provide investment, financial" in SYSTEM_PROMPT
    assert "DISCLAIMER" in SYSTEM_PROMPT


def test_user_prompt_serializes_only_aggregate_stats(sample_tilt_request: InsightRequest) -> None:
    prompt = build_insight_user_prompt(sample_tilt_request)

    # Contains summary numbers
    assert "18500.0" in prompt
    assert "58.33" in prompt
    assert "RE_ENTRY_TILT" in prompt

    # Must NOT contain personal fill/order references
    assert "order_id" not in prompt
    assert "account_id" not in prompt


def test_clean_and_parse_json_strips_markdown_code_fences() -> None:
    client = AIClient()

    # Raw clean JSON
    clean = '{"overall_summary": "Good", "discipline_grade": "A", "discipline_score": 85, "top_leaks": [], "suggested_rules": [], "educational_disclaimer": "test"}'
    parsed1 = client._clean_and_parse_json(clean)
    assert parsed1["discipline_score"] == 85

    # Markdown wrapped ```json ... ```
    wrapped = f"```json\n{clean}\n```"
    parsed2 = client._clean_and_parse_json(wrapped)
    assert parsed2["discipline_score"] == 85

    # Markdown wrapped without json specifier ``` ... ```
    wrapped_plain = f"```\n{clean}\n```"
    parsed3 = client._clean_and_parse_json(wrapped_plain)
    assert parsed3["discipline_score"] == 85


def test_fastapi_ai_insights_endpoint(sample_tilt_request: InsightRequest) -> None:
    client = TestClient(app)
    response = client.post("/api/v1/ai/insights", json=sample_tilt_request.model_dump())

    assert response.status_code == 200
    data = response.json()

    assert data["discipline_score"] == 68
    assert data["discipline_grade"] == "C"
    assert len(data["top_leaks"]) == 2
    assert data["provider_used"] == "FREE_DETERMINISTIC"
    assert "DISCLAIMER" in data["educational_disclaimer"]


def test_anthropic_provider_resolution() -> None:
    """Verifies that providing anthropic_api_key resolves provider to anthropic."""
    client = AIClient(anthropic_api_key="sk-ant-test-key")
    assert client._resolve_provider() == "anthropic"


@pytest.mark.asyncio
async def test_anthropic_mock_call(sample_tilt_request: InsightRequest) -> None:
    """Verifies that _call_anthropic formats request and validates Claude JSON response."""
    client = AIClient(anthropic_api_key="sk-ant-test-key")
    mock_payload = {
        "content": [
            {
                "text": json.dumps({
                    "overall_summary": "Disciplined execution observed.",
                    "discipline_grade": "B",
                    "discipline_score": 75,
                    "top_leaks": [],
                    "suggested_rules": [],
                    "educational_disclaimer": "Educational only",
                })
            }
        ]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        report = await client._call_anthropic(sample_tilt_request)
        assert report.provider_used == "ANTHROPIC_CLAUDE_3.5_SONNET"
        assert report.discipline_score == 75
        assert report.discipline_grade == "B"
