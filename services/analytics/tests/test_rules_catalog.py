"""Tests for TradeLens Fixed Rule Catalog and Validator (Task 19)."""

import pytest
from pydantic import ValidationError

from app.rules.catalog import (
    APPROVED_RULE_TYPES,
    CompositeRule,
    CoolOffAfterLossRule,
    DailyLossLimitRule,
    MaxConsecutiveLossesRule,
    MaxDailyTradesLimitRule,
    MaxPositionSizeRule,
    NoTradingOnExpiryDayRule,
    SkipInstrumentTypeRule,
    TimeOfDayCutoffRule,
)
from app.rules.registry import (
    RULE_CATALOG_REGISTRY,
    get_catalog_manifest,
    get_rule_catalog_item,
)
from app.rules.validator import (
    RuleCatalogValidationError,
    parse_rule,
    serialize_rule,
    validate_rule,
)


class TestCoolOffAfterLossRule:
    """Tests for Rule 1: COOL_OFF_AFTER_LOSS."""

    def test_valid_default(self) -> None:
        rule = CoolOffAfterLossRule()
        assert rule.rule_type == "COOL_OFF_AFTER_LOSS"
        assert rule.cooldown_minutes == 15
        assert rule.max_consecutive_losses == 1
        assert rule.trigger_loss_inr is None

    def test_valid_custom_parameters(self) -> None:
        rule = CoolOffAfterLossRule(
            cooldown_minutes=45,
            trigger_loss_inr=2500.0,
            max_consecutive_losses=2,
        )
        assert rule.cooldown_minutes == 45
        assert rule.trigger_loss_inr == 2500.0
        assert rule.max_consecutive_losses == 2

    def test_boundary_cooldown_minutes(self) -> None:
        # Min boundary (1)
        assert CoolOffAfterLossRule(cooldown_minutes=1).cooldown_minutes == 1
        # Max boundary (240)
        assert CoolOffAfterLossRule(cooldown_minutes=240).cooldown_minutes == 240

        # Out of bounds (< 1)
        with pytest.raises(ValidationError):
            CoolOffAfterLossRule(cooldown_minutes=0)

        # Out of bounds (> 240)
        with pytest.raises(ValidationError):
            CoolOffAfterLossRule(cooldown_minutes=241)

    def test_invalid_trigger_loss_negative(self) -> None:
        with pytest.raises(ValidationError):
            CoolOffAfterLossRule(trigger_loss_inr=-100.0)

    def test_forbid_extra_fields(self) -> None:
        with pytest.raises(ValidationError):
            CoolOffAfterLossRule.model_validate(
                {"rule_type": "COOL_OFF_AFTER_LOSS", "unexpected_param": "bad"}
            )


class TestMaxConsecutiveLossesRule:
    """Tests for Rule 2: MAX_CONSECUTIVE_LOSSES."""

    def test_valid_default(self) -> None:
        rule = MaxConsecutiveLossesRule()
        assert rule.rule_type == "MAX_CONSECUTIVE_LOSSES"
        assert rule.consecutive_losses == 3
        assert rule.action == "HALT_FOR_DAY"

    def test_valid_mandatory_cooldown(self) -> None:
        rule = MaxConsecutiveLossesRule(
            consecutive_losses=2,
            action="MANDATORY_COOLDOWN",
            cooldown_minutes=45,
        )
        assert rule.action == "MANDATORY_COOLDOWN"
        assert rule.cooldown_minutes == 45

    def test_missing_cooldown_for_mandatory_cooldown_action(self) -> None:
        with pytest.raises(ValidationError) as exc:
            MaxConsecutiveLossesRule(action="MANDATORY_COOLDOWN", cooldown_minutes=None)
        assert "cooldown_minutes is required" in str(exc.value)

    def test_boundary_consecutive_losses(self) -> None:
        assert MaxConsecutiveLossesRule(consecutive_losses=1).consecutive_losses == 1
        assert MaxConsecutiveLossesRule(consecutive_losses=10).consecutive_losses == 10

        with pytest.raises(ValidationError):
            MaxConsecutiveLossesRule(consecutive_losses=0)

        with pytest.raises(ValidationError):
            MaxConsecutiveLossesRule(consecutive_losses=11)


