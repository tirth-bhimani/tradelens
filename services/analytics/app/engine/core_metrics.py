"""TradeLens Core Trading Performance Metrics Engine.

High-precision deterministic calculation engine for institutional trading metrics,
including Win Rate, Profit Factor, Expectancy, Max Drawdown (₹ and %), Streaks,
Equity Curve generation, Daily Aggregations, and SHA-256 Fingerprint Caching.
"""

from __future__ import annotations

import hashlib
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from app.models.metrics import (
    DailyEquityPoint,
    DrawdownMetrics,
    EquityPoint,
    ExpectancyMetrics,
    PerformanceReport,
    PerformanceSummary,
    StreakMetrics,
    StreakType,
)
from app.models.trade import PairedTrade, TradeSegment

_CURRENCY_QUANT = Decimal("0.01")
_PERCENT_QUANT = Decimal("0.01")


def to_currency(val: Decimal) -> Decimal:
    """Quantizes a Decimal to standard Indian Rupee precision (0.01) with ROUND_HALF_UP."""
    return val.quantize(_CURRENCY_QUANT, rounding=ROUND_HALF_UP)


def to_pct(val: Decimal) -> Decimal:
    """Quantizes a percentage Decimal to 2 decimal places with ROUND_HALF_UP."""
    return val.quantize(_PERCENT_QUANT, rounding=ROUND_HALF_UP)


