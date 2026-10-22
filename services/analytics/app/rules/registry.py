"""TradeLens Rule Catalog Registry (Task 19).

Centralized metadata repository for all approved V1 rules, providing parameter definitions,
human descriptions, and UI defaults for the Rule Lab and AI translation prompt pipeline.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class ParameterSpec(BaseModel):
    """Specification of a configurable parameter for a trading rule."""

    name: str
    type: str
    label: str
    description: str
    default: Any
    unit: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    options: list[str] | None = None
    is_required: bool = True


class RuleCatalogItem(BaseModel):
    """Metadata definition for a rule type in the catalog."""

    rule_type: str
    name: str
    category: str
    description: str
    parameters: list[ParameterSpec]
    default_payload: dict[str, Any]


# ==============================================================================
# Catalog Definitions Registry
# ==============================================================================
RULE_CATALOG_REGISTRY: dict[str, RuleCatalogItem] = {
    "COOL_OFF_AFTER_LOSS": RuleCatalogItem(
        rule_type="COOL_OFF_AFTER_LOSS",
        name="Post-Loss Cooldown Pause",
        category="Emotional Tilt & Revenge Trading",
        description="Enforces a mandatory quiet cooldown window after any losing exit to prevent impulsive revenge trades.",
        parameters=[
            ParameterSpec(
                name="cooldown_minutes",
                type="int",
                label="Cooldown Duration",
                description="Number of minutes to pause trading following a losing trade exit.",
                default=15,
                unit="minutes",
                min_value=1,
                max_value=240,
            ),
            ParameterSpec(
                name="trigger_loss_inr",
                type="float",
                label="Trigger Loss Threshold",
                description="Optional minimum loss in ₹ required to trigger the cooldown. If omitted, all losses trigger.",
                default=None,
                unit="INR",
                min_value=1.0,
                is_required=False,
            ),
            ParameterSpec(
                name="max_consecutive_losses",
                type="int",
                label="Loss Streak Trigger",
                description="Number of consecutive losses required before imposing cooldown.",
                default=1,
                unit="trades",
                min_value=1,
                max_value=5,
            ),
        ],
        default_payload={
            "rule_type": "COOL_OFF_AFTER_LOSS",
            "cooldown_minutes": 15,
            "max_consecutive_losses": 1,
        },
    ),
    "MAX_CONSECUTIVE_LOSSES": RuleCatalogItem(
        rule_type="MAX_CONSECUTIVE_LOSSES",
        name="Consecutive Losses Circuit Breaker",
        category="Drawdown Protection",
        description="Halts trading for the remainder of the session or imposes an extended cooldown after a losing streak.",
        parameters=[
            ParameterSpec(
                name="consecutive_losses",
                type="int",
                label="Loss Streak Limit",
                description="Number of consecutive losses before circuit breaker triggers.",
                default=3,
                unit="trades",
                min_value=1,
                max_value=10,
            ),
            ParameterSpec(
                name="action",
                type="string",
                label="Circuit Breaker Action",
                description="Whether to halt trading for the rest of the day or impose an extended cooldown.",
                default="HALT_FOR_DAY",
                options=["HALT_FOR_DAY", "MANDATORY_COOLDOWN"],
            ),
            ParameterSpec(
                name="cooldown_minutes",
                type="int",
                label="Extended Cooldown",
                description="Minutes to pause if action is MANDATORY_COOLDOWN.",
                default=60,
                unit="minutes",
                min_value=15,
                max_value=240,
                is_required=False,
            ),
        ],
        default_payload={
            "rule_type": "MAX_CONSECUTIVE_LOSSES",
            "consecutive_losses": 3,
            "action": "HALT_FOR_DAY",
        },
    ),
    "DAILY_LOSS_LIMIT": RuleCatalogItem(
        rule_type="DAILY_LOSS_LIMIT",
        name="Daily Realized Drawdown Limit",
        category="Capital Preservation",
        description="Terminates trading for the day when cumulative realized loss exceeds a hard rupee or percentage threshold.",
        parameters=[
            ParameterSpec(
                name="max_loss_inr",
                type="float",
                label="Max Rupee Drawdown",
                description="Maximum loss in Indian Rupees allowed in a single session.",
                default=5000.0,
                unit="INR",
                min_value=100.0,
                is_required=False,
            ),
            ParameterSpec(
                name="max_loss_percent_capital",
                type="float",
                label="Max Loss % of Capital",
                description="Maximum daily loss as a percentage of starting capital.",
                default=2.0,
                unit="%",
                min_value=0.1,
                max_value=25.0,
                is_required=False,
            ),
            ParameterSpec(
                name="starting_capital",
                type="float",
                label="Starting Capital",
                description="Base capital used to compute percentage drawdown limit.",
                default=100000.0,
                unit="INR",
                min_value=1000.0,
                is_required=False,
            ),
            ParameterSpec(
                name="action",
                type="string",
                label="Limit Action",
                description="Enforced response when limit is breached.",
                default="HALT_FOR_DAY",
                options=["HALT_FOR_DAY"],
            ),
        ],
        default_payload={
            "rule_type": "DAILY_LOSS_LIMIT",
            "max_loss_inr": 5000.0,
            "action": "HALT_FOR_DAY",
        },
    ),
    "MAX_DAILY_TRADES_LIMIT": RuleCatalogItem(
        rule_type="MAX_DAILY_TRADES_LIMIT",
        name="Daily Trade Frequency Cap",
        category="Overtrading Prevention",
        description="Caps the maximum number of executed trades allowed per day to combat overtrading and broker fee drag.",
        parameters=[
            ParameterSpec(
                name="max_trades",
                type="int",
                label="Max Trades Per Day",
                description="Maximum number of round-trip trades permitted per session.",
                default=5,
                unit="trades",
                min_value=1,
                max_value=100,
            ),
            ParameterSpec(
                name="action",
                type="string",
                label="Action on Limit",
                description="Action to take when trade count reaches maximum.",
                default="HALT_FOR_DAY",
                options=["HALT_FOR_DAY"],
            ),
        ],
        default_payload={
            "rule_type": "MAX_DAILY_TRADES_LIMIT",
            "max_trades": 5,
            "action": "HALT_FOR_DAY",
        },
    ),
    "TIME_OF_DAY_CUTOFF": RuleCatalogItem(
        rule_type="TIME_OF_DAY_CUTOFF",
        name="Allowed Trading Session Window",
        category="Session Timing",
        description="Restricts trade entries to high-probability market hours and avoids midday chop or closing volatility.",
        parameters=[
            ParameterSpec(
                name="allowed_start_time",
                type="string",
                label="Session Open Time",
                description="Earliest time of day trades may be initiated (HH:MM).",
                default="09:15",
                unit="IST",
            ),
            ParameterSpec(
                name="allowed_end_time",
                type="string",
                label="Session Close Time",
                description="Latest time of day trades may be initiated (HH:MM).",
                default="15:15",
                unit="IST",
            ),
            ParameterSpec(
                name="restricted_lunch_break",
                type="bool",
                label="Avoid Midday Chop",
                description="Forbids trade execution during low-volume midday hours (11:30 - 13:00 IST).",
                default=False,
            ),
        ],
        default_payload={
            "rule_type": "TIME_OF_DAY_CUTOFF",
            "allowed_start_time": "09:15",
            "allowed_end_time": "15:15",
            "restricted_lunch_break": False,
        },
    ),
    "MAX_POSITION_SIZE": RuleCatalogItem(
        rule_type="MAX_POSITION_SIZE",
        name="Maximum Position Size Cap",
        category="Position Sizing & Risk Allocation",
        description="Limits exposure per trade by capping lots, share quantities, or total initial capital allocation.",
        parameters=[
            ParameterSpec(
                name="max_quantity",
                type="int",
                label="Max Share Quantity",
                description="Maximum share units allowed for an equity position.",
                default=None,
                unit="shares",
                min_value=1,
                is_required=False,
            ),
            ParameterSpec(
                name="max_lots",
                type="int",
                label="Max F&O Lots",
                description="Maximum futures or options contracts allowed per trade.",
                default=2,
                unit="lots",
                min_value=1,
                max_value=500,
                is_required=False,
            ),
            ParameterSpec(
                name="max_capital_per_trade_inr",
                type="float",
                label="Max Margin / Capital",
                description="Maximum capital allocation per trade in INR.",
                default=None,
                unit="INR",
                min_value=500.0,
                is_required=False,
            ),
            ParameterSpec(
                name="segment",
                type="string",
                label="Applicable Segment",
                description="Which trading segment this sizing cap targets.",
                default="ALL",
                options=["EQUITY", "FNO", "ALL"],
            ),
        ],
        default_payload={
            "rule_type": "MAX_POSITION_SIZE",
            "max_lots": 2,
            "segment": "FNO",
        },
    ),
    "SKIP_INSTRUMENT_TYPE": RuleCatalogItem(
        rule_type="SKIP_INSTRUMENT_TYPE",
        name="Blacklist High-Risk Instruments",
        category="Asset Class & Product Selection",
        description="Eliminates historically unprofitable instrument categories (e.g. out-of-the-money Options Buying).",
        parameters=[
            ParameterSpec(
                name="disallowed_types",
                type="list",
                label="Forbidden Instrument Types",
                description="Instruments that the backtester or live journal should skip.",
                default=["OPTIONS_BUY"],
                options=["OPTIONS_BUY", "OPTIONS_SELL", "FUTURES", "EQUITY_INTRADAY", "EQUITY_DELIVERY"],
            )
        ],
        default_payload={
            "rule_type": "SKIP_INSTRUMENT_TYPE",
            "disallowed_types": ["OPTIONS_BUY"],
        },
    ),
    "NO_TRADING_ON_EXPIRY_DAY": RuleCatalogItem(
        rule_type="NO_TRADING_ON_EXPIRY_DAY",
        name="Expiry Day Gamma Shield",
        category="Expiry Session Risk",
        description="Guards against high-theta/gamma decay volatility on index expiry days by halting or downsizing positions.",
        parameters=[
            ParameterSpec(
                name="action",
                type="string",
                label="Expiry Action",
                description="Whether to halt trading completely or enforce smaller position sizing on expiry days.",
                default="HALT_FOR_DAY",
                options=["HALT_FOR_DAY", "CAP_LOTS"],
            ),
            ParameterSpec(
                name="max_lots",
                type="int",
                label="Capped Lots on Expiry",
                description="Maximum lot size permitted if action is CAP_LOTS.",
                default=1,
                unit="lots",
                min_value=1,
                max_value=50,
                is_required=False,
            ),
            ParameterSpec(
                name="affected_indices",
                type="list",
                label="Target Indices",
                description="Indices to which the expiry restriction applies.",
                default=["ALL"],
                options=["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "ALL"],
            ),
        ],
        default_payload={
            "rule_type": "NO_TRADING_ON_EXPIRY_DAY",
            "action": "HALT_FOR_DAY",
            "affected_indices": ["ALL"],
        },
    ),
    "COMPOSITE_RULE": RuleCatalogItem(
        rule_type="COMPOSITE_RULE",
        name="Composite Multi-Rule Rulebook",
        category="Strategy Combination",
        description="Combines 2 to 6 non-composite guardrail rules evaluated together using logical conjunction (AND).",
        parameters=[
            ParameterSpec(
                name="name",
                type="string",
                label="Strategy Name",
                description="Custom name for the composite strategy.",
                default="Discipline Shield V1",
            ),
            ParameterSpec(
                name="conjunction",
                type="string",
                label="Evaluation Conjunction",
                description="Logical conjunction connecting sub-rules.",
                default="AND",
                options=["AND"],
            ),
            ParameterSpec(
                name="rules",
                type="list",
                label="Sub-Rules",
                description="List of 2 to 6 atomic rules combined in this composite.",
                default=[],
            ),
        ],
        default_payload={
            "rule_type": "COMPOSITE_RULE",
            "name": "Discipline Shield V1",
            "conjunction": "AND",
            "rules": [
                {"rule_type": "COOL_OFF_AFTER_LOSS", "cooldown_minutes": 15},
                {"rule_type": "MAX_DAILY_TRADES_LIMIT", "max_trades": 5},
            ],
        },
    ),
}


def get_catalog_manifest() -> list[dict[str, Any]]:
    """Returns the full catalog manifest as a list of dicts for UI/API consumption."""
    return [item.model_dump() for item in RULE_CATALOG_REGISTRY.values()]


def get_rule_catalog_item(rule_type: str) -> RuleCatalogItem | None:
    """Returns the metadata item for a given rule_type, or None if uncataloged."""
    return RULE_CATALOG_REGISTRY.get(rule_type)
