"""TradeLens Trading Rule Catalog (Task 19).

Strict, deterministic Pydantic v2 schemas defining the 9 canonical trading guardrail rules
supported in TradeLens V1 for counter-factual backtesting, adherence monitoring,
and risk control.
"""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field, field_validator, model_validator

TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class BaseRuleModel(BaseModel):
    """Base model for all trading rules with strict configuration."""

    model_config = {
        "extra": "forbid",
        "frozen": False,
        "validate_assignment": True,
        "str_strip_whitespace": True,
    }


# ==============================================================================
# Rule 1: COOL_OFF_AFTER_LOSS
# ==============================================================================
class CoolOffAfterLossRule(BaseRuleModel):
    """Enforces a mandatory cooldown pause after experiencing a losing trade."""

    rule_type: Literal["COOL_OFF_AFTER_LOSS"] = "COOL_OFF_AFTER_LOSS"
    cooldown_minutes: int = Field(
        default=15,
        ge=1,
        le=240,
        description="Mandatory pause duration in minutes after a losing exit (1 to 240 mins)",
    )
    trigger_loss_inr: float | None = Field(
        default=None,
        gt=0,
        description="Optional minimum loss amount in INR required to trigger the cooldown",
    )
    max_consecutive_losses: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Number of consecutive losses required before cooldown activates",
    )


# ==============================================================================
# Rule 2: MAX_CONSECUTIVE_LOSSES
# ==============================================================================
class MaxConsecutiveLossesRule(BaseRuleModel):
    """Circuit breaker that triggers after reaching a streak of consecutive losing trades."""

    rule_type: Literal["MAX_CONSECUTIVE_LOSSES"] = "MAX_CONSECUTIVE_LOSSES"
    consecutive_losses: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Threshold of consecutive losses that triggers the circuit breaker (1 to 10)",
    )
    action: Literal["HALT_FOR_DAY", "MANDATORY_COOLDOWN"] = Field(
        default="HALT_FOR_DAY",
        description="Action to execute: completely halt trading for the remainder of the day, or impose a cooldown",
    )
    cooldown_minutes: int | None = Field(
        default=None,
        ge=15,
        le=240,
        description="Cooldown duration if action is MANDATORY_COOLDOWN (15 to 240 mins)",
    )

    @model_validator(mode="after")
    def validate_action_cooldown(self) -> MaxConsecutiveLossesRule:
        if self.action == "MANDATORY_COOLDOWN" and self.cooldown_minutes is None:
            raise ValueError("cooldown_minutes is required when action is 'MANDATORY_COOLDOWN'")
        return self


# ==============================================================================
# Rule 3: DAILY_LOSS_LIMIT
# ==============================================================================
class DailyLossLimitRule(BaseRuleModel):
    """Enforces a maximum realized daily loss limit (rupee cap or percentage of capital)."""

    rule_type: Literal["DAILY_LOSS_LIMIT"] = "DAILY_LOSS_LIMIT"
    max_loss_inr: float | None = Field(
        default=None,
        gt=0,
        description="Maximum allowed net loss for the day in Indian Rupees (INR)",
    )
    max_loss_percent_capital: float | None = Field(
        default=None,
        ge=0.1,
        le=25.0,
        description="Maximum allowed loss as a percentage of starting capital (0.1% to 25.0%)",
    )
    starting_capital: float | None = Field(
        default=None,
        gt=0,
        description="Starting capital baseline required if max_loss_percent_capital is specified",
    )
    action: Literal["HALT_FOR_DAY"] = Field(
        default="HALT_FOR_DAY",
        description="Halts all trading for the rest of the day once daily loss limit is breached",
    )

    @model_validator(mode="after")
    def validate_loss_thresholds(self) -> DailyLossLimitRule:
        if self.max_loss_inr is None and self.max_loss_percent_capital is None:
            raise ValueError("At least one of 'max_loss_inr' or 'max_loss_percent_capital' must be specified")
        if self.max_loss_percent_capital is not None and self.starting_capital is None:
            raise ValueError("'starting_capital' is required when 'max_loss_percent_capital' is specified")
        return self


