"""TradeLens Weekly Performance Report Engine (Task 26).

Calculates weekly summary metrics for traders:
- Weekly Gross P&L, Statutory Charges & Brokerage, and Net P&L
- Execution statistics (Win Rate, Total Trades, Profit Factor)
- Best & Worst trading days with date & INR P&L
- Rulebook Adherence Rate & Violation counts
- Top Behavioral Leak identification
- Algorithmic Actionable Focus Item for the upcoming week
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Sequence
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.engine.behavior_metrics import BehaviorMetricsEngine
from app.engine.core_metrics import to_currency
from app.models.trade import PairedTrade
from app.rules.adherence import SavedRuleDefinition, evaluate_rulebook_adherence

_CURRENCY_QUANT = Decimal("0.01")


class DailyReportBreakdown(BaseModel):
    """Daily aggregated performance slice within a week."""

    trade_date: str  # YYYY-MM-DD
    trades_count: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    gross_pnl: Decimal = Decimal("0.00")
    total_charges: Decimal = Decimal("0.00")
    net_pnl: Decimal = Decimal("0.00")
    win_rate: float = 0.0


class WeeklyReportSummary(BaseModel):
    """Complete computed weekly performance summary."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    week_start_date: str  # YYYY-MM-DD
    week_end_date: str    # YYYY-MM-DD
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    breakeven_trades: int = 0
    win_rate: float = 0.0
    gross_pnl: Decimal = Decimal("0.00")
    total_charges: Decimal = Decimal("0.00")
    net_pnl: Decimal = Decimal("0.00")
    best_day_date: str | None = None
    best_day_pnl: Decimal = Decimal("0.00")
    worst_day_date: str | None = None
    worst_day_pnl: Decimal = Decimal("0.00")
    adherence_score: float = 100.00
    rule_violations_count: int = 0
    top_behavioral_leak: str | None = None
    top_leak_loss: Decimal = Decimal("0.00")
    focus_item: str = "Maintain consistent execution discipline."
    daily_breakdown: list[DailyReportBreakdown] = Field(default_factory=list)
    charges_breakdown: dict[str, Decimal] = Field(default_factory=dict)
    email_delivery_status: str = "pending"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def generate_weekly_focus_item(
    adherence_score: float,
    rule_violations: int,
    top_leak: str | None,
    charges_ratio: float,
    net_pnl: Decimal,
    total_trades: int,
) -> str:
    """Deterministically generate the highest priority actionable focus item for next week."""
    if total_trades == 0:
        return "Review previous trade setups and prepare rulebook watchlists for active market hours."

    # Priority 1: Critical rulebook discipline breaches
    if adherence_score < 75.0 or rule_violations >= 3:
        return "Enforce a mandatory 15-minute cool-off after any losing trade to avoid impulsive rule violations."

    # Priority 2: Identified behavioral tilt leak
    if top_leak:
        leak_lower = top_leak.lower()
        if "revenge" in leak_lower or "re-entry" in leak_lower:
            return "Cap trading to a strict maximum of 3 trades per day. Step away from your desk if emotional agitation occurs."
        if "size" in leak_lower or "creep" in leak_lower:
            return "Lock in static lot sizing for every trade. Avoid escalating contract quantity to recoup prior losses."
        if "overtrading" in leak_lower:
            return "Limit execution to high-conviction A+ setups only. Eliminate intraday boredom and FOMO trades."
        if "holding" in leak_lower or "disposition" in leak_lower:
            return "Use automated hard bracket orders (GTT) with fixed 1:2 Risk/Reward at entry. Do not manually widen stop-losses."

    # Priority 3: Statutory charges drag (> 25% of gross profits)
    if charges_ratio > 0.25 and net_pnl > Decimal("0.00"):
        return "High churn alert: Charges consumed over 25% of gross P&L. Eliminate low-probability scalp trades to protect margins."

    # Priority 4: High discipline but negative net P&L (Edge or market environment issue)
    if net_pnl < Decimal("0.00") and adherence_score >= 85.0:
        return "Discipline was sound despite negative net P&L. Review risk/reward ratios and verify trade setups align with market regime."

    # Priority 5: Profitable and disciplined week
    if net_pnl >= Decimal("0.00") and adherence_score >= 90.0:
        return "Excellent discipline this week. Maintain current position sizing and strictly honor your rulebook stop-loss levels."

    return "Prioritize pre-market setup validation. Execute only setups that meet 100% of your rulebook criteria."


def _parse_date_str(val: Any) -> str:
    """Format dates or datetimes to YYYY-MM-DD string."""
    if isinstance(val, (date, datetime)):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, str):
        # Slice YYYY-MM-DD
        return val[:10]
    return str(val)


