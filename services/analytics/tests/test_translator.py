"""Tests for TradeLens Natural Language to JSON Rule Translator (Task 20)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.rules.translator import (
    TranslateRuleRequest,
    TranslateRuleResponse,
    translate_rule_text,
)


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient fixture."""
    return TestClient(app)


class TestDeterministicRuleTranslator:
    """Unit tests for deterministic pattern matching and translation."""

    @pytest.mark.asyncio
    async def test_translate_cool_off_after_loss(self) -> None:
        prompt = "Don't let me trade for 20 minutes after losing money"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "COOL_OFF_AFTER_LOSS"
        assert res.rule is not None
        assert res.rule["cooldown_minutes"] == 20
        assert res.rule["max_consecutive_losses"] == 1

    @pytest.mark.asyncio
    async def test_translate_cool_off_with_loss_threshold(self) -> None:
        prompt = "Pause for 45 mins if I lose more than 3000 rupees"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "COOL_OFF_AFTER_LOSS"
        assert res.rule is not None
        assert res.rule["cooldown_minutes"] == 45
        assert res.rule["trigger_loss_inr"] == 3000.0

    @pytest.mark.asyncio
    async def test_translate_max_consecutive_losses_halt(self) -> None:
        prompt = "Stop me for the day after 3 consecutive red trades"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "MAX_CONSECUTIVE_LOSSES"
        assert res.rule is not None
        assert res.rule["consecutive_losses"] == 3
        assert res.rule["action"] == "HALT_FOR_DAY"

    @pytest.mark.asyncio
    async def test_translate_daily_loss_rupee_limit(self) -> None:
        prompt = "Cap my daily loss at 5000 rs"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "DAILY_LOSS_LIMIT"
        assert res.rule is not None
        assert res.rule["max_loss_inr"] == 5000.0
        assert res.rule["action"] == "HALT_FOR_DAY"

    @pytest.mark.asyncio
    async def test_translate_daily_loss_percent_capital(self) -> None:
        prompt = "Don't allow more than 2% daily loss on 2 lakh capital"
        res = await translate_rule_text(prompt, starting_capital=200000.0)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "DAILY_LOSS_LIMIT"
        assert res.rule is not None
        assert res.rule["max_loss_percent_capital"] == 2.0
        assert res.rule["starting_capital"] == 200000.0

    @pytest.mark.asyncio
    async def test_translate_max_daily_trades(self) -> None:
        prompt = "Limit me to 5 trades maximum each day"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "MAX_DAILY_TRADES_LIMIT"
        assert res.rule is not None
        assert res.rule["max_trades"] == 5

    @pytest.mark.asyncio
    async def test_translate_time_of_day_cutoff(self) -> None:
        prompt = "Only trade between 9:30 AM and 2:30 PM, avoid lunch"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "TIME_OF_DAY_CUTOFF"
        assert res.rule is not None
        assert res.rule["allowed_start_time"] == "09:30"
        assert res.rule["allowed_end_time"] == "14:30"
        assert res.rule["restricted_lunch_break"] is True

    @pytest.mark.asyncio
    async def test_translate_max_position_size_lots(self) -> None:
        prompt = "Max 2 lots per trade on BankNifty options"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "MAX_POSITION_SIZE"
        assert res.rule is not None
        assert res.rule["max_lots"] == 2
        assert res.rule["segment"] == "FNO"

    @pytest.mark.asyncio
    async def test_translate_skip_instrument_type(self) -> None:
        prompt = "No options buying allowed"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "SKIP_INSTRUMENT_TYPE"
        assert res.rule is not None
        assert "OPTIONS_BUY" in res.rule["disallowed_types"]

    @pytest.mark.asyncio
    async def test_translate_no_trading_expiry_day(self) -> None:
        prompt = "Don't trade on Thursdays on Nifty expiry"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "NO_TRADING_ON_EXPIRY_DAY"
        assert res.rule is not None
        assert res.rule["action"] == "HALT_FOR_DAY"
        assert "NIFTY" in res.rule["affected_indices"]

    @pytest.mark.asyncio
    async def test_translate_composite_multi_clause(self) -> None:
        prompt = "Max 4 trades a day and 30 min cooldown after any loss"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is True
        assert res.rule_type == "COMPOSITE_RULE"
        assert res.rule is not None
        assert res.rule["conjunction"] == "AND"
        assert len(res.rule["rules"]) == 2
        types = [r["rule_type"] for r in res.rule["rules"]]
        assert "MAX_DAILY_TRADES_LIMIT" in types
        assert "COOL_OFF_AFTER_LOSS" in types

    @pytest.mark.asyncio
    async def test_short_prompt_rejected(self) -> None:
        res = await translate_rule_text("hi")
        assert res.success is False
        assert res.is_supported is False
        assert "too short" in res.explanation


class TestUnsupportedConceptRejections:
    """Verifies that technical analysis, price forecasts, and tips are rejected."""

    @pytest.mark.asyncio
    async def test_reject_moving_average_crossover(self) -> None:
        prompt = "Buy call options when 20 EMA crosses 50 EMA on 5 min chart"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is False
        assert res.rule is None
        assert res.unsupported_reason is not None
        assert "Technical analysis indicators" in res.unsupported_reason or "crossover" in res.unsupported_reason.lower()

    @pytest.mark.asyncio
    async def test_reject_rsi_indicator(self) -> None:
        prompt = "Don't trade when RSI is above 70 or below 30"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is False
        assert res.rule is None
        assert res.unsupported_reason is not None
        assert "RSI" in res.unsupported_reason

    @pytest.mark.asyncio
    async def test_reject_price_prediction(self) -> None:
        prompt = "Predict tomorrow BankNifty open price and give target"
        res = await translate_rule_text(prompt)

        assert res.success is True
        assert res.is_supported is False
        assert res.rule is None
        assert res.unsupported_reason is not None
        assert "predict" in res.unsupported_reason.lower()


class TestFastAPIRulesEndpoints:
    """Integration tests for the /api/v1/rules FastAPI router."""

    def test_post_translate_valid_rule(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/rules/translate",
            json={
                "prompt": "Cap my daily loss at 4000 rs",
                "starting_capital": 100000.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["is_supported"] is True
        assert data["rule_type"] == "DAILY_LOSS_LIMIT"
        assert data["rule"]["max_loss_inr"] == 4000.0

    def test_post_translate_unsupported_concept(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/rules/translate",
            json={"prompt": "Give me stock tips and buy signal on Reliance"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["is_supported"] is False
        assert data["rule"] is None
        assert data["unsupported_reason"] is not None

    def test_get_catalog_manifest(self, client: TestClient) -> None:
        response = client.get("/api/v1/rules/catalog")
        assert response.status_code == 200
        manifest = response.json()
        assert len(manifest) == 9
        rule_types = [item["rule_type"] for item in manifest]
        assert "COOL_OFF_AFTER_LOSS" in rule_types
        assert "COMPOSITE_RULE" in rule_types

    def test_post_validate_valid_payload(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/rules/validate",
            json={
                "rule_type": "COOL_OFF_AFTER_LOSS",
                "cooldown_minutes": 30,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is True
        assert data["rule_type"] == "COOL_OFF_AFTER_LOSS"

    def test_post_validate_invalid_payload(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/rules/validate",
            json={
                "rule_type": "COOL_OFF_AFTER_LOSS",
                "cooldown_minutes": -5,  # Out of bounds
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is False
        assert len(data["errors"]) > 0
