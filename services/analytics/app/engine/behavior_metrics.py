"""TradeLens Behavioral Leak Analytics Engine.

High-precision deterministic calculation engine for the 4 cardinal psychological trading errors:
1. Re-entry After Loss (Tilt / Revenge Trading within 5m, 15m, 30m, 60m windows)
2. Overtrading Days (Volume spikes > 1.5x median daily trades)
3. Position Size Creep (Quantity spikes immediately following losses)
4. Holding Losers vs Winners (Disposition Effect & duration asymmetry)
Plus composite 0-100 Behavioral Discipline Scoring and Top Leak Identification.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from app.models.behavior import (
    BehavioralLeakReport,
    HoldingTimeMetrics,
    LeakType,
    OvertradingDay,
    OvertradingMetrics,
    ReentryBucket,
    ReentryMetrics,
    SizeCreepMetrics,
    TopLeakFinding,
)
from app.models.trade import PairedTrade

_CURRENCY_QUANT = Decimal("0.01")
_PERCENT_QUANT = Decimal("0.01")


def to_currency(val: Decimal) -> Decimal:
    """Quantizes a Decimal to standard currency precision (0.01) with ROUND_HALF_UP."""
    return val.quantize(_CURRENCY_QUANT, rounding=ROUND_HALF_UP)


def to_pct(val: Decimal) -> Decimal:
    """Quantizes a percentage Decimal to 2 decimal places with ROUND_HALF_UP."""
    return val.quantize(_PERCENT_QUANT, rounding=ROUND_HALF_UP)


def format_duration(seconds: int) -> str:
    """Converts seconds into human-readable duration string (e.g. '4m 12s')."""
    if seconds < 0:
        return "0s"
    if seconds < 60:
        return f"{seconds}s"
    minutes = seconds // 60
    rem_seconds = seconds % 60
    if minutes < 60:
        return f"{minutes}m {rem_seconds}s" if rem_seconds > 0 else f"{minutes}m"
    hours = minutes // 60
    rem_minutes = minutes % 60
    return f"{hours}h {rem_minutes}m"


class BehaviorMetricsEngine:
    """Deterministic analytics engine identifying psychological leaks from closed trades."""

    @classmethod
    def calculate_behavioral_metrics(
        cls,
        trades: Sequence[PairedTrade],
        overtrading_multiplier: Decimal = Decimal("1.50"),
        min_overtrading_trades: int = 5,
        size_creep_threshold: Decimal = Decimal("1.25"),
    ) -> BehavioralLeakReport:
        """Calculates all 4 behavioral leak metrics and composite discipline score."""
        if not trades:
            return cls._empty_report()

        # 1. Deterministic chronological sort by exit_time, entry_time, id
        sorted_trades = sorted(
            trades,
            key=lambda t: (t.exit_time, t.entry_time, str(t.id)),
        )

        # 2. Leak 1: Re-entry Tilt Analysis
        reentry = cls.calculate_reentry_metrics(sorted_trades)

        # 3. Leak 2: Overtrading Days Analysis
        overtrading = cls.calculate_overtrading_metrics(
            sorted_trades,
            multiplier=overtrading_multiplier,
            min_trades=min_overtrading_trades,
        )

        # 4. Leak 3: Position Size Creep Analysis
        size_creep = cls.calculate_size_creep_metrics(
            sorted_trades,
            threshold_multiplier=size_creep_threshold,
        )

        # 5. Leak 4: Holding Time Asymmetry (Disposition Effect)
        holding_time = cls.calculate_holding_time_metrics(sorted_trades)

        # 6. Composite Discipline Score & Top Leak Ranking
        discipline_score, top_leak = cls.calculate_composite_score(
            reentry=reentry,
            overtrading=overtrading,
            size_creep=size_creep,
            holding_time=holding_time,
            total_trades=len(sorted_trades),
        )

        return BehavioralLeakReport(
            discipline_score=discipline_score,
            top_leak=top_leak,
            reentry=reentry,
            overtrading=overtrading,
            size_creep=size_creep,
            holding_time=holding_time,
            generated_at=datetime.now(UTC),
        )

    @classmethod
    def _empty_report(cls) -> BehavioralLeakReport:
        """Returns safe default report for zero trade inputs."""
        return BehavioralLeakReport(
            discipline_score=100,
            top_leak=TopLeakFinding(
                leak_type="NONE",
                title="No Trades Recorded",
                financial_impact_inr=Decimal("0.00"),
                description="Upload trades to compute behavioral leak statistics.",
            ),
            reentry=ReentryMetrics(),
            overtrading=OvertradingMetrics(),
            size_creep=SizeCreepMetrics(),
            holding_time=HoldingTimeMetrics(),
            generated_at=datetime.now(UTC),
        )

    @classmethod
    def calculate_reentry_metrics(
        cls,
        trades: Sequence[PairedTrade],
    ) -> ReentryMetrics:
        """Detects trades opened hastily within 5m, 15m, 30m, and 60m of a losing trade."""
        total_portfolio_trades = len(trades)
        if total_portfolio_trades < 2:
            return ReentryMetrics()

        # Window definitions in minutes
        windows = [5, 15, 30, 60]
        bucket_matches: dict[int, list[tuple[PairedTrade, PairedTrade]]] = {
            w: [] for w in windows
        }
        all_reentry_trade_ids: set[str] = set()

        for i in range(1, len(trades)):
            curr_trade = trades[i]
            prev_trade = trades[i - 1]

            # Trigger condition: immediately preceding trade closed at a net loss
            if prev_trade.net_pnl < Decimal("0.00"):
                latency_seconds = (curr_trade.entry_time - prev_trade.exit_time).total_seconds()
                # Ensure curr_trade was opened at or after prev_trade exit
                if latency_seconds >= 0:
                    latency_mins = latency_seconds / 60.0

                    for w in windows:
                        if latency_mins <= w:
                            bucket_matches[w].append((curr_trade, prev_trade))
                            all_reentry_trade_ids.add(str(curr_trade.id))

        total_dec = Decimal(str(total_portfolio_trades))
        buckets: list[ReentryBucket] = []

        for w in windows:
            pairs = bucket_matches[w]
            count = len(pairs)
            if count == 0:
                buckets.append(
                    ReentryBucket(
                        window_minutes=w,
                        trades_count=0,
                        pct_of_all_trades=Decimal("0.00"),
                        winning_trades=0,
                        losing_trades=0,
                        win_rate=Decimal("0.00"),
                        total_net_pnl=Decimal("0.00"),
                        average_net_pnl=Decimal("0.00"),
                        same_symbol_count=0,
                        cross_symbol_count=0,
                    )
                )
                continue

            wins = sum(1 for curr, _ in pairs if curr.net_pnl > Decimal("0.00"))
            losses = sum(1 for curr, _ in pairs if curr.net_pnl < Decimal("0.00"))
            net_sum = sum((curr.net_pnl for curr, _ in pairs), Decimal("0.00"))
            same_symbol = sum(1 for curr, prev in pairs if curr.symbol.upper() == prev.symbol.upper())
            cross_symbol = count - same_symbol

            count_dec = Decimal(str(count))
            win_rate = to_pct((Decimal(str(wins)) / count_dec) * Decimal("100.00"))
            pct_of_all = to_pct((count_dec / total_dec) * Decimal("100.00"))
            avg_pnl = to_currency(net_sum / count_dec)

            buckets.append(
                ReentryBucket(
                    window_minutes=w,
                    trades_count=count,
                    pct_of_all_trades=pct_of_all,
                    winning_trades=wins,
                    losing_trades=losses,
                    win_rate=win_rate,
                    total_net_pnl=to_currency(net_sum),
                    average_net_pnl=avg_pnl,
                    same_symbol_count=same_symbol,
                    cross_symbol_count=cross_symbol,
                )
            )

        # 60m bucket represents overall re-entry totals
        bucket_60m = buckets[-1] if buckets else None
        total_reentry_count = bucket_60m.trades_count if bucket_60m else 0
        total_reentry_pnl = bucket_60m.total_net_pnl if bucket_60m else Decimal("0.00")
        total_reentry_pct = bucket_60m.pct_of_all_trades if bucket_60m else Decimal("0.00")

        return ReentryMetrics(
            total_reentry_trades=total_reentry_count,
            pct_of_all_trades=total_reentry_pct,
            total_reentry_net_pnl=total_reentry_pnl,
            buckets=buckets,
        )

    @classmethod
    def calculate_overtrading_metrics(
        cls,
        trades: Sequence[PairedTrade],
        multiplier: Decimal = Decimal("1.50"),
        min_trades: int = 5,
    ) -> OvertradingMetrics:
        """Identifies days with trade frequency exceeding multiplier * median volume."""
        if not trades:
            return OvertradingMetrics()

        # Group trades by exit calendar date string (YYYY-MM-DD)
        daily_groups: dict[str, list[PairedTrade]] = defaultdict(list)
        for t in trades:
            d_str = t.exit_time.strftime("%Y-%m-%d")
            daily_groups[d_str].append(t)

        sorted_days = sorted(daily_groups.keys())
        counts = [len(daily_groups[d]) for d in sorted_days]

        # Calculate median trade count
        median_val = Decimal(str(statistics.median(counts))) if counts else Decimal("0.00")
        baseline_median = to_currency(median_val)

        # Threshold: multiplier * median (floored at min_trades)
        effective_threshold = max(
            Decimal(str(min_trades)),
            (median_val * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        )

        day_records: list[OvertradingDay] = []
        overtrading_trades_count = 0
        overtrading_net_pnl = Decimal("0.00")
        overtrading_wins = 0

        normal_days_count = 0
        normal_net_pnl = Decimal("0.00")
        normal_wins = 0
        normal_trades_count = 0

        for d_str in sorted_days:
            day_trades = daily_groups[d_str]
            c = len(day_trades)
            gross = sum((t.gross_pnl for t in day_trades), Decimal("0.00"))
            charges = sum((t.charges for t in day_trades), Decimal("0.00"))
            net = sum((t.net_pnl for t in day_trades), Decimal("0.00"))
            wins = sum(1 for t in day_trades if t.net_pnl > Decimal("0.00"))
            win_rate = to_pct((Decimal(str(wins)) / Decimal(str(c))) * Decimal("100.00"))

            vol_mult = (
                to_pct(Decimal(str(c)) / median_val)
                if median_val > Decimal("0.00")
                else Decimal("1.00")
            )

            is_overtrading = Decimal(str(c)) >= effective_threshold and c >= min_trades

            day_records.append(
                OvertradingDay(
                    date=d_str,
                    trades_count=c,
                    gross_pnl=to_currency(gross),
                    charges=to_currency(charges),
                    net_pnl=to_currency(net),
                    win_rate=win_rate,
                    is_overtrading=is_overtrading,
                    volume_multiplier=vol_mult,
                )
            )

            if is_overtrading:
                overtrading_trades_count += c
                overtrading_net_pnl += net
                overtrading_wins += wins
            else:
                normal_days_count += 1
                normal_net_pnl += net
                normal_wins += wins
                normal_trades_count += c

        overtrading_days_count = sum(1 for r in day_records if r.is_overtrading)
        total_active_days = len(day_records)
        pct_overtrading_days = (
            to_pct((Decimal(str(overtrading_days_count)) / Decimal(str(total_active_days))) * Decimal("100.00"))
            if total_active_days > 0
            else Decimal("0.00")
        )

        overtrading_win_rate = (
            to_pct((Decimal(str(overtrading_wins)) / Decimal(str(overtrading_trades_count))) * Decimal("100.00"))
            if overtrading_trades_count > 0
            else Decimal("0.00")
        )

        normal_win_rate = (
            to_pct((Decimal(str(normal_wins)) / Decimal(str(normal_trades_count))) * Decimal("100.00"))
            if normal_trades_count > 0
            else Decimal("0.00")
        )

        return OvertradingMetrics(
            baseline_median_trades=baseline_median,
            threshold_multiplier=multiplier,
            min_trades_threshold=min_trades,
            overtrading_days_count=overtrading_days_count,
            total_active_days=total_active_days,
            pct_overtrading_days=pct_overtrading_days,
            overtrading_trades_count=overtrading_trades_count,
            overtrading_net_pnl=to_currency(overtrading_net_pnl),
            overtrading_win_rate=overtrading_win_rate,
            normal_days_count=normal_days_count,
            normal_days_net_pnl=to_currency(normal_net_pnl),
            normal_days_win_rate=normal_win_rate,
            days=day_records,
        )

    @classmethod
    def calculate_size_creep_metrics(
        cls,
        trades: Sequence[PairedTrade],
        threshold_multiplier: Decimal = Decimal("1.25"),
    ) -> SizeCreepMetrics:
        """Detects lot size spikes following a loss (martingale loss-chasing behavior)."""
        if len(trades) < 2:
            return SizeCreepMetrics()

        quantities = [t.quantity for t in trades]
        median_qty = Decimal(str(statistics.median(quantities))) if quantities else Decimal("0.00")

        post_loss_trades_count = 0
        size_creep_trades: list[tuple[PairedTrade, Decimal]] = []
        max_multiplier = Decimal("1.00")

        for i in range(1, len(trades)):
            curr_trade = trades[i]
            prev_trade = trades[i - 1]

            if prev_trade.net_pnl < Decimal("0.00"):
                post_loss_trades_count += 1
                if prev_trade.quantity > Decimal("0.00"):
                    mult = curr_trade.quantity / prev_trade.quantity
                    max_multiplier = max(max_multiplier, mult)

                    # Size creep trigger: quantity >= threshold * prev_trade.quantity
                    # OR quantity >= 1.5x portfolio median
                    if mult >= threshold_multiplier or (
                        median_qty > Decimal("0.00")
                        and curr_trade.quantity >= median_qty * Decimal("1.50")
                    ):
                        size_creep_trades.append((curr_trade, mult))

        size_creep_count = len(size_creep_trades)
        if size_creep_count == 0:
            return SizeCreepMetrics(
                baseline_median_quantity=to_currency(median_qty),
                post_loss_trades_count=post_loss_trades_count,
                size_creep_trades_count=0,
                pct_of_post_loss_trades=Decimal("0.00"),
                size_creep_net_pnl=Decimal("0.00"),
                size_creep_win_rate=Decimal("0.00"),
                max_size_multiplier=to_pct(max_multiplier),
            )

        pct_post_loss = (
            to_pct((Decimal(str(size_creep_count)) / Decimal(str(post_loss_trades_count))) * Decimal("100.00"))
            if post_loss_trades_count > 0
            else Decimal("0.00")
        )

        net_sum = sum((t.net_pnl for t, _ in size_creep_trades), Decimal("0.00"))
        wins = sum(1 for t, _ in size_creep_trades if t.net_pnl > Decimal("0.00"))
        win_rate = to_pct((Decimal(str(wins)) / Decimal(str(size_creep_count))) * Decimal("100.00"))

        return SizeCreepMetrics(
            baseline_median_quantity=to_currency(median_qty),
            post_loss_trades_count=post_loss_trades_count,
            size_creep_trades_count=size_creep_count,
            pct_of_post_loss_trades=pct_post_loss,
            size_creep_net_pnl=to_currency(net_sum),
            size_creep_win_rate=win_rate,
            max_size_multiplier=to_pct(max_multiplier),
        )

    @classmethod
    def calculate_holding_time_metrics(
        cls,
        trades: Sequence[PairedTrade],
    ) -> HoldingTimeMetrics:
        """Compares holding duration of winners vs losers to detect the disposition effect."""
        winners = [t.trade_duration_seconds for t in trades if t.net_pnl > Decimal("0.00")]
        losers = [t.trade_duration_seconds for t in trades if t.net_pnl < Decimal("0.00")]

        winners_count = len(winners)
        losers_count = len(losers)

        avg_winner_sec = sum(winners) // winners_count if winners_count > 0 else 0
        avg_loser_sec = sum(losers) // losers_count if losers_count > 0 else 0

        median_winner_sec = int(statistics.median(winners)) if winners_count > 0 else 0
        median_loser_sec = int(statistics.median(losers)) if losers_count > 0 else 0

        holding_ratio: Decimal | None = None
        is_disposition = False

        if avg_winner_sec > 0 and avg_loser_sec > 0:
            holding_ratio = to_pct(Decimal(str(avg_loser_sec)) / Decimal(str(avg_winner_sec)))
            is_disposition = holding_ratio > Decimal("1.00")

        return HoldingTimeMetrics(
            winners_count=winners_count,
            losers_count=losers_count,
            avg_winner_duration_seconds=avg_winner_sec,
            avg_loser_duration_seconds=avg_loser_sec,
            median_winner_duration_seconds=median_winner_sec,
            median_loser_duration_seconds=median_loser_sec,
            avg_winner_duration_display=format_duration(avg_winner_sec),
            avg_loser_duration_display=format_duration(avg_loser_sec),
            holding_duration_ratio=holding_ratio,
            is_disposition_effect_detected=is_disposition,
        )

    @classmethod
    def calculate_composite_score(
        cls,
        reentry: ReentryMetrics,
        overtrading: OvertradingMetrics,
        size_creep: SizeCreepMetrics,
        holding_time: HoldingTimeMetrics,
        total_trades: int,
    ) -> tuple[int, TopLeakFinding]:
        """Calculates 0-100 execution discipline score and ranks primary financial leak."""
        penalties = 0

        # 1. Re-entry Tilt Penalty (up to 30 pts)
        reentry_loss = reentry.total_reentry_net_pnl
        if reentry.total_reentry_trades > 0 and total_trades > 0:
            reentry_pct = float(reentry.pct_of_all_trades)
            # Up to 20 pts based on tilt frequency
            penalties += min(20, int(reentry_pct * 0.8))
            # Up to 10 pts if re-entry trades are net negative
            if reentry_loss < Decimal("0.00"):
                penalties += 10

        # 2. Overtrading Penalty (up to 25 pts)
        if overtrading.overtrading_days_count > 0:
            ot_day_pct = float(overtrading.pct_overtrading_days)
            penalties += min(15, int(ot_day_pct * 0.5))
            if overtrading.overtrading_net_pnl < Decimal("0.00"):
                penalties += 10

        # 3. Size Creep Penalty (up to 25 pts)
        if size_creep.size_creep_trades_count > 0:
            sc_pct = float(size_creep.pct_of_post_loss_trades)
            penalties += min(15, int(sc_pct * 0.5))
            if size_creep.size_creep_net_pnl < Decimal("0.00"):
                penalties += 10

        # 4. Disposition Effect Penalty (up to 20 pts)
        if holding_time.holding_duration_ratio is not None:
            ratio = float(holding_time.holding_duration_ratio)
            if ratio > 1.0:
                penalties += min(20, int((ratio - 1.0) * 10))

        score = max(0, min(100, 100 - penalties))

        # Identify Top Leak by financial loss
        leak_candidates: list[tuple[LeakType, str, Decimal, str]] = []

        if reentry.total_reentry_net_pnl < Decimal("0.00"):
            damage = abs(reentry.total_reentry_net_pnl)
            leak_candidates.append((
                "REENTRY_TILT",
                "Re-entry Tilt After Losses",
                damage,
                f"Entering trades hastily within 60 mins of a loss cost ₹{damage:,.2f} across {reentry.total_reentry_trades} trades.",
            ))

        if overtrading.overtrading_net_pnl < Decimal("0.00"):
            damage = abs(overtrading.overtrading_net_pnl)
            leak_candidates.append((
                "OVERTRADING",
                "Volume Fatigue & Overtrading Days",
                damage,
                f"Trading frequency spikes (> 1.5x median) cost ₹{damage:,.2f} across {overtrading.overtrading_days_count} overtraded days.",
            ))

        if size_creep.size_creep_net_pnl < Decimal("0.00"):
            damage = abs(size_creep.size_creep_net_pnl)
            leak_candidates.append((
                "SIZE_CREEP",
                "Post-Loss Position Size Creep",
                damage,
                f"Increasing position size after losses cost ₹{damage:,.2f} with a max multiplier of {size_creep.max_size_multiplier}x.",
            ))

        if holding_time.is_disposition_effect_detected and holding_time.holding_duration_ratio is not None:
            leak_candidates.append((
                "DISPOSITION_EFFECT",
                "Holding Losers Longer Than Winners",
                Decimal("0.00"),
                f"Losing trades are held {holding_time.holding_duration_ratio}x longer than winners ({holding_time.avg_loser_duration_display} vs {holding_time.avg_winner_duration_display}).",
            ))

        if leak_candidates:
            # Sort by financial damage descending
            leak_candidates.sort(key=lambda x: x[2], reverse=True)
            chosen = leak_candidates[0]
            top_leak = TopLeakFinding(
                leak_type=chosen[0],
                title=chosen[1],
                financial_impact_inr=to_currency(chosen[2]),
                description=chosen[3],
            )
        else:
            top_leak = TopLeakFinding(
                leak_type="NONE",
                title="Execution Discipline is Strong",
                financial_impact_inr=Decimal("0.00"),
                description="No systemic behavioral tilt, size creep, or overtrading patterns detected.",
            )

        return score, top_leak