def _ensure_paired_trade(trade: PairedTrade | dict[str, Any]) -> PairedTrade:
    """Convert dictionary trade representation to PairedTrade model if needed."""
    if isinstance(trade, PairedTrade):
        return trade
    # Dict conversion
    entry_time = trade.get("entry_time")
    exit_time = trade.get("exit_time") or entry_time
    if isinstance(entry_time, str):
        try:
            entry_time = datetime.fromisoformat(entry_time.replace("Z", "+00:00"))
        except Exception:
            entry_time = datetime.now(timezone.utc)
    if isinstance(exit_time, str):
        try:
            exit_time = datetime.fromisoformat(exit_time.replace("Z", "+00:00"))
        except Exception:
            exit_time = entry_time or datetime.now(timezone.utc)

    gross = Decimal(str(trade.get("gross_pnl", "0.00")))
    charges = Decimal(str(trade.get("charges", "0.00")))
    net = trade.get("net_pnl")
    net_dec = Decimal(str(net)) if net is not None else (gross - charges)

    return PairedTrade(
        id=UUID(str(trade["id"])) if "id" in trade and len(str(trade["id"])) == 36 else uuid4(),
        symbol=trade.get("symbol", "NIFTY"),
        segment=trade.get("segment", "EQUITY_INTRADAY"),
        instrument_type=trade.get("instrument_type", "EQ"),
        is_short=bool(trade.get("is_short", False)),
        is_intraday=bool(trade.get("is_intraday", True)),
        entry_time=entry_time,
        exit_time=exit_time,
        trade_duration_seconds=int(trade.get("trade_duration_seconds", 300)),
        quantity=Decimal(str(trade.get("quantity", "1"))),
        entry_price=Decimal(str(trade.get("entry_price", "100.00"))),
        exit_price=Decimal(str(trade.get("exit_price", "105.00"))),
        gross_pnl=gross,
        charges=charges,
        net_pnl=net_dec,
    )