class CoreMetricsEngine:
    """High-precision deterministic analytics engine for closed round-trip trades."""

    @classmethod
    def calculate_metrics(
        cls,
        trades: Sequence[PairedTrade],
        starting_capital: Decimal = Decimal("0.00"),
        from_date: date | None = None,
        to_date: date | None = None,
        segments: Sequence[TradeSegment] | None = None,
        symbols: Sequence[str] | None = None,
    ) -> PerformanceReport:
        """Computes complete performance report on the provided trades.

        Trades are filtered and chronologically sorted by (exit_time, entry_time, id).
        """
        # 1. Filter trades
        filtered = cls._filter_trades(
            trades=trades,
            from_date=from_date,
            to_date=to_date,
            segments=segments,
            symbols=symbols,
        )

        # 2. Deterministic chronological sort
        sorted_trades = sorted(
            filtered,
            key=lambda t: (t.exit_time, t.entry_time, str(t.id)),
        )

        # 3. Generate SHA-256 fingerprint hash
        dataset_hash = cls.generate_dataset_hash(
            trades=sorted_trades,
            starting_capital=starting_capital,
            from_date=from_date,
            to_date=to_date,
            segments=segments,
            symbols=symbols,
        )

        # 4. Handle empty trade boundary
        if not sorted_trades:
            return PerformanceReport(
                summary=PerformanceSummary(),
                expectancy=ExpectancyMetrics(),
                streaks=StreakMetrics(),
                drawdown=DrawdownMetrics(
                    max_drawdown_inr=Decimal("0.00"),
                    max_drawdown_pct=Decimal("0.00") if starting_capital > 0 else None,
                    current_drawdown_inr=Decimal("0.00"),
                    current_drawdown_pct=Decimal("0.00") if starting_capital > 0 else None,
                    is_in_drawdown=False,
                ),
                equity_curve=[],
                daily_equity_curve=[],
                dataset_hash=dataset_hash,
                starting_capital=to_currency(starting_capital),
                generated_at=datetime.now(UTC),
            )

        # 5. Summary calculations
        summary = cls.compute_summary(sorted_trades)

        # 6. Win/Loss & Expectancy
        expectancy = cls.compute_expectancy(sorted_trades, summary)

        # 7. Streaks
        streaks = cls.compute_streaks(sorted_trades)

        # 8. Drawdown and Equity Curve
        equity_curve, drawdown = cls.calculate_running_drawdown(
            trades=sorted_trades,
            starting_capital=starting_capital,
        )

        # 9. Daily Aggregations
        daily_equity_curve = cls.compute_daily_equity_curve(
            trades=sorted_trades,
            starting_capital=starting_capital,
        )

        return PerformanceReport(
            summary=summary,
            expectancy=expectancy,
            streaks=streaks,
            drawdown=drawdown,
            equity_curve=equity_curve,
            daily_equity_curve=daily_equity_curve,
            dataset_hash=dataset_hash,
            starting_capital=to_currency(starting_capital),
            generated_at=datetime.now(UTC),
        )

    @classmethod
    def _filter_trades(
        cls,
        trades: Sequence[PairedTrade],
        from_date: date | None = None,
        to_date: date | None = None,
        segments: Sequence[TradeSegment] | None = None,
        symbols: Sequence[str] | None = None,
    ) -> list[PairedTrade]:
        """Applies date, segment, and symbol filters."""
        result: list[PairedTrade] = []
        segments_set = set(segments) if segments else None
        symbols_set = {s.upper() for s in symbols} if symbols else None

        for t in trades:
            trade_exit_date = t.exit_time.date()
            if from_date and trade_exit_date < from_date:
                continue
            if to_date and trade_exit_date > to_date:
                continue
            if segments_set and t.segment not in segments_set:
                continue
            if symbols_set and t.symbol.upper() not in symbols_set:
                continue
            result.append(t)

        return result

    @classmethod
    def compute_summary(cls, trades: Sequence[PairedTrade]) -> PerformanceSummary:
        """Calculates trade outcome distribution and gross/charges/net totals."""
        total = len(trades)
        if total == 0:
            return PerformanceSummary()

        wins = 0
        losses = 0
        breakevens = 0
        gross_sum = Decimal("0.00")
        charges_sum = Decimal("0.00")
        net_sum = Decimal("0.00")

        for t in trades:
            gross_sum += t.gross_pnl
            charges_sum += t.charges
            net_sum += t.net_pnl

            if t.net_pnl > Decimal("0.00"):
                wins += 1
            elif t.net_pnl < Decimal("0.00"):
                losses += 1
            else:
                breakevens += 1

        total_dec = Decimal(str(total))
        win_rate = to_pct((Decimal(str(wins)) / total_dec) * Decimal("100.00"))
        loss_rate = to_pct((Decimal(str(losses)) / total_dec) * Decimal("100.00"))
        breakeven_rate = to_pct((Decimal(str(breakevens)) / total_dec) * Decimal("100.00"))

        return PerformanceSummary(
            total_trades=total,
            winning_trades=wins,
            losing_trades=losses,
            breakeven_trades=breakevens,
            win_rate=win_rate,
            loss_rate=loss_rate,
            breakeven_rate=breakeven_rate,
            total_gross_pnl=to_currency(gross_sum),
            total_charges=to_currency(charges_sum),
            total_net_pnl=to_currency(net_sum),
        )

    @classmethod
    def compute_expectancy(
        cls,
        trades: Sequence[PairedTrade],
        summary: PerformanceSummary,
    ) -> ExpectancyMetrics:
        """Calculates mathematical edge, win/loss ratio, profit factor, and averages."""
        if not trades:
            return ExpectancyMetrics()

        wins_list = [t.net_pnl for t in trades if t.net_pnl > Decimal("0.00")]
        losses_list = [abs(t.net_pnl) for t in trades if t.net_pnl < Decimal("0.00")]

        sum_wins = sum(wins_list, Decimal("0.00"))
        sum_losses = sum(losses_list, Decimal("0.00"))

        avg_win = (
            to_currency(sum_wins / Decimal(str(len(wins_list))))
            if wins_list
            else Decimal("0.00")
        )
        avg_loss = (
            to_currency(sum_losses / Decimal(str(len(losses_list))))
            if losses_list
            else Decimal("0.00")
        )

        win_loss_ratio = (
            to_pct(avg_win / avg_loss) if avg_loss > Decimal("0.00") else None
        )

        if sum_losses > Decimal("0.00"):
            profit_factor: Decimal | None = to_pct(sum_wins / sum_losses)
            is_infinite = False
        elif sum_wins > Decimal("0.00"):
            profit_factor = None
            is_infinite = True
        else:
            profit_factor = Decimal("0.00")
            is_infinite = False

        total_dec = Decimal(str(summary.total_trades))
        expectancy_inr = (
            to_currency(summary.total_net_pnl / total_dec)
            if total_dec > Decimal("0.00")
            else Decimal("0.00")
        )

        expectancy_ratio = (
            to_pct(expectancy_inr / avg_loss) if avg_loss > Decimal("0.00") else None
        )

        largest_win = to_currency(max(wins_list)) if wins_list else Decimal("0.00")
        largest_loss = to_currency(max(losses_list)) if losses_list else Decimal("0.00")

        return ExpectancyMetrics(
            average_win=avg_win,
            average_loss=avg_loss,
            win_loss_ratio=win_loss_ratio,
            profit_factor=profit_factor,
            is_infinite_profit_factor=is_infinite,
            expectancy_inr=expectancy_inr,
            expectancy_ratio=expectancy_ratio,
            largest_win=largest_win,
            largest_loss=largest_loss,
        )

    @classmethod
    def compute_streaks(cls, trades: Sequence[PairedTrade]) -> StreakMetrics:
        """Calculates longest consecutive winning/losing runs and active current streak."""
        if not trades:
            return StreakMetrics()

        max_wins = 0
        max_losses = 0
        max_win_pnl = Decimal("0.00")
        max_loss_pnl = Decimal("0.00")

        curr_type: StreakType = "NONE"
        curr_count = 0
        curr_pnl = Decimal("0.00")

        for t in trades:
            if t.net_pnl > Decimal("0.00"):
                if curr_type == "WIN":
                    curr_count += 1
                    curr_pnl += t.net_pnl
                else:
                    curr_type = "WIN"
                    curr_count = 1
                    curr_pnl = t.net_pnl

                if curr_count > max_wins or (curr_count == max_wins and curr_pnl > max_win_pnl):
                    max_wins = curr_count
                    max_win_pnl = curr_pnl

            elif t.net_pnl < Decimal("0.00"):
                if curr_type == "LOSS":
                    curr_count += 1
                    curr_pnl += t.net_pnl
                else:
                    curr_type = "LOSS"
                    curr_count = 1
                    curr_pnl = t.net_pnl

                if curr_count > max_losses or (curr_count == max_losses and curr_pnl < max_loss_pnl):
                    max_losses = curr_count
                    max_loss_pnl = curr_pnl

            else:
                # Breakeven resets consecutive streak
                curr_type = "NONE"
                curr_count = 0
                curr_pnl = Decimal("0.00")

        return StreakMetrics(
            max_consecutive_wins=max_wins,
            max_consecutive_losses=max_losses,
            max_win_streak_pnl=to_currency(max_win_pnl),
            max_loss_streak_pnl=to_currency(max_loss_pnl),
            current_streak_type=curr_type,
            current_streak_count=curr_count,
            current_streak_pnl=to_currency(curr_pnl),
        )

    @classmethod
    def calculate_running_drawdown(
        cls,
        trades: Sequence[PairedTrade],
        starting_capital: Decimal,
    ) -> tuple[list[EquityPoint], DrawdownMetrics]:
        """Calculates trade-by-trade equity points and comprehensive peak-to-trough drawdown."""
        equity = starting_capital
        peak = starting_capital
        peak_time: datetime | None = trades[0].entry_time if trades else None

        max_dd_inr = Decimal("0.00")
        max_dd_pct: Decimal | None = Decimal("0.00") if starting_capital > Decimal("0.00") else None

        max_dd_peak_time: datetime | None = peak_time
        max_dd_trough_time: datetime | None = None
        max_dd_peak_equity = peak
        max_dd_recovered_time: datetime | None = None

        points: list[EquityPoint] = []

        for trade in trades:
            equity += trade.net_pnl
            cum_pnl = equity - starting_capital

            if equity >= peak:
                peak = equity
                peak_time = trade.exit_time
                dd_inr = Decimal("0.00")
                dd_pct = Decimal("0.00") if peak > Decimal("0.00") else None

                # If we were previously in a max drawdown episode and now recover beyond that peak
                if max_dd_inr > Decimal("0.00") and max_dd_recovered_time is None and equity >= max_dd_peak_equity:
                    max_dd_recovered_time = trade.exit_time
            else:
                dd_inr = peak - equity
                dd_pct = (
                    to_pct((dd_inr / peak) * Decimal("100.00"))
                    if peak > Decimal("0.00")
                    else None
                )

                if dd_inr > max_dd_inr:
                    max_dd_inr = dd_inr
                    max_dd_peak_time = peak_time
                    max_dd_trough_time = trade.exit_time
                    max_dd_peak_equity = peak
                    max_dd_recovered_time = None  # actively in new deepest drawdown

                if dd_pct is not None and (max_dd_pct is None or dd_pct > max_dd_pct):
                    max_dd_pct = dd_pct

            points.append(
                EquityPoint(
                    timestamp=trade.exit_time,
                    trade_id=trade.id,
                    symbol=trade.symbol,
                    net_pnl=to_currency(trade.net_pnl),
                    cumulative_pnl=to_currency(cum_pnl),
                    equity=to_currency(equity),
                    peak_equity=to_currency(peak),
                    drawdown_inr=to_currency(dd_inr),
                    drawdown_pct=dd_pct,
                )
            )

        # Current Drawdown state
        current_dd_inr = to_currency(peak - equity) if equity < peak else Decimal("0.00")
        current_dd_pct = (
            to_pct((current_dd_inr / peak) * Decimal("100.00"))
            if peak > Decimal("0.00") and current_dd_inr > Decimal("0.00")
            else (Decimal("0.00") if peak > Decimal("0.00") else None)
        )
        is_in_dd = current_dd_inr > Decimal("0.00")

        # Duration in days
        duration_days: int | None = None
        if max_dd_peak_time:
            end_time = max_dd_recovered_time or (trades[-1].exit_time if trades else max_dd_peak_time)
            duration_days = max(0, (end_time.date() - max_dd_peak_time.date()).days)

        drawdown_metrics = DrawdownMetrics(
            max_drawdown_inr=to_currency(max_dd_inr),
            max_drawdown_pct=max_dd_pct,
            peak_date=max_dd_peak_time,
            trough_date=max_dd_trough_time,
            recovery_date=max_dd_recovered_time,
            duration_days=duration_days,
            current_drawdown_inr=current_dd_inr,
            current_drawdown_pct=current_dd_pct,
            is_in_drawdown=is_in_dd,
        )

        return points, drawdown_metrics

    @classmethod
    def compute_daily_equity_curve(
        cls,
        trades: Sequence[PairedTrade],
        starting_capital: Decimal,
    ) -> list[DailyEquityPoint]:
        """Aggregates trades into daily EOD balance and drawdown series."""
        if not trades:
            return []

        # Group trades by exit calendar date string (YYYY-MM-DD)
        daily_trades: dict[str, list[PairedTrade]] = defaultdict(list)
        for t in trades:
            d_str = t.exit_time.strftime("%Y-%m-%d")
            daily_trades[d_str].append(t)

        sorted_days = sorted(daily_trades.keys())
        daily_points: list[DailyEquityPoint] = []

        running_equity = starting_capital
        running_peak = starting_capital

        for d_str in sorted_days:
            day_list = daily_trades[d_str]
            day_gross = sum((t.gross_pnl for t in day_list), Decimal("0.00"))
            day_charges = sum((t.charges for t in day_list), Decimal("0.00"))
            day_net = sum((t.net_pnl for t in day_list), Decimal("0.00"))

            running_equity += day_net
            running_peak = max(running_peak, running_equity)

            day_dd_inr = running_peak - running_equity
            day_dd_pct = (
                to_pct((day_dd_inr / running_peak) * Decimal("100.00"))
                if running_peak > Decimal("0.00")
                else None
            )

            daily_points.append(
                DailyEquityPoint(
                    date=d_str,
                    trades_count=len(day_list),
                    daily_gross_pnl=to_currency(day_gross),
                    daily_charges=to_currency(day_charges),
                    daily_net_pnl=to_currency(day_net),
                    cumulative_pnl=to_currency(running_equity - starting_capital),
                    equity=to_currency(running_equity),
                    peak_equity=to_currency(running_peak),
                    drawdown_inr=to_currency(day_dd_inr),
                    drawdown_pct=day_dd_pct,
                )
            )

        return daily_points

    @classmethod
    def generate_dataset_hash(
        cls,
        trades: Sequence[PairedTrade],
        starting_capital: Decimal,
        **filters: Any,
    ) -> str:
        """Produces a deterministic SHA-256 fingerprint for cache matching in stats_snapshots."""
        hasher = hashlib.sha256()

        # 1. Starting capital
        hasher.update(f"capital:{starting_capital.to_eng_string()}".encode())

        # 2. Filters
        for key in sorted(filters.keys()):
            val = filters[key]
            if val is not None:
                hasher.update(f"filter:{key}={val}".encode())

        # 3. Trade elements: (id, exit_time, net_pnl, charges)
        for t in trades:
            item_str = f"{t.id}|{t.exit_time.isoformat()}|{t.net_pnl.to_eng_string()}|{t.charges.to_eng_string()}"
            hasher.update(item_str.encode("utf-8"))

        return hasher.hexdigest()
