"""TradeLens Rule Adherence Tracker & Post-Import Evaluation Engine (Task 23).

Evaluates imported round-trip trades chronologically against a user's active
trading rulebook to detect rule breaches, compute the Discipline Score, and tally
avoidable losses incurred from undisciplined entries.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field

IST = ZoneInfo("Asia/Kolkata")


class SavedRuleDefinition(BaseModel):
    """User-saved rule configuration from database."""

    id: str
    rule_type: str
    rule_payload: dict[str, Any] = Field(default_factory=dict)
    natural_language_text: str | None = None
    is_active: bool = True


class TradeViolation(BaseModel):
    """Specific rule violation detected on an executed trade."""

    trade_id: str
    symbol: str
    entry_time: str
    rule_id: str
    rule_type: str
    violation_code: str
    penalty_pnl: float
    explanation: str


class RuleAdherenceStat(BaseModel):
    """Adherence score and violation metrics for a specific rule."""

    rule_id: str
    rule_type: str
    is_active: bool
    total_evaluations: int
    violations_count: int
    adherence_pct: float
    avoidable_loss_incurred: float


class AdherenceReport(BaseModel):
    """Aggregated discipline scorecard and violation breakdown."""

    total_trades_evaluated: int
    total_adhering_trades: int
    total_violating_trades: int
    discipline_score_pct: float
    total_avoidable_losses_incurred: float
    violations: list[TradeViolation]
    rules_breakdown: list[RuleAdherenceStat]
    evaluated_at: str


def _parse_time(t: Any) -> datetime:
    """Helper to parse datetime strings or objects into IST datetime."""
    if isinstance(t, datetime):
        return t if t.tzinfo else t.replace(tzinfo=IST)
    if isinstance(t, str):
        # Handle ISO strings
        clean = t.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        return dt if dt.tzinfo else dt.replace(tzinfo=IST)
    return datetime.now(IST)


def evaluate_rulebook_adherence(
    trades: list[dict[str, Any]],
    rules: list[SavedRuleDefinition],
) -> AdherenceReport:
    """Evaluate chronologically sorted trades against all active rules in the user's rulebook.

    Args:
        trades: List of paired round-trip trade dictionaries.
        rules: List of saved rule definitions from the user's rulebook.

    Returns:
        AdherenceReport summarizing discipline score, violations, and avoidable losses.
    """
    if not trades or not rules:
        return AdherenceReport(
            total_trades_evaluated=len(trades),
            total_adhering_trades=len(trades),
            total_violating_trades=0,
            discipline_score_pct=100.0,
            total_avoidable_losses_incurred=0.0,
            violations=[],
            rules_breakdown=[],
            evaluated_at=datetime.now(IST).isoformat(),
        )

    # Filter to active rules only
    active_rules = [r for r in rules if r.is_active]

    # Sort trades chronologically by entry_time
    sorted_trades = sorted(trades, key=lambda x: _parse_time(x.get("entry_time") or x.get("entryTime") or ""))

    violations: list[TradeViolation] = []
    rule_violation_counts: dict[str, int] = {r.id: 0 for r in rules}
    rule_avoidable_losses: dict[str, float] = {r.id: 0.0 for r in rules}

    # Tracking timeline state per day
    current_date: date | None = None
    daily_trade_count = 0
    daily_cum_pnl = 0.0
    last_loss_exit_time: datetime | None = None
    last_loss_amount = 0.0

    violating_trade_ids: set[str] = set()

    for trade in sorted_trades:
        trade_id = str(trade.get("id") or trade.get("trade_id") or "")
        symbol = str(trade.get("symbol") or "")
        entry_time_dt = _parse_time(trade.get("entry_time") or trade.get("entryTime"))
        exit_time_dt = _parse_time(trade.get("exit_time") or trade.get("exitTime") or trade.get("entry_time"))
        net_pnl = float(trade.get("net_pnl") if trade.get("net_pnl") is not None else trade.get("netPnl", 0.0))
        quantity = float(trade.get("quantity") or trade.get("qty") or 0.0)

        trade_date = entry_time_dt.date()
        if current_date != trade_date:
            current_date = trade_date
            daily_trade_count = 0
            daily_cum_pnl = 0.0
            last_loss_exit_time = None
            last_loss_amount = 0.0

        daily_trade_count += 1
        trade_has_violation = False

        # Evaluate against each active rule
        for rule in active_rules:
            payload = rule.rule_payload or {}
            violated = False
            violation_code = ""
            explanation = ""

            # Rule 1: COOL_OFF_AFTER_LOSS
            if rule.rule_type == "COOL_OFF_AFTER_LOSS":
                cooldown_minutes = int(payload.get("cooldown_minutes", 15))
                trigger_loss = float(payload.get("trigger_loss_inr") or payload.get("loss_threshold") or 0.0)

                if last_loss_exit_time is not None:
                    gap_seconds = (entry_time_dt - last_loss_exit_time).total_seconds()
                    if gap_seconds < cooldown_minutes * 60:
                        if trigger_loss <= 0 or abs(last_loss_amount) >= trigger_loss:
                            violated = True
                            violation_code = "COOLDOWN_VIOLATION"
                            actual_gap_min = max(0, int(gap_seconds // 60))
                            explanation = (
                                f"Re-entered after {actual_gap_min}m; required {cooldown_minutes}m cooldown "
                                f"after previous loss of ₹{abs(last_loss_amount):,.2f}."
                            )

            # Rule 2: MAX_TRADES_PER_DAY / MAX_DAILY_TRADES_LIMIT
            elif rule.rule_type in ("MAX_TRADES_PER_DAY", "MAX_DAILY_TRADES_LIMIT"):
                max_trades = int(payload.get("max_trades") or payload.get("max_daily_trades") or 4)
                if daily_trade_count > max_trades:
                    violated = True
                    violation_code = "OVERTRADING_CAP_EXCEEDED"
                    explanation = f"Trade #{daily_trade_count} executed beyond daily limit of {max_trades} trades."

            # Rule 3: DAILY_LOSS_CUTOFF / DAILY_LOSS_LIMIT
            elif rule.rule_type in ("DAILY_LOSS_CUTOFF", "DAILY_LOSS_LIMIT"):
                max_loss = abs(float(payload.get("max_loss") or payload.get("max_daily_loss_inr") or 5000.0))
                if daily_cum_pnl <= -max_loss:
                    violated = True
                    violation_code = "DAILY_LOSS_CUTOFF_BREACHED"
                    explanation = f"Executed after cumulative daily loss reached ₹{abs(daily_cum_pnl):,.2f} (cutoff: ₹{max_loss:,.2f})."

            # Rule 4: MAX_POSITION_SIZE
            elif rule.rule_type == "MAX_POSITION_SIZE":
                max_qty = float(payload.get("max_quantity") or payload.get("max_qty") or 0.0)
                if max_qty > 0 and quantity > max_qty:
                    violated = True
                    violation_code = "MAX_POSITION_SIZE_EXCEEDED"
                    explanation = f"Position quantity ({quantity}) exceeded maximum lot limit ({max_qty})."

            # Rule 5: NO_CHOP_ZONE / TIME_OF_DAY_CUTOFF
            elif rule.rule_type in ("NO_CHOP_ZONE", "TIME_OF_DAY_CUTOFF"):
                start_str = payload.get("start_time", "11:30")
                end_str = payload.get("end_time", "13:30")
                entry_hhmm = entry_time_dt.strftime("%H:%M")
                if start_str <= entry_hhmm <= end_str:
                    violated = True
                    violation_code = "RESTRICTED_TIME_WINDOW"
                    explanation = f"Trade entered at {entry_hhmm} during restricted chop zone ({start_str} - {end_str})."

            if violated:
                trade_has_violation = True
                violating_trade_ids.add(trade_id)
                rule_violation_counts[rule.id] += 1
                avoidable_loss = abs(net_pnl) if net_pnl < 0 else 0.0
                rule_avoidable_losses[rule.id] += avoidable_loss

                violations.append(
                    TradeViolation(
                        trade_id=trade_id,
                        symbol=symbol,
                        entry_time=entry_time_dt.isoformat(),
                        rule_id=rule.id,
                        rule_type=rule.rule_type,
                        violation_code=violation_code,
                        penalty_pnl=net_pnl,
                        explanation=explanation,
                    )
                )

        # Update end-of-trade state
        daily_cum_pnl += net_pnl
        if net_pnl < 0:
            last_loss_exit_time = exit_time_dt
            last_loss_amount = net_pnl

    total_evaluated = len(sorted_trades)
    violating_trades_count = len(violating_trade_ids)
    adhering_trades_count = total_evaluated - violating_trades_count

    score_pct = round((adhering_trades_count / total_evaluated * 100.0), 1) if total_evaluated > 0 else 100.0
    total_avoidable_losses = sum(
        abs(v.penalty_pnl) for v in violations if v.penalty_pnl < 0
    )

    # Build rules breakdown
    rules_breakdown: list[RuleAdherenceStat] = []
    for r in rules:
        count = rule_violation_counts.get(r.id, 0)
        adherence_rate = (
            round(((total_evaluated - count) / total_evaluated * 100.0), 1)
            if total_evaluated > 0
            else 100.0
        )
        rules_breakdown.append(
            RuleAdherenceStat(
                rule_id=r.id,
                rule_type=r.rule_type,
                is_active=r.is_active,
                total_evaluations=total_evaluated,
                violations_count=count,
                adherence_pct=adherence_rate,
                avoidable_loss_incurred=rule_avoidable_losses.get(r.id, 0.0),
            )
        )

    return AdherenceReport(
        total_trades_evaluated=total_evaluated,
        total_adhering_trades=adhering_trades_count,
        total_violating_trades=violating_trades_count,
        discipline_score_pct=score_pct,
        total_avoidable_losses_incurred=round(total_avoidable_losses, 2),
        violations=violations,
        rules_breakdown=rules_breakdown,
        evaluated_at=datetime.now(IST).isoformat(),
    )
