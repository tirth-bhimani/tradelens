"""TradeLens Deterministic Trade Replay Engine & 70/30 Split (Task 21).

Simulates counter-factual rule enforcement against historical closed trades, generating
side-by-side performance metrics, dual equity curves, skipped trade diagnostic ledgers,
70/30 chronological train/test partitions, and quantitative overfitting detection.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field

from app.engine.core_metrics import CoreMetricsEngine, to_currency, to_pct
from app.models.metrics import PerformanceReport, PerformanceSummary
from app.models.trade import PairedTrade
from app.rules.catalog import TradingRule
from app.rules.evaluator import TradeReplayState, evaluate_trade

IST = ZoneInfo("Asia/Kolkata")


# ==============================================================================
# Replay Data Models & Schemas
# ==============================================================================
class SkippedTradeDetail(BaseModel):
    """Diagnostic detail of a trade that was disqualified by rule enforcement."""

    trade_id: UUID = Field(..., description="UUID of the skipped round-trip trade")
    symbol: str = Field(..., description="Trading symbol, e.g. NIFTY24OCT25000CE")
    entry_time: datetime = Field(..., description="Original entry timestamp")
    exit_time: datetime = Field(..., description="Original exit timestamp")
    net_pnl: Decimal = Field(..., description="Realized net P&L that was avoided or sacrificed in INR")
    rule_type: str = Field(..., description="Catalog rule type that triggered the skip")
    reason: str = Field(..., description="Human-readable explanation of why the trade was disqualified")


class SkippedTradesSummary(BaseModel):
    """Aggregate financial impact of all trades skipped under the rule."""

    total_skipped: int = Field(default=0, ge=0, description="Total count of trades skipped")
    losing_trades_avoided_count: int = Field(default=0, ge=0, description="Count of losing trades avoided")
    loss_avoided_inr: Decimal = Field(default=Decimal("0.00"), description="Positive sum of avoided losses in INR")
    winning_trades_sacrificed_count: int = Field(default=0, ge=0, description="Count of profitable trades missed")
    profit_sacrificed_inr: Decimal = Field(default=Decimal("0.00"), description="Positive sum of sacrificed profits in INR")
    net_savings_inr: Decimal = Field(default=Decimal("0.00"), description="Net financial edge (loss_avoided - profit_sacrificed)")


class MetricDelta(BaseModel):
    """Quantitative comparison between Before and After performance metrics."""

    pnl_delta_inr: Decimal = Field(..., description="Net P&L difference (After - Before) in INR")
    pnl_percentage_change: Decimal | None = Field(default=None, description="Percentage change in Net P&L if base != 0")
    trades_delta: int = Field(..., description="Change in total executed trades count")
    win_rate_delta: Decimal = Field(..., description="Difference in win rate percentage points")
    profit_factor_delta: Decimal | None = Field(default=None, description="Change in Profit Factor")
    max_drawdown_delta_inr: Decimal = Field(..., description="Change in Maximum Drawdown magnitude in INR")
    expectancy_delta_inr: Decimal = Field(..., description="Change in expected return per trade in INR")


class DualEquityPoint(BaseModel):
    """Synchronized timeline point for side-by-side actual vs simulated equity curves."""

    timestamp: datetime = Field(..., description="Timestamp of the equity evaluation (entry or exit)")
    trade_id: UUID | None = Field(default=None, description="UUID of the associated trade, or None for initial baseline")
    actual_equity: Decimal = Field(..., description="Cumulative actual account equity in INR")
    simulated_equity: Decimal = Field(..., description="Cumulative rule-simulated account equity in INR")
    is_skipped: bool = Field(default=False, description="True if this trade was skipped by the rule simulation")


class SplitMetrics(BaseModel):
    """Before vs After metrics for a specific dataset partition (Train or Test)."""

    before: PerformanceSummary = Field(..., description="Pre-rule performance metrics")
    after: PerformanceSummary = Field(..., description="Post-rule simulated performance metrics")
    delta: MetricDelta = Field(..., description="Metric deltas for this partition")


class ReplayResult(BaseModel):
    """Complete institutional output contract for a deterministic rule replay simulation."""

    rule_type: str = Field(..., description="Type of the evaluated rule catalog item")
    overall_before: PerformanceSummary = Field(..., description="Overall dataset performance before rule")
    overall_after: PerformanceSummary = Field(..., description="Overall dataset performance after rule enforcement")
    delta: MetricDelta = Field(..., description="Overall metric deltas")
    train_metrics: SplitMetrics = Field(..., description="70% in-sample training partition metrics")
    test_metrics: SplitMetrics = Field(..., description="30% out-of-sample testing partition metrics")
    is_overfit: bool = Field(default=False, description="True if rule performs well on train but degrades on test")
    overfit_reason: str | None = Field(default=None, description="Detailed explanation if overfitting was detected")
    small_sample_warning: bool = Field(default=False, description="True if total trades < 30 or test trades < 10")
    small_sample_reason: str | None = Field(default=None, description="Warning note regarding sample size confidence")
    skipped_summary: SkippedTradesSummary = Field(..., description="Aggregate financial impact of skipped trades")
    skipped_trades: list[SkippedTradeDetail] = Field(default_factory=list, description="Granular list of skipped trades")
    dual_equity_curve: list[DualEquityPoint] = Field(default_factory=list, description="Dual equity timeseries points")


class ReplayRequest(BaseModel):
    """API request payload for executing a counter-factual rule replay."""

    rule: TradingRule = Field(..., description="Validated rule catalog model or CompositeRule")
    trades: list[PairedTrade] = Field(..., min_length=1, description="List of closed round-trip trades")
    starting_capital: float = Field(default=100000.0, gt=0, description="Starting account capital in INR")
    train_ratio: float = Field(default=0.70, ge=0.50, le=0.90, description="Chronological train split ratio (default 0.70)")


# ==============================================================================
# Metric Calculations & Deltas
# ==============================================================================
def calculate_metric_delta(
    before_report: PerformanceReport,
    after_report: PerformanceReport,
) -> MetricDelta:
    """Computes exact decimal deltas between before and after PerformanceReports."""
    b_sum = before_report.summary
    a_sum = after_report.summary

    pnl_delta = to_currency(a_sum.total_net_pnl - b_sum.total_net_pnl)

    # Percentage change relative to before baseline
    pct_change: Decimal | None = None
    if b_sum.total_net_pnl != Decimal("0.00"):
        pct_change = to_pct(
            ((a_sum.total_net_pnl - b_sum.total_net_pnl) / abs(b_sum.total_net_pnl)) * Decimal("100")
        )

    trades_delta = a_sum.total_trades - b_sum.total_trades
    win_rate_delta = to_pct(a_sum.win_rate - b_sum.win_rate)

    # Profit factor delta
    pf_delta: Decimal | None = None
    if (
        after_report.expectancy.profit_factor is not None
        and before_report.expectancy.profit_factor is not None
    ):
        pf_delta = to_currency(after_report.expectancy.profit_factor - before_report.expectancy.profit_factor)

    # Drawdown magnitude delta (after - before; negative means reduced drawdown which is good!)
    dd_delta = to_currency(after_report.drawdown.max_drawdown_inr - before_report.drawdown.max_drawdown_inr)

    # Expectancy per trade delta
    exp_delta = to_currency(after_report.expectancy.expectancy_inr - before_report.expectancy.expectancy_inr)

    return MetricDelta(
        pnl_delta_inr=pnl_delta,
        pnl_percentage_change=pct_change,
        trades_delta=trades_delta,
        win_rate_delta=win_rate_delta,
        profit_factor_delta=pf_delta,
        max_drawdown_delta_inr=dd_delta,
        expectancy_delta_inr=exp_delta,
    )


def summarize_skipped_trades(skipped_trades: list[SkippedTradeDetail]) -> SkippedTradesSummary:
    """Aggregates skipped trades into avoided losses vs sacrificed gains."""
    total_skipped = len(skipped_trades)
    loss_count = 0
    loss_sum = Decimal("0.00")
    win_count = 0
    win_sum = Decimal("0.00")

    for t in skipped_trades:
        if t.net_pnl < Decimal("0.00"):
            loss_count += 1
            loss_sum += abs(t.net_pnl)
        elif t.net_pnl > Decimal("0.00"):
            win_count += 1
            win_sum += t.net_pnl

    return SkippedTradesSummary(
        total_skipped=total_skipped,
        losing_trades_avoided_count=loss_count,
        loss_avoided_inr=to_currency(loss_sum),
        winning_trades_sacrificed_count=win_count,
        profit_sacrificed_inr=to_currency(win_sum),
        net_savings_inr=to_currency(loss_sum - win_sum),
    )


# ==============================================================================
# Simulation Loop & Dual Equity Timeseries
# ==============================================================================
def run_replay_simulation(
    trades: Sequence[PairedTrade],
    rule: TradingRule,
    starting_capital: Decimal = Decimal("100000.00"),
) -> tuple[list[PairedTrade], list[SkippedTradeDetail], list[DualEquityPoint]]:
    """Runs a chronological simulation of trades against the provided rule.

    Returns:
        (executed_trades, skipped_trades, dual_equity_curve)
    """
    if not trades:
        return [], [], []

    # Deterministic chronological sort by entry_time, then exit_time, then trade ID
    sorted_trades = sorted(trades, key=lambda t: (t.entry_time, t.exit_time, str(t.id)))

    state = TradeReplayState()
    executed_trades: list[PairedTrade] = []
    skipped_trades: list[SkippedTradeDetail] = []
    dual_curve: list[DualEquityPoint] = []

    # Initial baseline point
    dual_curve.append(
        DualEquityPoint(
            timestamp=sorted_trades[0].entry_time,
            trade_id=None,
            actual_equity=to_currency(starting_capital),
            simulated_equity=to_currency(starting_capital),
            is_skipped=False,
        )
    )

    running_actual = starting_capital
    running_simulated = starting_capital

    for trade in sorted_trades:
        entry_ist = trade.entry_time.astimezone(IST)
        trade_date = entry_ist.date()

        # 1. Advance timeline state: process exits of earlier executed trades
        state.advance_to_time(trade.entry_time, trade_date, rule, starting_capital)

        # 2. Check if day is currently halted
        if state.daily_halted:
            reason = state.daily_halt_reason or "Session halted for the remainder of the day"
            skipped_trades.append(
                SkippedTradeDetail(
                    trade_id=trade.id,
                    symbol=trade.symbol,
                    entry_time=trade.entry_time,
                    exit_time=trade.exit_time,
                    net_pnl=trade.net_pnl,
                    rule_type=rule.rule_type,
                    reason=reason,
                )
            )
            running_actual += trade.net_pnl
            dual_curve.append(
                DualEquityPoint(
                    timestamp=trade.exit_time,
                    trade_id=trade.id,
                    actual_equity=to_currency(running_actual),
                    simulated_equity=to_currency(running_simulated),
                    is_skipped=True,
                )
            )
            continue

        # 3. Evaluate candidate trade entry
        allowed, skip_reason = evaluate_trade(trade, rule, state, starting_capital)

        if not allowed:
            reason = skip_reason or "Trade entry violated active risk rule"
            skipped_trades.append(
                SkippedTradeDetail(
                    trade_id=trade.id,
                    symbol=trade.symbol,
                    entry_time=trade.entry_time,
                    exit_time=trade.exit_time,
                    net_pnl=trade.net_pnl,
                    rule_type=rule.rule_type,
                    reason=reason,
                )
            )
            running_actual += trade.net_pnl
            # Simulated equity remains unchanged (loss or profit avoided)
            dual_curve.append(
                DualEquityPoint(
                    timestamp=trade.exit_time,
                    trade_id=trade.id,
                    actual_equity=to_currency(running_actual),
                    simulated_equity=to_currency(running_simulated),
                    is_skipped=True,
                )
            )
        else:
            # Trade executed
            executed_trades.append(trade)
            state.daily_trades_count += 1
            state.open_executed_trades.append(trade)

            running_actual += trade.net_pnl
            running_simulated += trade.net_pnl
            dual_curve.append(
                DualEquityPoint(
                    timestamp=trade.exit_time,
                    trade_id=trade.id,
                    actual_equity=to_currency(running_actual),
                    simulated_equity=to_currency(running_simulated),
                    is_skipped=False,
                )
            )

    return executed_trades, skipped_trades, dual_curve


# ==============================================================================
# Overfitting Detection & Sample Size Alerts
# ==============================================================================
def detect_overfitting(
    train_before: PerformanceReport,
    train_after: PerformanceReport,
    test_before: PerformanceReport,
    test_after: PerformanceReport,
) -> tuple[bool, str | None]:
    """Detects curve-fitting by comparing in-sample gains vs out-of-sample deterioration.

    A strategy is flagged as overfit if it improves on train data but degrades performance
    significantly on test data.
    """
    train_pnl_delta = train_after.summary.total_net_pnl - train_before.summary.total_net_pnl
    test_pnl_delta = test_after.summary.total_net_pnl - test_before.summary.total_net_pnl

    # If the rule didn't improve on train set, it's not overfitting (it's simply ineffective)
    if train_pnl_delta <= Decimal("0.00"):
        return False, None

    degradations: list[str] = []

    # 1. Net P&L deterioration on test set
    if test_before.summary.total_net_pnl > Decimal("0.00"):
        # For positive test baseline: drops by more than 20%
        if test_after.summary.total_net_pnl < (test_before.summary.total_net_pnl * Decimal("0.80")):
            pct_drop = ((test_before.summary.total_net_pnl - test_after.summary.total_net_pnl) / test_before.summary.total_net_pnl) * Decimal("100")
            degradations.append(f"out-of-sample net P&L dropped by {pct_drop:.1f}%")
    else:
        # For non-positive test baseline: worsened by > ₹1,000
        if test_pnl_delta < Decimal("-1000.00"):
            degradations.append(f"out-of-sample net P&L worsened by ₹{abs(test_pnl_delta):.2f}")

    # 2. Profit factor collapse on test set
    tr_pf = train_after.expectancy.profit_factor
    te_pf = test_after.expectancy.profit_factor
    if tr_pf is not None and tr_pf >= Decimal("1.25") and te_pf is not None and te_pf < Decimal("1.00"):
        degradations.append(f"out-of-sample profit factor fell to {te_pf:.2f} (<1.0) despite in-sample factor {tr_pf:.2f}")

    # 3. Win rate collapse on test set
    tr_wr_delta = train_after.summary.win_rate - train_before.summary.win_rate
    te_wr_delta = test_after.summary.win_rate - test_before.summary.win_rate
    if tr_wr_delta >= Decimal("0.00") and te_wr_delta <= Decimal("-10.00"):
        degradations.append(f"out-of-sample win rate dropped by {abs(te_wr_delta):.1f}%")

    if degradations:
        detail_msg = "; ".join(degradations)
        return True, (
            f"Overfitting detected: rule improved in-sample performance (+₹{train_pnl_delta:.2f}) "
            f"but degraded out-of-sample: {detail_msg}."
        )

    return False, None


# ==============================================================================
# Master Replay Orchestrator
# ==============================================================================
def execute_rule_replay(
    trades: Sequence[PairedTrade],
    rule: TradingRule,
    starting_capital: Decimal = Decimal("100000.00"),
    train_ratio: float = 0.70,
) -> ReplayResult:
    """Executes a full deterministic trade replay, generating train/test split metrics,

    dual equity curves, overfitting analysis, and skipped trade summaries.
    """
    if not trades:
        raise ValueError("At least one closed round-trip trade is required to run a replay simulation")

    sorted_trades = sorted(trades, key=lambda t: (t.entry_time, t.exit_time, str(t.id)))
    total_count = len(sorted_trades)

    # 1. 70/30 Chronological Partitioning
    if total_count >= 2:
        split_idx = max(1, min(total_count - 1, int(total_count * train_ratio)))
        train_trades = sorted_trades[:split_idx]
        test_trades = sorted_trades[split_idx:]
    else:
        train_trades = sorted_trades
        test_trades = sorted_trades

    # 2. Run simulation across Overall, Train, and Test sets
    overall_exec, overall_skip, dual_curve = run_replay_simulation(
        sorted_trades, rule, starting_capital
    )
    train_exec, _, _ = run_replay_simulation(train_trades, rule, starting_capital)
    test_exec, _, _ = run_replay_simulation(test_trades, rule, starting_capital)

    # 3. Calculate CoreMetricsReports using Task 11 CoreMetricsEngine
    overall_before = CoreMetricsEngine.calculate_metrics(sorted_trades, starting_capital=starting_capital)
    overall_after = CoreMetricsEngine.calculate_metrics(overall_exec, starting_capital=starting_capital)

    train_before = CoreMetricsEngine.calculate_metrics(train_trades, starting_capital=starting_capital)
    train_after = CoreMetricsEngine.calculate_metrics(train_exec, starting_capital=starting_capital)

    test_before = CoreMetricsEngine.calculate_metrics(test_trades, starting_capital=starting_capital)
    test_after = CoreMetricsEngine.calculate_metrics(test_exec, starting_capital=starting_capital)

    # 4. Deltas & Summaries
    overall_delta = calculate_metric_delta(overall_before, overall_after)
    train_delta = calculate_metric_delta(train_before, train_after)
    test_delta = calculate_metric_delta(test_before, test_after)
    skipped_summary = summarize_skipped_trades(overall_skip)

    # 5. Overfitting & Sample Size Safeguards
    is_overfit, overfit_reason = detect_overfitting(
        train_before=train_before,
        train_after=train_after,
        test_before=test_before,
        test_after=test_after,
    )

    small_sample_warning = total_count < 30 or len(test_trades) < 10
    small_sample_reason: str | None = None
    if small_sample_warning:
        small_sample_reason = (
            f"Low statistical sample: total trades ({total_count}) is below 30 or "
            f"out-of-sample test sample ({len(test_trades)}) is below 10. "
            f"Metrics and split results may have elevated variance."
        )

    return ReplayResult(
        rule_type=rule.rule_type,
        overall_before=overall_before.summary,
        overall_after=overall_after.summary,
        delta=overall_delta,
        train_metrics=SplitMetrics(
            before=train_before.summary,
            after=train_after.summary,
            delta=train_delta,
        ),
        test_metrics=SplitMetrics(
            before=test_before.summary,
            after=test_after.summary,
            delta=test_delta,
        ),
        is_overfit=is_overfit,
        overfit_reason=overfit_reason,
        small_sample_warning=small_sample_warning,
        small_sample_reason=small_sample_reason,
        skipped_summary=skipped_summary,
        skipped_trades=overall_skip,
        dual_equity_curve=dual_curve,
    )