class TestDailyLossLimitRule:
    """Tests for Rule 3: DAILY_LOSS_LIMIT."""

    def test_valid_rupee_limit(self) -> None:
        rule = DailyLossLimitRule(max_loss_inr=5000.0)
        assert rule.max_loss_inr == 5000.0
        assert rule.action == "HALT_FOR_DAY"

    def test_valid_percent_limit(self) -> None:
        rule = DailyLossLimitRule(
            max_loss_percent_capital=3.0,
            starting_capital=100000.0,
        )
        assert rule.max_loss_percent_capital == 3.0
        assert rule.starting_capital == 100000.0

    def test_percent_limit_without_starting_capital_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            DailyLossLimitRule(max_loss_percent_capital=2.0)
        assert "starting_capital' is required" in str(exc.value)

    def test_neither_threshold_specified_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            DailyLossLimitRule()
        assert "At least one of 'max_loss_inr' or 'max_loss_percent_capital'" in str(exc.value)

    def test_boundary_percent_limits(self) -> None:
        # Min boundary 0.1%
        assert (
            DailyLossLimitRule(
                max_loss_percent_capital=0.1, starting_capital=50000.0
            ).max_loss_percent_capital
            == 0.1
        )
        # Max boundary 25.0%
        assert (
            DailyLossLimitRule(
                max_loss_percent_capital=25.0, starting_capital=50000.0
            ).max_loss_percent_capital
            == 25.0
        )

        with pytest.raises(ValidationError):
            DailyLossLimitRule(max_loss_percent_capital=0.05, starting_capital=50000.0)

        with pytest.raises(ValidationError):
            DailyLossLimitRule(max_loss_percent_capital=25.1, starting_capital=50000.0)


class TestMaxDailyTradesLimitRule:
    """Tests for Rule 4: MAX_DAILY_TRADES_LIMIT."""

    def test_valid_default(self) -> None:
        rule = MaxDailyTradesLimitRule()
        assert rule.rule_type == "MAX_DAILY_TRADES_LIMIT"
        assert rule.max_trades == 5
        assert rule.action == "HALT_FOR_DAY"

    def test_boundaries(self) -> None:
        assert MaxDailyTradesLimitRule(max_trades=1).max_trades == 1
        assert MaxDailyTradesLimitRule(max_trades=100).max_trades == 100

        with pytest.raises(ValidationError):
            MaxDailyTradesLimitRule(max_trades=0)

        with pytest.raises(ValidationError):
            MaxDailyTradesLimitRule(max_trades=101)


class TestTimeOfDayCutoffRule:
    """Tests for Rule 5: TIME_OF_DAY_CUTOFF."""

    def test_valid_session(self) -> None:
        rule = TimeOfDayCutoffRule(
            allowed_start_time="09:15",
            allowed_end_time="15:15",
            restricted_lunch_break=True,
        )
        assert rule.allowed_start_time == "09:15"
        assert rule.allowed_end_time == "15:15"
        assert rule.restricted_lunch_break is True

    def test_invalid_time_format(self) -> None:
        with pytest.raises(ValidationError):
            TimeOfDayCutoffRule(allowed_start_time="9:15")  # Missing leading zero

        with pytest.raises(ValidationError):
            TimeOfDayCutoffRule(allowed_end_time="24:00")  # Invalid hour

        with pytest.raises(ValidationError):
            TimeOfDayCutoffRule(allowed_end_time="15:60")  # Invalid minute

        with pytest.raises(ValidationError):
            TimeOfDayCutoffRule(allowed_start_time="morning")

    def test_inverted_time_window_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            TimeOfDayCutoffRule(allowed_start_time="15:30", allowed_end_time="09:15")
        assert "must be strictly earlier than allowed_end_time" in str(exc.value)

    def test_equal_start_end_time_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            TimeOfDayCutoffRule(allowed_start_time="11:00", allowed_end_time="11:00")
        assert "must be strictly earlier than allowed_end_time" in str(exc.value)


class TestMaxPositionSizeRule:
    """Tests for Rule 6: MAX_POSITION_SIZE."""

    def test_valid_configurations(self) -> None:
        # Quantity only
        r1 = MaxPositionSizeRule(max_quantity=500, segment="EQUITY")
        assert r1.max_quantity == 500
        assert r1.segment == "EQUITY"

        # Lots only
        r2 = MaxPositionSizeRule(max_lots=3, segment="FNO")
        assert r2.max_lots == 3

        # Capital only
        r3 = MaxPositionSizeRule(max_capital_per_trade_inr=50000.0)
        assert r3.max_capital_per_trade_inr == 50000.0

    def test_no_threshold_specified_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            MaxPositionSizeRule()
        assert "At least one of 'max_quantity', 'max_lots', or 'max_capital_per_trade_inr'" in str(
            exc.value
        )

    def test_boundary_lots(self) -> None:
        assert MaxPositionSizeRule(max_lots=1).max_lots == 1
        assert MaxPositionSizeRule(max_lots=500).max_lots == 500

        with pytest.raises(ValidationError):
            MaxPositionSizeRule(max_lots=0)

        with pytest.raises(ValidationError):
            MaxPositionSizeRule(max_lots=501)