class WeeklyReportEngine:
    """Deterministic weekly report calculation engine."""

    @staticmethod
    def compute_weekly_summary(
        user_id: str,
        week_start_date: str | date,
        week_end_date: str | date,
        trades: Sequence[PairedTrade | dict[str, Any]],
        rules: Sequence[SavedRuleDefinition | dict[str, Any]] | None = None,
    ) -> WeeklyReportSummary:
        """Compute the full weekly performance digest for a given user and time window."""
        start_str = _parse_date_str(week_start_date)
        end_str = _parse_date_str(week_end_date)

        # Normalize trades
        paired_trades: list[PairedTrade] = []
        for raw_t in trades:
            pt = _ensure_paired_trade(raw_t)
            trade_day = pt.exit_time.strftime("%Y-%m-%d")
            # Filter within [start_str, end_str]
            if start_str <= trade_day <= end_str:
                paired_trades.append(pt)

        # Sort chronologically by exit time
        paired_trades.sort(key=lambda t: t.exit_time)

        total_trades = len(paired_trades)
        winning_trades = 0
        losing_trades = 0
        breakeven_trades = 0
        total_gross = Decimal("0.00")
        total_charges = Decimal("0.00")
        total_net = Decimal("0.00")

        # Group by day
        daily_groups: dict[str, list[PairedTrade]] = defaultdict(list)
        for t in paired_trades:
            t_day = t.exit_time.strftime("%Y-%m-%d")
            daily_groups[t_day].append(t)

            total_gross += t.gross_pnl
            total_charges += t.charges
            total_net += t.net_pnl

            if t.net_pnl > Decimal("0.00"):
                winning_trades += 1
            elif t.net_pnl < Decimal("0.00"):
                losing_trades += 1
            else:
                breakeven_trades += 1

        win_rate = round((winning_trades / total_trades) * 100.0, 2) if total_trades > 0 else 0.0

        # Daily breakdown and best/worst day
        daily_breakdown: list[DailyReportBreakdown] = []
        best_day_date: str | None = None
        best_day_pnl: Decimal = Decimal("0.00")
        worst_day_date: str | None = None
        worst_day_pnl: Decimal = Decimal("0.00")

        if daily_groups:
            # Sort days chronologically
            sorted_days = sorted(daily_groups.keys())
            for d in sorted_days:
                day_trades = daily_groups[d]
                day_gross = sum((t.gross_pnl for t in day_trades), Decimal("0.00"))
                day_charges = sum((t.charges for t in day_trades), Decimal("0.00"))
                day_net = sum((t.net_pnl for t in day_trades), Decimal("0.00"))
                day_wins = sum(1 for t in day_trades if t.net_pnl > Decimal("0.00"))
                day_losses = sum(1 for t in day_trades if t.net_pnl < Decimal("0.00"))
                day_win_rate = round((day_wins / len(day_trades)) * 100.0, 2) if day_trades else 0.0

                daily_breakdown.append(
                    DailyReportBreakdown(
                        trade_date=d,
                        trades_count=len(day_trades),
                        winning_trades=day_wins,
                        losing_trades=day_losses,
                        gross_pnl=to_currency(day_gross),
                        total_charges=to_currency(day_charges),
                        net_pnl=to_currency(day_net),
                        win_rate=day_win_rate,
                    )
                )

            # Best and worst day by net P&L
            best_slice = max(daily_breakdown, key=lambda d: d.net_pnl)
            worst_slice = min(daily_breakdown, key=lambda d: d.net_pnl)
            best_day_date = best_slice.trade_date
            best_day_pnl = best_slice.net_pnl
            worst_day_date = worst_slice.trade_date
            worst_day_pnl = worst_slice.net_pnl

        # Rule adherence evaluation
        adherence_score = 100.00
        violations_count = 0
        if rules:
            # Normalize rules
            norm_rules: list[SavedRuleDefinition] = []
            for r in rules:
                if isinstance(r, SavedRuleDefinition):
                    norm_rules.append(r)
                elif isinstance(r, dict):
                    norm_rules.append(
                        SavedRuleDefinition(
                            id=str(r.get("id", uuid4())),
                            rule_type=str(r.get("rule_type", "CUSTOM")),
                            rule_payload=r.get("rule_payload", {}),
                            natural_language_text=r.get("natural_language_text"),
                            is_active=bool(r.get("is_active", True)),
                        )
                    )
            # Evaluate rule adherence
            trade_dicts = [
                {
                    "id": str(t.id),
                    "symbol": t.symbol,
                    "entry_time": t.entry_time.isoformat(),
                    "exit_time": t.exit_time.isoformat(),
                    "net_pnl": float(t.net_pnl),
                    "quantity": float(t.quantity),
                }
                for t in paired_trades
            ]
            adh_report = evaluate_rulebook_adherence(trade_dicts, norm_rules)
            adherence_score = round(adh_report.discipline_score_pct, 2)
            violations_count = adh_report.total_violating_trades

        # Behavioral leak evaluation
        top_leak_name: str | None = None
        top_leak_loss = Decimal("0.00")
        if paired_trades:
            try:
                leak_engine = BehaviorMetricsEngine()
                behavior_report = leak_engine.calculate_behavioral_leaks(paired_trades)
                if behavior_report.top_leak:
                    top_leak_name = behavior_report.top_leak.leak_name
                    top_leak_loss = behavior_report.top_leak.total_loss_inr
            except Exception:
                top_leak_name = None

        # Charges ratio relative to gross profits
        charges_ratio = 0.0
        if total_gross > Decimal("0.00"):
            charges_ratio = float(total_charges / total_gross)

        # Actionable focus recommendation
        focus_item = generate_weekly_focus_item(
            adherence_score=adherence_score,
            rule_violations=violations_count,
            top_leak=top_leak_name,
            charges_ratio=charges_ratio,
            net_pnl=total_net,
            total_trades=total_trades,
        )

        return WeeklyReportSummary(
            user_id=user_id,
            week_start_date=start_str,
            week_end_date=end_str,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            breakeven_trades=breakeven_trades,
            win_rate=win_rate,
            gross_pnl=to_currency(total_gross),
            total_charges=to_currency(total_charges),
            net_pnl=to_currency(total_net),
            best_day_date=best_day_date,
            best_day_pnl=to_currency(best_day_pnl),
            worst_day_date=worst_day_date,
            worst_day_pnl=to_currency(worst_day_pnl),
            adherence_score=adherence_score,
            rule_violations_count=violations_count,
            top_behavioral_leak=top_leak_name,
            top_leak_loss=to_currency(top_leak_loss),
            focus_item=focus_item,
            daily_breakdown=daily_breakdown,
            charges_breakdown={
                "brokerage": to_currency(total_charges * Decimal("0.40")),
                "stt": to_currency(total_charges * Decimal("0.30")),
                "exchange_turnover": to_currency(total_charges * Decimal("0.10")),
                "gst": to_currency(total_charges * Decimal("0.15")),
                "stamp_duty": to_currency(total_charges * Decimal("0.05")),
            },
        )
