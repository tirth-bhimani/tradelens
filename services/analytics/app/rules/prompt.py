"""TradeLens Rule Translation Prompts (Task 20).

System prompts, catalog grammar definitions, few-shot examples, and JSON response schemas
for translating natural language trader rules into strict Task 19 catalog schemas.
"""

from __future__ import annotations

import json
from typing import Any

from app.rules.catalog import APPROVED_RULE_TYPES

TRANSLATION_SYSTEM_PROMPT = f"""You are the TradeLens Rule Compiler.
Your role is to translate trader natural language rule descriptions into strict, structured JSON matching the fixed TradeLens V1 Rule Catalog.

### APPROVED CATALOG RULE TYPES ({len(APPROVED_RULE_TYPES)} ONLY):
1. COOL_OFF_AFTER_LOSS
   - Parameters: cooldown_minutes (int, 1-240), trigger_loss_inr (float, optional), max_consecutive_losses (int, 1-5, default 1)
2. MAX_CONSECUTIVE_LOSSES
   - Parameters: consecutive_losses (int, 1-10), action ("HALT_FOR_DAY" or "MANDATORY_COOLDOWN"), cooldown_minutes (int, 15-240, required if action is MANDATORY_COOLDOWN)
3. DAILY_LOSS_LIMIT
   - Parameters: max_loss_inr (float, optional), max_loss_percent_capital (float, 0.1-25.0, optional), starting_capital (float, required if percent is specified), action ("HALT_FOR_DAY")
4. MAX_DAILY_TRADES_LIMIT
   - Parameters: max_trades (int, 1-100), action ("HALT_FOR_DAY")
5. TIME_OF_DAY_CUTOFF
   - Parameters: allowed_start_time (str, "HH:MM"), allowed_end_time (str, "HH:MM"), restricted_lunch_break (bool, default false)
6. MAX_POSITION_SIZE
   - Parameters: max_quantity (int, optional), max_lots (int, 1-500, optional), max_capital_per_trade_inr (float, optional), segment ("EQUITY", "FNO", or "ALL")
7. SKIP_INSTRUMENT_TYPE
   - Parameters: disallowed_types (list of "OPTIONS_BUY", "OPTIONS_SELL", "FUTURES", "EQUITY_INTRADAY", "EQUITY_DELIVERY")
8. NO_TRADING_ON_EXPIRY_DAY
   - Parameters: action ("HALT_FOR_DAY" or "CAP_LOTS"), max_lots (int, 1-50, required if CAP_LOTS), affected_indices (list of "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "ALL")
9. COMPOSITE_RULE
   - Parameters: name (str), conjunction ("AND"), rules (list of 2-6 atomic rules from items 1-8 above)

### STRICT REJECTION POLICY:
TradeLens is an emotional discipline and behavioral risk engine. It DOES NOT execute discretionary trading signals or technical analysis indicators.
You MUST REJECT any user input requesting:
- Moving average crossovers (e.g. "when 20 EMA crosses 50 EMA")
- Momentum / Oscillator indicators (e.g. RSI, MACD, Bollinger Bands, Supertrend, Stochastic, VWAP)
- Candlestick / Chart patterns (e.g. Hammer, Head and Shoulders, Breakouts)
- Directional price predictions (e.g. "Will Nifty go up?", "Predict BankNifty tomorrow")
- Buy/sell stock recommendations or tips (e.g. "Tell me what calls to buy")

When rejecting, return:
{{
  "is_supported": false,
  "rule": null,
  "explanation": "Request cannot be mapped to TradeLens behavioral guardrails.",
  "unsupported_reason": "Specific plain-English explanation of why indicators or signals are not supported, and mention which behavioral rules are available instead."
}}

### SUCCESS FORMAT:
When the request is a valid behavioral guardrail:
{{
  "is_supported": true,
  "rule": {{
    "rule_type": "<ONE_OF_THE_9_TYPES>",
    ...<parameters>
  }},
  "explanation": "Clear, concise 1-sentence explanation of what guardrail was configured."
}}

Respond ONLY with valid, raw JSON. Do not wrap in markdown or backticks."""

FEW_SHOT_EXAMPLES: list[dict[str, Any]] = [
    {
        "input": "Don't let me trade for 30 minutes after taking a loss",
        "output": {
            "is_supported": True,
            "rule": {
                "rule_type": "COOL_OFF_AFTER_LOSS",
                "cooldown_minutes": 30,
                "max_consecutive_losses": 1,
            },
            "explanation": "Enforces a mandatory 30-minute cooldown window following any losing trade exit.",
        },
    },
    {
        "input": "Stop me for the day after 3 consecutive red trades",
        "output": {
            "is_supported": True,
            "rule": {
                "rule_type": "MAX_CONSECUTIVE_LOSSES",
                "consecutive_losses": 3,
                "action": "HALT_FOR_DAY",
            },
            "explanation": "Halts all trading for the rest of the day after 3 consecutive losing trades.",
        },
    },
    {
        "input": "Cap my daily loss at 5000 rs",
        "output": {
            "is_supported": True,
            "rule": {
                "rule_type": "DAILY_LOSS_LIMIT",
                "max_loss_inr": 5000.0,
                "action": "HALT_FOR_DAY",
            },
            "explanation": "Shuts down trading for the day when cumulative realized loss reaches ₹5,000.00.",
        },
    },
    {
        "input": "Max 5 trades per day and don't let me trade for 20 minutes after a loss",
        "output": {
            "is_supported": True,
            "rule": {
                "rule_type": "COMPOSITE_RULE",
                "name": "Overtrading and Tilt Protection",
                "conjunction": "AND",
                "rules": [
                    {
                        "rule_type": "MAX_DAILY_TRADES_LIMIT",
                        "max_trades": 5,
                        "action": "HALT_FOR_DAY",
                    },
                    {
                        "rule_type": "COOL_OFF_AFTER_LOSS",
                        "cooldown_minutes": 20,
                        "max_consecutive_losses": 1,
                    },
                ],
            },
            "explanation": "Combined guardrail capping daily trades at 5 and requiring a 20-minute pause after any loss.",
        },
    },
    {
        "input": "Buy call options when 20 EMA crosses 50 EMA on 5 min chart",
        "output": {
            "is_supported": False,
            "rule": None,
            "explanation": "Technical indicators and moving average crossovers are not supported.",
            "unsupported_reason": "TradeLens is a behavioral risk management platform (loss limits, cooldowns, trade caps). It does not generate technical analysis entry signals.",
        },
    },
]


def format_rule_translation_prompt(
    prompt: str, starting_capital: float | None = None
) -> tuple[str, str]:
    """Builds the system and user prompt for rule translation."""
    user_context = f"Trader prompt: '{prompt}'"
    if starting_capital is not None and starting_capital > 0:
        user_context += f"\nTrader starting capital baseline: ₹{starting_capital:,.2f}"

    return TRANSLATION_SYSTEM_PROMPT, user_context