# ==============================================================================
# Rule 4: MAX_DAILY_TRADES_LIMIT
# ==============================================================================
class MaxDailyTradesLimitRule(BaseRuleModel):
    """Caps the total number of trades allowed in a single market session to prevent overtrading."""

    rule_type: Literal["MAX_DAILY_TRADES_LIMIT"] = "MAX_DAILY_TRADES_LIMIT"
    max_trades: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Maximum number of completed trades permitted per market day (1 to 100)",
    )
    action: Literal["HALT_FOR_DAY"] = Field(
        default="HALT_FOR_DAY",
        description="Halts trading for the rest of the session once trade count reaches max_trades",
    )


# ==============================================================================
# Rule 5: TIME_OF_DAY_CUTOFF
# ==============================================================================
class TimeOfDayCutoffRule(BaseRuleModel):
    """Restricts trade entries to allowed time windows during the trading session."""

    rule_type: Literal["TIME_OF_DAY_CUTOFF"] = "TIME_OF_DAY_CUTOFF"
    allowed_start_time: str = Field(
        default="09:15",
        description="Earliest time of day allowed for trade entry (HH:MM format, e.g. '09:15')",
    )
    allowed_end_time: str = Field(
        default="15:15",
        description="Latest time of day allowed for trade entry (HH:MM format, e.g. '15:15')",
    )
    restricted_lunch_break: bool = Field(
        default=False,
        description="If True, forbids trade entry during midday chop window (11:30 to 13:00 IST)",
    )

    @field_validator("allowed_start_time", "allowed_end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not TIME_REGEX.match(v):
            raise ValueError(f"Time '{v}' must be in valid 24-hour HH:MM format (00:00 to 23:59)")
        return v

    @model_validator(mode="after")
    def validate_time_order(self) -> TimeOfDayCutoffRule:
        if self.allowed_start_time >= self.allowed_end_time:
            raise ValueError(
                f"allowed_start_time ('{self.allowed_start_time}') must be strictly earlier "
                f"than allowed_end_time ('{self.allowed_end_time}')"
            )
        return self


# ==============================================================================
# Rule 6: MAX_POSITION_SIZE
# ==============================================================================
class MaxPositionSizeRule(BaseRuleModel):
    """Imposes hard caps on trade quantity, F&O lot exposure, or capital allocation per trade."""

    rule_type: Literal["MAX_POSITION_SIZE"] = "MAX_POSITION_SIZE"
    max_quantity: int | None = Field(
        default=None,
        gt=0,
        description="Maximum absolute number of shares/units per trade order",
    )
    max_lots: int | None = Field(
        default=None,
        gt=0,
        le=500,
        description="Maximum number of F&O contracts/lots per trade order (1 to 500)",
    )
    max_capital_per_trade_inr: float | None = Field(
        default=None,
        gt=0,
        description="Maximum INR capital or margin allocation permitted for a single trade",
    )
    segment: Literal["EQUITY", "FNO", "ALL"] = Field(
        default="ALL",
        description="Market segment to which this position size cap applies",
    )

    @model_validator(mode="after")
    def validate_size_thresholds(self) -> MaxPositionSizeRule:
        if (
            self.max_quantity is None
            and self.max_lots is None
            and self.max_capital_per_trade_inr is None
        ):
            raise ValueError(
                "At least one of 'max_quantity', 'max_lots', or 'max_capital_per_trade_inr' must be specified"
            )
        return self


# ==============================================================================
# Rule 7: SKIP_INSTRUMENT_TYPE
# ==============================================================================
DisallowedInstrumentType = Literal[
    "OPTIONS_BUY",
    "OPTIONS_SELL",
    "FUTURES",
    "EQUITY_INTRADAY",
    "EQUITY_DELIVERY",
]


class SkipInstrumentTypeRule(BaseRuleModel):
    """Disallows trading specific high-risk or unprofitable instrument categories."""

    rule_type: Literal["SKIP_INSTRUMENT_TYPE"] = "SKIP_INSTRUMENT_TYPE"
    disallowed_types: list[DisallowedInstrumentType] = Field(
        ...,
        min_length=1,
        description="List of instrument product types forbidden from execution",
    )

    @field_validator("disallowed_types")
    @classmethod
    def validate_disallowed_unique(cls, v: list[DisallowedInstrumentType]) -> list[DisallowedInstrumentType]:
        if len(v) != len(set(v)):
            raise ValueError("disallowed_types contains duplicate entries")
        return v


# ==============================================================================
# Rule 8: NO_TRADING_ON_EXPIRY_DAY
# ==============================================================================
ExpiryIndexName = Literal["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "ALL"]


class NoTradingOnExpiryDayRule(BaseRuleModel):
    """Controls or limits trade exposure on contract expiry days to protect against gamma explosions."""

    rule_type: Literal["NO_TRADING_ON_EXPIRY_DAY"] = "NO_TRADING_ON_EXPIRY_DAY"
    action: Literal["HALT_FOR_DAY", "CAP_LOTS"] = Field(
        default="HALT_FOR_DAY",
        description="Action on expiry session: HALT_FOR_DAY (no trading) or CAP_LOTS (reduced position sizing)",
    )
    max_lots: int | None = Field(
        default=None,
        ge=1,
        le=50,
        description="Maximum permitted lots on expiry day when action is 'CAP_LOTS'",
    )
    affected_indices: list[ExpiryIndexName] = Field(
        default=["ALL"],
        min_length=1,
        description="List of underlying indices affected by this expiry rule",
    )

    @model_validator(mode="after")
    def validate_cap_lots(self) -> NoTradingOnExpiryDayRule:
        if self.action == "CAP_LOTS" and self.max_lots is None:
            raise ValueError("'max_lots' is required when action is 'CAP_LOTS'")
        return self


# ==============================================================================
# Rule 9: COMPOSITE_RULE
# ==============================================================================
# SingleTradingRule is a discriminated union of the 8 atomic rules.
SingleTradingRule = Annotated[
    Union[
        CoolOffAfterLossRule,
        MaxConsecutiveLossesRule,
        DailyLossLimitRule,
        MaxDailyTradesLimitRule,
        TimeOfDayCutoffRule,
        MaxPositionSizeRule,
        SkipInstrumentTypeRule,
        NoTradingOnExpiryDayRule,
    ],
    Field(discriminator="rule_type"),
]


class CompositeRule(BaseRuleModel):
    """Composite guardrail combining 2 to 6 atomic rules evaluated under logical conjunction (AND)."""

    rule_type: Literal["COMPOSITE_RULE"] = "COMPOSITE_RULE"
    name: str = Field(
        default="Custom Multi-Rule Strategy",
        min_length=3,
        max_length=80,
        description="Descriptive name of the composite rulebook",
    )
    conjunction: Literal["AND"] = Field(
        default="AND",
        description="Logical operator connecting sub-rules; all sub-rules must pass for a trade to be allowed",
    )
    rules: list[SingleTradingRule] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="List of 2 to 6 non-composite atomic rules to combine",
    )

    @model_validator(mode="after")
    def validate_unique_rule_types(self) -> CompositeRule:
        rule_types = [r.rule_type for r in self.rules]
        if len(rule_types) != len(set(rule_types)):
            duplicates = [t for t in set(rule_types) if rule_types.count(t) > 1]
            raise ValueError(f"CompositeRule contains duplicate sub-rule types: {duplicates}")
        return self


# ==============================================================================
# Master Polymorphic TradingRule Union
# ==============================================================================
TradingRule = Annotated[
    Union[
        CoolOffAfterLossRule,
        MaxConsecutiveLossesRule,
        DailyLossLimitRule,
        MaxDailyTradesLimitRule,
        TimeOfDayCutoffRule,
        MaxPositionSizeRule,
        SkipInstrumentTypeRule,
        NoTradingOnExpiryDayRule,
        CompositeRule,
    ],
    Field(discriminator="rule_type"),
]

# Canonical catalog list of rule types
APPROVED_RULE_TYPES: tuple[str, ...] = (
    "COOL_OFF_AFTER_LOSS",
    "MAX_CONSECUTIVE_LOSSES",
    "DAILY_LOSS_LIMIT",
    "MAX_DAILY_TRADES_LIMIT",
    "TIME_OF_DAY_CUTOFF",
    "MAX_POSITION_SIZE",
    "SKIP_INSTRUMENT_TYPE",
    "NO_TRADING_ON_EXPIRY_DAY",
    "COMPOSITE_RULE",
)
