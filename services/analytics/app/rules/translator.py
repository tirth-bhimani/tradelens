"""TradeLens Natural Language to JSON Rule Translator Engine (Task 20).

Translates free-form trader natural language guardrail requests into strict, validated
Task 19 catalog JSON. Combines deterministic regex pattern matching for fast, zero-cost,
offline execution with LLM fallback via the Task 16 multi-provider client.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.ai.client import AIClient, get_ai_client
from app.rules.catalog import TradingRule
from app.rules.prompt import format_rule_translation_prompt
from app.rules.validator import serialize_rule, validate_rule

logger = logging.getLogger(__name__)


# ==============================================================================
# Request & Response Contracts
# ==============================================================================
class TranslateRuleRequest(BaseModel):
    """Incoming trader natural language prompt to compile into a catalog rule."""

    prompt: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Plain-English trading guardrail description",
        examples=["Don't let me trade for 20 minutes after taking a loss"],
    )
    starting_capital: float | None = Field(
        default=None,
        gt=0,
        description="Trader starting capital baseline in INR, used for percentage drawdown calculations",
    )


class TranslateRuleResponse(BaseModel):
    """Structured translation output returning the validated catalog rule or rejection."""

    success: bool = Field(
        ..., description="True if prompt was processed cleanly (whether supported or unsupported)"
    )
    is_supported: bool = Field(
        ..., description="True if the request maps to an approved TradeLens behavioral rule"
    )
    rule: dict[str, Any] | None = Field(
        default=None, description="Serialized Pydantic catalog rule payload ready for Rule Lab"
    )
    rule_type: str | None = Field(
        default=None, description="Canonical catalog rule_type (e.g. COOL_OFF_AFTER_LOSS)"
    )
    explanation: str = Field(
        ..., description="Human-readable explanation of the configured rule or rejection"
    )
    unsupported_reason: str | None = Field(
        default=None, description="Detailed explanation if the requested concept is outside catalog scope"
    )
    engine_used: str = Field(
        default="DETERMINISTIC_PARSER",
        description="Engine that processed the translation (DETERMINISTIC_PARSER or LLM provider)",
    )


# ==============================================================================
# Unsupported Concepts Detection (Technical Analysis, Tips, Price Predictions)
# ==============================================================================
UNSUPPORTED_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"\b(rsi|macd|ema|sma|moving\s+average|vwap|supertrend|bollinger|stochastic|ichimoku)\b", re.IGNORECASE),
        "Technical analysis indicators (such as RSI, Moving Averages, MACD, or Supertrend) are discretionary entry triggers and outside TradeLens's behavioral risk management scope. TradeLens provides behavioral guardrails (cooldowns, loss cutoffs, trade caps) to protect your capital."
    ),
    (
        re.compile(r"\b(crossover|crosses\s+above|crosses\s+below|golden\s+cross|death\s+cross)\b", re.IGNORECASE),
        "Indicator crossovers are discretionary technical entry signals. TradeLens enforces behavioral discipline rules (such as post-loss cooldowns and daily trade caps) rather than trade entry signals."
    ),
    (
        re.compile(r"\b(candlestick|hammer|doji|engulfing|head\s+and\s+shoulders|breakout|support|resistance)\b", re.IGNORECASE),
        "Chart pattern and price action triggers are discretionary strategies outside TradeLens's behavioral guardrail catalog."
    ),
    (
        re.compile(r"\b(predict|forecast|target\s+price|will\s+nifty|will\s+banknifty|where\s+will|tomorrow\s+market)\b", re.IGNORECASE),
        "TradeLens never predicts market direction or stock prices. It enforces objective personal trading discipline and risk caps on your historical trades."
    ),
    (
        re.compile(r"\b(buy\s+call|buy\s+put|buy\s+signal|sell\s+signal|recommend\s+stock|give\s+me\s+tips)\b", re.IGNORECASE),
        "TradeLens is an educational behavioral journal and does not provide buy/sell stock tips or financial advisory."
    ),
]


def _check_unsupported_concept(text: str) -> str | None:
    """Returns an explanation if text explicitly asks for an unsupported concept."""
    for pattern, explanation in UNSUPPORTED_PATTERNS:
        if pattern.search(text):
            return explanation
    return None


# ==============================================================================
# Deterministic Pattern Matcher (Zero latency, offline, zero API cost)
# ==============================================================================
def _parse_time_str(raw: str) -> str | None:
    """Normalizes informal time strings like '9:30 am', '15:15', '2pm', '9:15' to 'HH:MM'."""
    raw = raw.strip().lower()
    # Check already 24-hr HH:MM
    match_24 = re.match(r"^([01]?\d|2[0-3]):([0-5]\d)$", raw)
    if match_24:
        h, m = int(match_24.group(1)), int(match_24.group(2))
        return f"{h:02d}:{m:02d}"

    # Check 12-hr with am/pm (e.g. 9:30 am, 2:30 pm, 2 pm)
    match_12 = re.match(r"^([1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)$", raw)
    if match_12:
        h = int(match_12.group(1))
        m = int(match_12.group(2) or 0)
        meridiem = match_12.group(3)
        if meridiem == "pm" and h < 12:
            h += 12
        elif meridiem == "am" and h == 12:
            h = 0
        return f"{h:02d}:{m:02d}"

    return None


def _parse_single_rule_deterministic(
    text: str, starting_capital: float | None = None
) -> dict[str, Any] | None:
    """Matches a single atomic natural language clause to one of the 8 atomic catalog rules."""
    text_lower = text.lower().strip()

    # 1. COOL_OFF_AFTER_LOSS
    # e.g., "cooldown of 20 mins", "pause for 30 minutes after loss", "wait 15 min after losing", "don't let me trade for 20 minutes after losing money"
    has_pause_intent = (
        any(k in text_lower for k in ["cooldown", "cool off", "cool-off", "pause", "wait"])
        or bool(re.search(r"(?:don't|dont|no|stop|halt)\b.*?(?:trade|trading)\b.*?\b\d+\s*(?:min|minute)", text_lower))
        or bool(re.search(r"\b\d+\s*(?:min|minute|m)\b.*?(?:after|following)\b", text_lower))
    )
    has_loss_context = any(k in text_lower for k in ["loss", "losses", "losing", "lose", "red"])

    if has_pause_intent and has_loss_context:
        min_match = re.search(r"(\d+)\s*(?:min|minute|m\b)", text_lower)
        cooldown = int(min_match.group(1)) if min_match else 15
        cooldown = max(1, min(240, cooldown))

        # Check consecutive trigger
        consec_match = re.search(r"(\d+)\s*(?:consecutive|in a row|straight)", text_lower)
        consec = int(consec_match.group(1)) if consec_match else 1
        consec = max(1, min(5, consec))

        # Check loss threshold
        loss_inr_match = re.search(
            r"(?:loss|lose|exceeding|>)\s*(?:of|more than)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)",
            text_lower,
        )
        trigger_inr = (
            float(loss_inr_match.group(1).replace(",", "")) if loss_inr_match else None
        )

        payload: dict[str, Any] = {
            "rule_type": "COOL_OFF_AFTER_LOSS",
            "cooldown_minutes": cooldown,
            "max_consecutive_losses": consec,
        }
        if trigger_inr is not None and trigger_inr > 0:
            payload["trigger_loss_inr"] = trigger_inr
        return payload

    # 2. MAX_CONSECUTIVE_LOSSES
    # e.g., "stop after 3 consecutive losses", "halt after 2 red trades in a row"
    if any(k in text_lower for k in ["consecutive", "in a row", "streak"]) and any(
        k in text_lower for k in ["loss", "losses", "red"]
    ):
        consec_match = re.search(r"(\d+)\s*(?:consecutive|losses in a row|red trades)", text_lower)
        consec = int(consec_match.group(1)) if consec_match else 3
        consec = max(1, min(10, consec))

        action = "HALT_FOR_DAY"
        cooldown_min: int | None = None
        if "cooldown" in text_lower or "pause" in text_lower:
            action = "MANDATORY_COOLDOWN"
            min_match = re.search(r"(\d+)\s*(?:min|minute)", text_lower)
            cooldown_min = int(min_match.group(1)) if min_match else 60
            cooldown_min = max(15, min(240, cooldown_min))

        payload = {
            "rule_type": "MAX_CONSECUTIVE_LOSSES",
            "consecutive_losses": consec,
            "action": action,
        }
        if cooldown_min is not None:
            payload["cooldown_minutes"] = cooldown_min
        return payload

    # 3. DAILY_LOSS_LIMIT
    # e.g., "cap daily loss at 5000", "max loss 2%", "limit loss to 3% of capital"
    if any(k in text_lower for k in ["daily loss", "max loss", "loss limit", "drawdown"]) or (
        "day" in text_lower and any(k in text_lower for k in ["lose", "loss", "cap"])
    ):
        # Percentage check
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", text_lower)
        if pct_match:
            pct = float(pct_match.group(1))
            pct = max(0.1, min(25.0, pct))
            capital = starting_capital or 100000.0
            return {
                "rule_type": "DAILY_LOSS_LIMIT",
                "max_loss_percent_capital": pct,
                "starting_capital": capital,
                "action": "HALT_FOR_DAY",
            }

        # Rupee check
        inr_match = re.search(
            r"(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh|lac)?", text_lower
        )
        if inr_match:
            val = float(inr_match.group(1).replace(",", ""))
            unit = inr_match.group(2)
            if unit in ("k", "thousand"):
                val *= 1000.0
            elif unit in ("lakh", "lac"):
                val *= 100000.0
            if val >= 100.0:
                return {
                    "rule_type": "DAILY_LOSS_LIMIT",
                    "max_loss_inr": val,
                    "action": "HALT_FOR_DAY",
                }

    # 4. MAX_DAILY_TRADES_LIMIT
    # e.g., "max 5 trades per day", "limit to 4 trades a day", "no more than 3 orders daily"
    if any(k in text_lower for k in ["trades", "orders"]) and any(
        k in text_lower for k in ["day", "daily", "session"]
    ):
        trade_match = re.search(
            r"(?:max|limit|allow|more than)?\s*(\d+)\s*(?:trades|orders)", text_lower
        )
        if trade_match:
            trades = int(trade_match.group(1))
            trades = max(1, min(100, trades))
            return {
                "rule_type": "MAX_DAILY_TRADES_LIMIT",
                "max_trades": trades,
                "action": "HALT_FOR_DAY",
            }

    # 5. TIME_OF_DAY_CUTOFF
    # e.g., "only trade between 9:30 and 14:30", "trade between 9:15 am and 2:30 pm"
    if any(k in text_lower for k in ["trade between", "between", "timing", "hours", "cutoff"]):
        times_match = re.findall(
            r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)", text_lower
        )
        if len(times_match) >= 2:
            start_t = _parse_time_str(times_match[0])
            end_t = _parse_time_str(times_match[1])
            if start_t and end_t and start_t < end_t:
                lunch = "lunch" in text_lower
                return {
                    "rule_type": "TIME_OF_DAY_CUTOFF",
                    "allowed_start_time": start_t,
                    "allowed_end_time": end_t,
                    "restricted_lunch_break": lunch,
                }

    # 6. MAX_POSITION_SIZE
    # e.g., "max 2 lots", "limit to 100 shares", "max 50000 margin per trade"
    if any(k in text_lower for k in ["lot", "lots", "shares", "quantity", "position size"]):
        lots_match = re.search(r"(\d+)\s*lots?", text_lower)
        qty_match = re.search(r"(\d+)\s*(?:shares|quantity|qty)", text_lower)
        if lots_match:
            lots = int(lots_match.group(1))
            return {
                "rule_type": "MAX_POSITION_SIZE",
                "max_lots": max(1, min(500, lots)),
                "segment": "FNO",
            }
        if qty_match:
            qty = int(qty_match.group(1))
            return {
                "rule_type": "MAX_POSITION_SIZE",
                "max_quantity": max(1, qty),
                "segment": "EQUITY",
            }

    # 7. SKIP_INSTRUMENT_TYPE
    # e.g., "no options buying", "skip futures", "avoid intraday equity"
    if any(k in text_lower for k in ["no options", "avoid options", "skip options", "no options buying"]):
        return {
            "rule_type": "SKIP_INSTRUMENT_TYPE",
            "disallowed_types": ["OPTIONS_BUY"],
        }
    if "skip futures" in text_lower or "no futures" in text_lower:
        return {
            "rule_type": "SKIP_INSTRUMENT_TYPE",
            "disallowed_types": ["FUTURES"],
        }

    # 8. NO_TRADING_ON_EXPIRY_DAY
    # e.g., "don't trade on expiry day", "no trading on thursday expiry"
    if "expiry" in text_lower:
        indices = ["ALL"]
        if "nifty" in text_lower and "banknifty" not in text_lower:
            indices = ["NIFTY"]
        elif "banknifty" in text_lower:
            indices = ["BANKNIFTY"]

        cap_match = re.search(r"cap\s*at\s*(\d+)\s*lots?", text_lower)
        if cap_match:
            lots = int(cap_match.group(1))
            return {
                "rule_type": "NO_TRADING_ON_EXPIRY_DAY",
                "action": "CAP_LOTS",
                "max_lots": max(1, min(50, lots)),
                "affected_indices": indices,
            }

        return {
            "rule_type": "NO_TRADING_ON_EXPIRY_DAY",
            "action": "HALT_FOR_DAY",
            "affected_indices": indices,
        }

    return None


def _parse_deterministic_rule(
    prompt: str, starting_capital: float | None = None
) -> TranslateRuleResponse | None:
    """High-speed deterministic matcher that checks unsupported concepts and parses single/composite rules."""
    # Step A: Check explicitly unsupported concepts
    unsupported_reason = _check_unsupported_concept(prompt)
    if unsupported_reason is not None:
        return TranslateRuleResponse(
            success=True,
            is_supported=False,
            rule=None,
            rule_type=None,
            explanation="Request rejected: outside behavioral risk management scope.",
            unsupported_reason=unsupported_reason,
            engine_used="DETERMINISTIC_PARSER",
        )

    # Step B: Check for compound / multi-clause statements
    # e.g. "Max 5 trades per day and 20 min cooldown after a loss"
    delimiters = [r"\s+and\s+", r"\s*;\s*", r"\s*\+\s*", r"\s*,\s*and\s+"]
    clauses = [prompt]
    for delim in delimiters:
        if re.search(delim, prompt, re.IGNORECASE):
            parts = re.split(delim, prompt, flags=re.IGNORECASE)
            if len(parts) >= 2 and all(len(p.strip()) > 3 for p in parts):
                clauses = parts
                break

    if len(clauses) >= 2:
        sub_rules: list[dict[str, Any]] = []
        for clause in clauses:
            sub = _parse_single_rule_deterministic(clause, starting_capital)
            if sub and sub.get("rule_type") != "COMPOSITE_RULE":
                sub_rules.append(sub)

        # Ensure unique rule types and at least 2 valid rules
        rule_types = [r["rule_type"] for r in sub_rules]
        if len(sub_rules) >= 2 and len(rule_types) == len(set(rule_types)):
            composite_payload = {
                "rule_type": "COMPOSITE_RULE",
                "name": "Custom Multi-Rule Strategy",
                "conjunction": "AND",
                "rules": sub_rules[:6],
            }
            val_res = validate_rule(composite_payload)
            if val_res.is_valid and val_res.rule is not None:
                return TranslateRuleResponse(
                    success=True,
                    is_supported=True,
                    rule=serialize_rule(val_res.rule),
                    rule_type="COMPOSITE_RULE",
                    explanation=f"Combined composite guardrail enforcing {len(sub_rules)} rules with AND conjunction.",
                    engine_used="DETERMINISTIC_PARSER",
                )

    # Step C: Check single atomic rule
    single_payload = _parse_single_rule_deterministic(prompt, starting_capital)
    if single_payload:
        val_res = validate_rule(single_payload)
        if val_res.is_valid and val_res.rule is not None:
            rule_t = single_payload.get("rule_type", "")
            return TranslateRuleResponse(
                success=True,
                is_supported=True,
                rule=serialize_rule(val_res.rule),
                rule_type=rule_t,
                explanation=f"Configured {rule_t.replace('_', ' ').title()} guardrail from trader instructions.",
                engine_used="DETERMINISTIC_PARSER",
            )

    return None


# ==============================================================================
# Main Translation Pipeline (Deterministic with LLM Fallback)
# ==============================================================================
async def translate_rule_text(
    prompt: str,
    starting_capital: float | None = None,
    ai_client: AIClient | None = None,
) -> TranslateRuleResponse:
    """Translates a trader natural language rule description into validated catalog JSON.

    Args:
        prompt: User's plain-English rule description.
        starting_capital: Optional account starting capital for % calculations.
        ai_client: Optional AIClient instance for testing or dependency injection.

    Returns:
        TranslateRuleResponse with validated rule payload or informative rejection.
    """
    cleaned_prompt = prompt.strip()
    if len(cleaned_prompt) < 3:
        return TranslateRuleResponse(
            success=False,
            is_supported=False,
            explanation="Prompt is too short. Please describe your trading rule clearly.",
            unsupported_reason="Input must be at least 3 characters.",
            engine_used="VALIDATOR",
        )

    # 1. High-speed deterministic pass (matches standard English phrases in <1ms)
    deterministic_result = _parse_deterministic_rule(cleaned_prompt, starting_capital)
    if deterministic_result is not None:
        return deterministic_result

    # 2. LLM Fallback for complex, nuanced, or colloquial English phrasing
    client = ai_client or get_ai_client()
    system_prompt, user_prompt = format_rule_translation_prompt(cleaned_prompt, starting_capital)

    try:
        raw_response = await client.generate_text(
            prompt=user_prompt,
            system_instruction=system_prompt,
        )
        provider_name = client.provider_name

        # Parse JSON from model output
        # Strip potential markdown formatting if returned
        clean_json = raw_response.strip()
        if clean_json.startswith("```"):
            clean_json = re.sub(r"^```(?:json)?\n", "", clean_json)
            clean_json = re.sub(r"\n```$", "", clean_json)

        parsed_json: dict[str, Any] = json.loads(clean_json)

        is_supported = parsed_json.get("is_supported", False)
        if not is_supported:
            return TranslateRuleResponse(
                success=True,
                is_supported=False,
                rule=None,
                rule_type=None,
                explanation=parsed_json.get("explanation", "Rule concept not supported in TradeLens V1."),
                unsupported_reason=parsed_json.get(
                    "unsupported_reason",
                    "TradeLens focuses on behavioral discipline and risk caps rather than technical indicators.",
                ),
                engine_used=provider_name,
            )

        # Validate extracted rule payload through Task 19 validator
        rule_payload = parsed_json.get("rule")
        if not rule_payload or not isinstance(rule_payload, dict):
            return TranslateRuleResponse(
                success=False,
                is_supported=False,
                explanation="Model did not return a valid rule payload object.",
                unsupported_reason="Malformed LLM translation response.",
                engine_used=provider_name,
            )

        val_res = validate_rule(rule_payload)
        if not val_res.is_valid or val_res.rule is None:
            logger.warning(
                "LLM rule payload failed schema validation: %s. Falling back.", val_res.error_summary
            )
            return TranslateRuleResponse(
                success=False,
                is_supported=False,
                explanation="Generated rule did not meet strict catalog boundary criteria.",
                unsupported_reason=val_res.error_summary,
                engine_used=provider_name,
            )

        return TranslateRuleResponse(
            success=True,
            is_supported=True,
            rule=serialize_rule(val_res.rule),
            rule_type=val_res.rule_type,
            explanation=parsed_json.get(
                "explanation", f"Rule compiled successfully as {val_res.rule_type}."
            ),
            engine_used=provider_name,
        )

    except Exception as exc:
        logger.error("LLM rule translation failed with error: %s", exc)
        return TranslateRuleResponse(
            success=False,
            is_supported=False,
            explanation="Could not automatically translate your rule description.",
            unsupported_reason=(
                "Please describe a behavioral rule like: 'Pause for 15 minutes after taking a loss', "
                "'Max 5 trades per day', or 'Cap daily loss at ₹5,000'."
            ),
            engine_used="FALLBACK",
        )
