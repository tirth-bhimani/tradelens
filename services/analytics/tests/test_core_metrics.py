"""Unit and Integration Tests for Core Trading Performance Metrics Engine (Task 11).

Tests covers:
- Win Rate, Loss Rate, Breakeven Rate
- Profit Factor (finite, zero, and infinite edge cases)
- Expectancy (Rupees and Ratio)
- Peak-to-Trough Drawdown in INR and %
- Recovery Date identification and active drawdown status
- Consecutive Winning and Losing Streaks (with breakeven reset)
- Point-in-time Equity Curve and Daily Aggregated Equity Series
- Date, Segment, and Symbol Filtering
- Deterministic SHA-256 Dataset Hashing
- FastAPI REST API Endpoints
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from app.engine.core_metrics import CoreMetricsEngine
from app.main import app
from app.models.trade import PairedTrade
from fastapi.testclient import TestClient


def create_trade(
    symbol: str = "RELIANCE",
    segment: str = "EQUITY_INTRADAY",
    gross_pnl: str = "1000.00",
    charges: str = "50.00",
    net_pnl: str = "950.00",
    entry_days_ago: int = 1,
    exit_days_ago: int = 1,
    trade_id: uuid.UUID | None = None,
) -> PairedTrade:
    """Helper to create a deterministic PairedTrade for testing."""
    now = datetime(2026, 10, 15, 15, 30, 0, tzinfo=UTC)
    entry_time = now - timedelta(days=entry_days_ago, minutes=30)
    exit_time = now - timedelta(days=exit_days_ago)

    return PairedTrade(
        id=trade_id or uuid.uuid4(),
        symbol=symbol,
        segment=segment,  # type: ignore[arg-type]
        instrument_type="EQ",
        is_short=False,
        is_intraday=True,
        entry_time=entry_time,
        exit_time=exit_time,
        trade_duration_seconds=1800,
        quantity=Decimal(10),
        entry_price=Decimal("2500.00"),
        exit_price=Decimal("2600.00"),
        gross_pnl=Decimal(gross_pnl),
        charges=Decimal(charges),
        net_pnl=Decimal(net_pnl),
    )


class TestEmptyAndEdgeBoundaries:
    """Tests zero division safety and default indicators on empty trade inputs."""

    def test_empty_trades_list(self) -> None:
        report = CoreMetricsEngine.calculate_metrics(
            trades=[],
            starting_capital=Decimal("500000.00"),
        )

        assert report.summary.total_trades == 0
        assert report.summary.winning_trades == 0
        assert report.summary.losing_trades == 0
        assert report.summary.breakeven_trades == 0
        assert report.summary.win_rate == Decimal("0.00")
        assert report.summary.loss_rate == Decimal("0.00")
        assert report.summary.breakeven_rate == Decimal("0.00")
        assert report.summary.total_gross_pnl == Decimal("0.00")
        assert report.summary.total_charges == Decimal("0.00")
        assert report.summary.total_net_pnl == Decimal("0.00")

        assert report.expectancy.average_win == Decimal("0.00")
        assert report.expectancy.average_loss == Decimal("0.00")
        assert report.expectancy.profit_factor is None
        assert report.expectancy.is_infinite_profit_factor is False
        assert report.expectancy.win_loss_ratio is None
        assert report.expectancy.expectancy_inr == Decimal("0.00")
        assert report.expectancy.expectancy_ratio is None
        assert report.expectancy.largest_win == Decimal("0.00")
        assert report.expectancy.largest_loss == Decimal("0.00")

        assert report.streaks.max_consecutive_wins == 0
        assert report.streaks.max_consecutive_losses == 0
        assert report.streaks.current_streak_type == "NONE"

        assert report.drawdown.max_drawdown_inr == Decimal("0.00")
        assert report.drawdown.is_in_drawdown is False
        assert len(report.equity_curve) == 0
        assert len(report.daily_equity_curve) == 0
        assert len(report.dataset_hash) == 64


class TestWinRateAndProfitFactor:
    """Verifies profit factor edge cases (infinite, zero, finite) and win rates."""

    def test_perfect_win_scenario(self) -> None:
        trades = [
            create_trade(net_pnl="1000.00", gross_pnl="1050.00", charges="50.00", exit_days_ago=5),
            create_trade(net_pnl="2000.00", gross_pnl="2050.00", charges="50.00", exit_days_ago=4),
            create_trade(net_pnl="500.00", gross_pnl="550.00", charges="50.00", exit_days_ago=3),
            create_trade(net_pnl="1500.00", gross_pnl="1550.00", charges="50.00", exit_days_ago=2),
            create_trade(net_pnl="3000.00", gross_pnl="3050.00", charges="50.00", exit_days_ago=1),
        ]

        report = CoreMetricsEngine.calculate_metrics(
            trades=trades,
            starting_capital=Decimal("100000.00"),
        )

        assert report.summary.total_trades == 5
        assert report.summary.winning_trades == 5
        assert report.summary.losing_trades == 0
        assert report.summary.win_rate == Decimal("100.00")
        assert report.summary.loss_rate == Decimal("0.00")
        assert report.summary.total_net_pnl == Decimal("8000.00")

        # Zero losses => Infinite profit factor
        assert report.expectancy.profit_factor is None
        assert report.expectancy.is_infinite_profit_factor is True
        assert report.expectancy.win_loss_ratio is None
        assert report.expectancy.average_win == Decimal("1600.00")  # 8000 / 5
        assert report.expectancy.average_loss == Decimal("0.00")
        assert report.expectancy.largest_win == Decimal("3000.00")
        assert report.expectancy.largest_loss == Decimal("0.00")

        # Streaks
        assert report.streaks.max_consecutive_wins == 5
        assert report.streaks.max_consecutive_losses == 0
        assert report.streaks.current_streak_type == "WIN"
        assert report.streaks.current_streak_count == 5

        # Drawdown
        assert report.drawdown.max_drawdown_inr == Decimal("0.00")
        assert report.drawdown.is_in_drawdown is False

    def test_all_loss_scenario(self) -> None:
        trades = [
            create_trade(net_pnl="-1000.00", gross_pnl="-950.00", charges="50.00", exit_days_ago=4),
            create_trade(net_pnl="-500.00", gross_pnl="-450.00", charges="50.00", exit_days_ago=3),
            create_trade(net_pnl="-1500.00", gross_pnl="-1450.00", charges="50.00", exit_days_ago=2),
            create_trade(net_pnl="-2000.00", gross_pnl="-1950.00", charges="50.00", exit_days_ago=1),
        ]

        report = CoreMetricsEngine.calculate_metrics(
            trades=trades,
            starting_capital=Decimal("100000.00"),
        )

        assert report.summary.total_trades == 4
        assert report.summary.winning_trades == 0
        assert report.summary.losing_trades == 4
        assert report.summary.win_rate == Decimal("0.00")
        assert report.summary.loss_rate == Decimal("100.00")
        assert report.summary.total_net_pnl == Decimal("-5000.00")

        # Zero wins => Profit factor 0.00
        assert report.expectancy.profit_factor == Decimal("0.00")
        assert report.expectancy.is_infinite_profit_factor is False
        assert report.expectancy.average_win == Decimal("0.00")
        assert report.expectancy.average_loss == Decimal("1250.00")  # 5000 / 4
        assert report.expectancy.largest_loss == Decimal("2000.00")

        assert report.streaks.max_consecutive_losses == 4
        assert report.streaks.max_consecutive_wins == 0
        assert report.streaks.current_streak_type == "LOSS"
        assert report.streaks.current_streak_count == 4

        # Max drawdown = total loss = 5000 INR = 5.00% of 100,000
        assert report.drawdown.max_drawdown_inr == Decimal("5000.00")
        assert report.drawdown.max_drawdown_pct == Decimal("5.00")
        assert report.drawdown.is_in_drawdown is True

    def test_realistic_mixed_scenario(self) -> None:
        """Benchmark test with 6 wins, 3 losses, 1 breakeven."""
        trades = [
            create_trade(net_pnl="2000.00", exit_days_ago=10),
            create_trade(net_pnl="3000.00", exit_days_ago=9),
            create_trade(net_pnl="-1000.00", exit_days_ago=8),
            create_trade(net_pnl="1500.00", exit_days_ago=7),
            create_trade(net_pnl="0.00", exit_days_ago=6),  # Breakeven
            create_trade(net_pnl="-2000.00", exit_days_ago=5),
            create_trade(net_pnl="-1000.00", exit_days_ago=4),
            create_trade(net_pnl="4000.00", exit_days_ago=3),
            create_trade(net_pnl="2500.00", exit_days_ago=2),
            create_trade(net_pnl="1000.00", exit_days_ago=1),
        ]

        report = CoreMetricsEngine.calculate_metrics(
            trades=trades,
            starting_capital=Decimal("200000.00"),
        )

        # Summary
        assert report.summary.total_trades == 10
        assert report.summary.winning_trades == 6
        assert report.summary.losing_trades == 3
        assert report.summary.breakeven_trades == 1
        assert report.summary.win_rate == Decimal("60.00")
        assert report.summary.loss_rate == Decimal("30.00")
        assert report.summary.breakeven_rate == Decimal("10.00")

        # Total wins = 2000 + 3000 + 1500 + 4000 + 2500 + 1000 = 14000
        # Total losses = 1000 + 2000 + 1000 = 4000
        # Total Net = 14000 - 4000 = 10000
        assert report.summary.total_net_pnl == Decimal("10000.00")

        # Expectancy
        # avg_win = 14000 / 6 = 2333.33
        # avg_loss = 4000 / 3 = 1333.33
        assert report.expectancy.average_win == Decimal("2333.33")
        assert report.expectancy.average_loss == Decimal("1333.33")
        # profit_factor = 14000 / 4000 = 3.50
        assert report.expectancy.profit_factor == Decimal("3.50")
        # win_loss_ratio = 2333.33 / 1333.33 = 1.75
        assert report.expectancy.win_loss_ratio == Decimal("1.75")
        # expectancy_inr = 10000 / 10 = 1000.00
        assert report.expectancy.expectancy_inr == Decimal("1000.00")
        # expectancy_ratio = 1000.00 / 1333.33 = 0.75
        assert report.expectancy.expectancy_ratio == Decimal("0.75")
        assert report.expectancy.largest_win == Decimal("4000.00")
        assert report.expectancy.largest_loss == Decimal("2000.00")


class TestDrawdownAndRecovery:
    """Verifies peak-to-trough drawdown calculation, trough and recovery timestamps."""

    def test_drawdown_with_full_recovery(self) -> None:
        """Equity path:

        Start: 100,000
        Trade 1 (+10,000) -> 110,000 (New Peak)
        Trade 2 (-6,000)  -> 104,000 (DD: 6,000)
        Trade 3 (-4,000)  -> 100,000 (DD: 10,000 -> Max Trough)
        Trade 4 (+5,000)  -> 105,000 (Partial recovery)
        Trade 5 (+8,000)  -> 113,000 (Full Recovery! Exceeds 110,000 peak)
        """
        t1 = create_trade(net_pnl="10000.00", exit_days_ago=5)
        t2 = create_trade(net_pnl="-6000.00", exit_days_ago=4)
        t3 = create_trade(net_pnl="-4000.00", exit_days_ago=3)
        t4 = create_trade(net_pnl="5000.00", exit_days_ago=2)
        t5 = create_trade(net_pnl="8000.00", exit_days_ago=1)

        report = CoreMetricsEngine.calculate_metrics(
            trades=[t1, t2, t3, t4, t5],
            starting_capital=Decimal("100000.00"),
        )

        dd = report.drawdown
        assert dd.max_drawdown_inr == Decimal("10000.00")
        # Max DD % = 10,000 / 110,000 = 9.09%
        assert dd.max_drawdown_pct == Decimal("9.09")
        assert dd.peak_date == t1.exit_time
        assert dd.trough_date == t3.exit_time
        assert dd.recovery_date == t5.exit_time
        assert dd.is_in_drawdown is False
        assert dd.current_drawdown_inr == Decimal("0.00")

    def test_drawdown_currently_unrecovered(self) -> None:
        """Equity path finishing in an active drawdown."""
        t1 = create_trade(net_pnl="20000.00", exit_days_ago=3)
        t2 = create_trade(net_pnl="-5000.00", exit_days_ago=2)
        t3 = create_trade(net_pnl="-3000.00", exit_days_ago=1)

        report = CoreMetricsEngine.calculate_metrics(
            trades=[t1, t2, t3],
            starting_capital=Decimal("100000.00"),
        )

        dd = report.drawdown
        assert dd.max_drawdown_inr == Decimal("8000.00")
        assert dd.is_in_drawdown is True
        assert dd.recovery_date is None
        assert dd.current_drawdown_inr == Decimal("8000.00")


class TestStreaksAndBreakevens:
    """Verifies winning and losing streak counters, and breakeven reset behavior."""

    def test_breakeven_resets_streak(self) -> None:
        """3 wins, followed by 1 breakeven, then 2 wins."""
        trades = [
            create_trade(net_pnl="500.00", exit_days_ago=6),
            create_trade(net_pnl="700.00", exit_days_ago=5),
            create_trade(net_pnl="600.00", exit_days_ago=4),
            create_trade(net_pnl="0.00", exit_days_ago=3),  # Resets streak
            create_trade(net_pnl="1000.00", exit_days_ago=2),
            create_trade(net_pnl="1200.00", exit_days_ago=1),
        ]

        report = CoreMetricsEngine.calculate_metrics(trades=trades)

        # Longest streak is 3 (not 5)
        assert report.streaks.max_consecutive_wins == 3
        assert report.streaks.max_win_streak_pnl == Decimal("1800.00")  # 500+700+600
        # Current active streak is the trailing 2 wins
        assert report.streaks.current_streak_type == "WIN"
        assert report.streaks.current_streak_count == 2
        assert report.streaks.current_streak_pnl == Decimal("2200.00")  # 1000+1200


class TestFilteringAndHashing:
    """Tests date, segment, and symbol filters and SHA-256 fingerprint reproducibility."""

    def test_segment_and_date_filtering(self) -> None:
        t_delivery = create_trade(symbol="TCS", segment="EQUITY_DELIVERY", net_pnl="1000.00", exit_days_ago=10)
        t_intraday = create_trade(symbol="RELIANCE", segment="EQUITY_INTRADAY", net_pnl="2000.00", exit_days_ago=5)
        t_options = create_trade(symbol="NIFTY", segment="OPTIONS", net_pnl="3000.00", exit_days_ago=2)

        all_trades = [t_delivery, t_intraday, t_options]

        # 1. Filter by segment OPTIONS
        report_opt = CoreMetricsEngine.calculate_metrics(trades=all_trades, segments=["OPTIONS"])
        assert report_opt.summary.total_trades == 1
        assert report_opt.summary.total_net_pnl == Decimal("3000.00")

        # 2. Filter by symbol TCS
        report_tcs = CoreMetricsEngine.calculate_metrics(trades=all_trades, symbols=["TCS"])
        assert report_tcs.summary.total_trades == 1
        assert report_tcs.summary.total_net_pnl == Decimal("1000.00")

        # 3. Filter by date
        cutoff = (datetime(2026, 10, 15, tzinfo=UTC) - timedelta(days=6)).date()
        report_recent = CoreMetricsEngine.calculate_metrics(trades=all_trades, from_date=cutoff)
        assert report_recent.summary.total_trades == 2  # t_intraday and t_options

    def test_deterministic_sha256_hash(self) -> None:
        trade_id_1 = uuid.uuid4()
        trade_id_2 = uuid.uuid4()

        trades_a = [
            create_trade(trade_id=trade_id_1, net_pnl="1000.00", exit_days_ago=2),
            create_trade(trade_id=trade_id_2, net_pnl="2000.00", exit_days_ago=1),
        ]
        trades_b = [
            create_trade(trade_id=trade_id_1, net_pnl="1000.00", exit_days_ago=2),
            create_trade(trade_id=trade_id_2, net_pnl="2000.00", exit_days_ago=1),
        ]

        hash_a = CoreMetricsEngine.generate_dataset_hash(trades_a, starting_capital=Decimal("100000.00"))
        hash_b = CoreMetricsEngine.generate_dataset_hash(trades_b, starting_capital=Decimal("100000.00"))
        assert hash_a == hash_b

        # Modifying net P&L produces a completely different hash
        trades_modified = [
            create_trade(trade_id=trade_id_1, net_pnl="1000.01", exit_days_ago=2),
            create_trade(trade_id=trade_id_2, net_pnl="2000.00", exit_days_ago=1),
        ]
        hash_c = CoreMetricsEngine.generate_dataset_hash(trades_modified, starting_capital=Decimal("100000.00"))
        assert hash_a != hash_c


class TestDailyEquityCurve:
    """Verifies daily aggregation of multiple trades on the same calendar date."""

    def test_multiple_trades_same_day(self) -> None:
        t1 = create_trade(net_pnl="1000.00", gross_pnl="1050.00", charges="50.00", exit_days_ago=2)
        t2 = create_trade(net_pnl="2000.00", gross_pnl="2050.00", charges="50.00", exit_days_ago=2)
        t3 = create_trade(net_pnl="-500.00", gross_pnl="-450.00", charges="50.00", exit_days_ago=1)

        report = CoreMetricsEngine.calculate_metrics(
            trades=[t1, t2, t3],
            starting_capital=Decimal("50000.00"),
        )

        assert len(report.daily_equity_curve) == 2

        day1 = report.daily_equity_curve[0]
        assert day1.trades_count == 2
        assert day1.daily_gross_pnl == Decimal("3100.00")
        assert day1.daily_charges == Decimal("100.00")
        assert day1.daily_net_pnl == Decimal("3000.00")
        assert day1.equity == Decimal("53000.00")

        day2 = report.daily_equity_curve[1]
        assert day2.trades_count == 1
        assert day2.daily_net_pnl == Decimal("-500.00")
        assert day2.equity == Decimal("52500.00")


class TestFastApiMetricsEndpoints:
    """Tests FastAPI router endpoints for metrics calculation."""

    @pytest.fixture
    def client(self) -> TestClient:
        return TestClient(app)

    def test_compute_metrics_endpoint(self, client: TestClient) -> None:
        trade1 = create_trade(net_pnl="1500.00", exit_days_ago=2)
        trade2 = create_trade(net_pnl="-500.00", exit_days_ago=1)

        payload = {
            "trades": [trade1.model_dump(mode="json"), trade2.model_dump(mode="json")],
            "starting_capital": "100000.00",
        }

        response = client.post("/api/v1/metrics/compute", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["summary"]["total_trades"] == 2
        assert data["summary"]["winning_trades"] == 1
        assert data["summary"]["losing_trades"] == 1
        assert float(data["summary"]["win_rate"]) == 50.00
        assert float(data["summary"]["total_net_pnl"]) == 1000.00

    def test_get_metrics_summary_default_endpoint(self, client: TestClient) -> None:
        response = client.get("/api/v1/metrics/summary?starting_capital=50000.00")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total_trades"] == 0
        assert float(data["starting_capital"]) == 50000.00