class TestSkipInstrumentTypeRule:
    """Tests for Rule 7: SKIP_INSTRUMENT_TYPE."""

    def test_valid_types(self) -> None:
        rule = SkipInstrumentTypeRule(disallowed_types=["OPTIONS_BUY", "FUTURES"])
        assert rule.disallowed_types == ["OPTIONS_BUY", "FUTURES"]

    def test_empty_disallowed_types_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SkipInstrumentTypeRule(disallowed_types=[])

    def test_duplicate_types_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            SkipInstrumentTypeRule(disallowed_types=["OPTIONS_BUY", "OPTIONS_BUY"])
        assert "duplicate entries" in str(exc.value)

    def test_unknown_instrument_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SkipInstrumentTypeRule(disallowed_types=["CRYPTO_PERP"])  # type: ignore[list-item]


class TestNoTradingOnExpiryDayRule:
    """Tests for Rule 8: NO_TRADING_ON_EXPIRY_DAY."""

    def test_valid_halt_action(self) -> None:
        rule = NoTradingOnExpiryDayRule(
            action="HALT_FOR_DAY",
            affected_indices=["NIFTY", "BANKNIFTY"],
        )
        assert rule.action == "HALT_FOR_DAY"
        assert rule.affected_indices == ["NIFTY", "BANKNIFTY"]

    def test_valid_cap_lots_action(self) -> None:
        rule = NoTradingOnExpiryDayRule(
            action="CAP_LOTS",
            max_lots=2,
            affected_indices=["ALL"],
        )
        assert rule.action == "CAP_LOTS"
        assert rule.max_lots == 2

    def test_missing_max_lots_for_cap_lots_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            NoTradingOnExpiryDayRule(action="CAP_LOTS", max_lots=None)
        assert "'max_lots' is required when action is 'CAP_LOTS'" in str(exc.value)

    def test_boundary_max_lots(self) -> None:
        assert NoTradingOnExpiryDayRule(action="CAP_LOTS", max_lots=1).max_lots == 1
        assert NoTradingOnExpiryDayRule(action="CAP_LOTS", max_lots=50).max_lots == 50

        with pytest.raises(ValidationError):
            NoTradingOnExpiryDayRule(action="CAP_LOTS", max_lots=0)

        with pytest.raises(ValidationError):
            NoTradingOnExpiryDayRule(action="CAP_LOTS", max_lots=51)


class TestCompositeRule:
    """Tests for Rule 9: COMPOSITE_RULE."""

    def test_valid_composite_two_rules(self) -> None:
        rule = CompositeRule(
            name="Conservative Shield",
            rules=[
                CoolOffAfterLossRule(cooldown_minutes=20),
                MaxDailyTradesLimitRule(max_trades=4),
            ],
        )
        assert rule.rule_type == "COMPOSITE_RULE"
        assert rule.conjunction == "AND"
        assert len(rule.rules) == 2
        assert rule.rules[0].rule_type == "COOL_OFF_AFTER_LOSS"
        assert rule.rules[1].rule_type == "MAX_DAILY_TRADES_LIMIT"

    def test_fewer_than_two_subrules_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CompositeRule(
                name="Too Small",
                rules=[CoolOffAfterLossRule()],
            )

    def test_more_than_six_subrules_rejected(self) -> None:
        with pytest.raises(ValidationError):
            CompositeRule(
                name="Too Big",
                rules=[
                    CoolOffAfterLossRule(),
                    MaxConsecutiveLossesRule(),
                    DailyLossLimitRule(max_loss_inr=5000),
                    MaxDailyTradesLimitRule(),
                    TimeOfDayCutoffRule(),
                    MaxPositionSizeRule(max_lots=2),
                    SkipInstrumentTypeRule(disallowed_types=["OPTIONS_BUY"]),
                ],
            )

    def test_duplicate_subrule_types_rejected(self) -> None:
        with pytest.raises(ValidationError) as exc:
            CompositeRule(
                name="Duplicate Tilt Rules",
                rules=[
                    CoolOffAfterLossRule(cooldown_minutes=15),
                    CoolOffAfterLossRule(cooldown_minutes=30),
                ],
            )
        assert "duplicate sub-rule types" in str(exc.value)


class TestValidatorEngine:
    """Tests for validate_rule, parse_rule, and serialize_rule."""

    def test_validate_valid_payload(self) -> None:
        payload = {
            "rule_type": "COOL_OFF_AFTER_LOSS",
            "cooldown_minutes": 25,
            "max_consecutive_losses": 1,
        }
        res = validate_rule(payload)
        assert res.is_valid is True
        assert res.rule is not None
        assert res.rule.rule_type == "COOL_OFF_AFTER_LOSS"
        assert res.errors == []
        assert res.error_summary is None

    def test_validate_invalid_payload_returns_errors(self) -> None:
        payload = {
            "rule_type": "COOL_OFF_AFTER_LOSS",
            "cooldown_minutes": -5,  # Invalid
        }
        res = validate_rule(payload)
        assert res.is_valid is False
        assert res.rule is None
        assert len(res.errors) > 0
        assert res.error_summary is not None
        assert "cooldown_minutes" in res.error_summary

    def test_validate_non_dict_payload(self) -> None:
        res = validate_rule("not a dict")  # type: ignore[arg-type]
        assert res.is_valid is False
        assert "must be a JSON object" in (res.error_summary or "")

    def test_validate_missing_rule_type(self) -> None:
        res = validate_rule({"cooldown_minutes": 15})
        assert res.is_valid is False
        assert "Missing" in (res.error_summary or "")

    def test_validate_uncataloged_rule_type(self) -> None:
        res = validate_rule({"rule_type": "AI_MARTINGALE_BOT", "multiplier": 2.0})
        assert res.is_valid is False
        assert "not recognized in TradeLens V1 catalog" in (res.error_summary or "")

    def test_parse_rule_success(self) -> None:
        rule = parse_rule({"rule_type": "MAX_DAILY_TRADES_LIMIT", "max_trades": 7})
        assert isinstance(rule, MaxDailyTradesLimitRule)
        assert rule.max_trades == 7

    def test_parse_rule_raises_custom_exception(self) -> None:
        with pytest.raises(RuleCatalogValidationError) as exc:
            parse_rule({"rule_type": "MAX_DAILY_TRADES_LIMIT", "max_trades": -1})
        assert "max_trades" in str(exc.value)
        assert len(exc.value.errors) > 0

    def test_serialize_rule_json_roundtrip(self) -> None:
        rule = TimeOfDayCutoffRule(allowed_start_time="09:30", allowed_end_time="14:30")
        serialized = serialize_rule(rule)
        assert serialized["rule_type"] == "TIME_OF_DAY_CUTOFF"
        assert serialized["allowed_start_time"] == "09:30"
        assert serialized["allowed_end_time"] == "14:30"

        # Roundtrip back through parse_rule
        reconstructed = parse_rule(serialized)
        assert reconstructed == rule

    def test_composite_rule_roundtrip_validation(self) -> None:
        composite_payload = {
            "rule_type": "COMPOSITE_RULE",
            "name": "Intraday Protection Shield",
            "conjunction": "AND",
            "rules": [
                {"rule_type": "COOL_OFF_AFTER_LOSS", "cooldown_minutes": 20},
                {"rule_type": "DAILY_LOSS_LIMIT", "max_loss_inr": 4000.0},
                {"rule_type": "MAX_DAILY_TRADES_LIMIT", "max_trades": 6},
            ],
        }
        res = validate_rule(composite_payload)
        assert res.is_valid is True
        assert res.rule is not None
        assert isinstance(res.rule, CompositeRule)
        assert len(res.rule.rules) == 3


class TestRuleRegistry:
    """Tests for metadata registry."""

    def test_all_approved_rules_registered(self) -> None:
        for rule_type in APPROVED_RULE_TYPES:
            assert rule_type in RULE_CATALOG_REGISTRY
            item = get_rule_catalog_item(rule_type)
            assert item is not None
            assert item.rule_type == rule_type
            assert len(item.name) > 0
            assert len(item.parameters) > 0
            # Validate default payload adheres to rule schema
            res = validate_rule(item.default_payload)
            assert res.is_valid is True, f"Default payload for {rule_type} failed validation: {res.error_summary}"

    def test_get_catalog_manifest_returns_all_nine(self) -> None:
        manifest = get_catalog_manifest()
        assert len(manifest) == 9
        rule_types = {item["rule_type"] for item in manifest}
        assert rule_types == set(APPROVED_RULE_TYPES)

    def test_get_uncataloged_item_returns_none(self) -> None:
        assert get_rule_catalog_item("NON_EXISTENT_RULE") is None
