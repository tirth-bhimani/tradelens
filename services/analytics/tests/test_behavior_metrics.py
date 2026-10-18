"""Comprehensive unit and integration tests for Behavioral Leak Analytics Engine (Task 12).

Tests covers:
- Empty and boundary trade sets (zero division defense)
- Re-entry after loss tilt windows (5m, 15m, 30m, 60m)
- Same-symbol vs cross-symbol revenge trade classification
- Overtrading day detection and comparison against median baseline
- Position size creep detection immediately following losses
- Holding duration asymmetry and disposition effect ratio
- Composite 0-100 discipline score and top leak damage ranking
- FastAPI REST API endpoints
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from app.engine.behavior_metrics import BehaviorMetricsEngine
from app.main import app
from app.models.trade import PairedTrade
from fastapi.testclient import TestClient


def create_trade(
    symbol: str = "RELIANCE",
    net_pnl: str = "1000.00",
    quantity: str = "10",
    entry_time: datetime | None = None,
    exit_time: datetime | None = None,
    duration_seconds: int = 300,
    trade_id: uuid.UUID | None = None,
) -> PairedTrade:
    """Helper creating a PairedTrade with custom timestamps and P&L."""
    now = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
    entry = entry_time or now
    exit_t = exit_time or (entry + timedelta(seconds=duration_seconds))

    return PairedTrade(
        id=trade_id or uuid.uuid4(),
        symbol=symbol,
        segment="EQUITY_INTRADAY",
        instrument_type="EQ",
        is_short=False,
        is_intraday=True,
        entry_time=entry,
        exit_time=exit_t,
        trade_duration_seconds=duration_seconds,
        quantity=Decimal(quantity),
        entry_price=Decimal("2500.00"),
        exit_price=Decimal("2600.00"),
        gross_pnl=Decimal(net_pnl) + Decimal("20.00"),
        charges=Decimal("20.00"),
        net_pnl=Decimal(net_pnl),
    )


class TestEmptyAndBoundaryCases:
    """Tests zero division defense and safe defaults on empty or single trade inputs."""

    def test_empty_trades_list(self) -> None:
        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[])
        assert report.discipline_score == 100
        assert report.top_leak.leak_type == "NONE"
        assert report.reentry.total_reentry_trades == 0
        assert report.overtrading.overtrading_days_count == 0
        assert report.size_creep.size_creep_trades_count == 0
        assert report.holding_time.holding_duration_ratio is None

    def test_single_trade_no_reentry_possible(self) -> None:
        t1 = create_trade(net_pnl="-500.00")
        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[t1])
        assert report.discipline_score == 100
        assert report.reentry.total_reentry_trades == 0
        assert report.overtrading.overtrading_days_count == 0
        assert report.size_creep.size_creep_trades_count == 0


class TestReentryTiltAnalysis:
    """Tests detection of hasty re-entries across 5m, 15m, 30m, and 60m windows."""

    def test_reentry_within_5_minutes_same_symbol(self) -> None:
        t0 = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
        # Loss trade: exits at 10:10
        t1 = create_trade(
            symbol="RELIANCE",
            net_pnl="-2000.00",
            entry_time=t0,
            exit_time=t0 + timedelta(minutes=10),
        )
        # Re-entry 3 minutes later: enters at 10:13, exits at 10:20 (loses again)
        t2 = create_trade(
            symbol="RELIANCE",
            net_pnl="-1500.00",
            entry_time=t0 + timedelta(minutes=13),
            exit_time=t0 + timedelta(minutes=20),
        )

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[t1, t2])
        reentry = report.reentry

        assert reentry.total_reentry_trades == 1
        assert reentry.total_reentry_net_pnl == Decimal("-1500.00")

        # Must be present in all buckets: 5m, 15m, 30m, 60m
        b5 = next(b for b in reentry.buckets if b.window_minutes == 5)
        assert b5.trades_count == 1
        assert b5.same_symbol_count == 1
        assert b5.cross_symbol_count == 0
        assert b5.win_rate == Decimal("0.00")
        assert b5.total_net_pnl == Decimal("-1500.00")

        b15 = next(b for b in reentry.buckets if b.window_minutes == 15)
        assert b15.trades_count == 1

        b30 = next(b for b in reentry.buckets if b.window_minutes == 30)
        assert b30.trades_count == 1

        b60 = next(b for b in reentry.buckets if b.window_minutes == 60)
        assert b60.trades_count == 1

    def test_reentry_within_20_minutes_cross_symbol(self) -> None:
        t0 = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
        # Loss in RELIANCE, exits at 10:10
        t1 = create_trade(
            symbol="RELIANCE",
            net_pnl="-1000.00",
            entry_time=t0,
            exit_time=t0 + timedelta(minutes=10),
        )
        # Cross-symbol re-entry in TCS 20 mins later (enters at 10:30)
        t2 = create_trade(
            symbol="TCS",
            net_pnl="500.00",
            entry_time=t0 + timedelta(minutes=30),
            exit_time=t0 + timedelta(minutes=45),
        )

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[t1, t2])
        reentry = report.reentry

        b5 = next(b for b in reentry.buckets if b.window_minutes == 5)
        b15 = next(b for b in reentry.buckets if b.window_minutes == 15)
        b30 = next(b for b in reentry.buckets if b.window_minutes == 30)
        b60 = next(b for b in reentry.buckets if b.window_minutes == 60)

        assert b5.trades_count == 0
        assert b15.trades_count == 0
        assert b30.trades_count == 1
        assert b30.cross_symbol_count == 1
        assert b30.same_symbol_count == 0
        assert b30.win_rate == Decimal("100.00")
        assert b60.trades_count == 1

    def test_reentry_after_win_is_not_flagged(self) -> None:
        t0 = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
        # Profitable trade: exits at 10:10
        t1 = create_trade(
            symbol="RELIANCE",
            net_pnl="2000.00",
            entry_time=t0,
            exit_time=t0 + timedelta(minutes=10),
        )
        # Trade entered 2 minutes later after a WIN
        t2 = create_trade(
            symbol="RELIANCE",
            net_pnl="500.00",
            entry_time=t0 + timedelta(minutes=12),
            exit_time=t0 + timedelta(minutes=20),
        )

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[t1, t2])
        assert report.reentry.total_reentry_trades == 0


class TestOvertradingDaysAnalysis:
    """Tests identification of volume spike days relative to user's median."""

    def test_overtrading_spike_day_detection(self) -> None:
        trades: list[PairedTrade] = []

        # Day 1: 2 trades (net: +1000)
        d1 = datetime(2026, 10, 10, 10, 0, 0, tzinfo=UTC)
        trades.append(create_trade(net_pnl="500.00", entry_time=d1, exit_time=d1 + timedelta(minutes=10)))
        trades.append(create_trade(net_pnl="500.00", entry_time=d1 + timedelta(minutes=20), exit_time=d1 + timedelta(minutes=30)))

        # Day 2: 2 trades (net: -300)
        d2 = datetime(2026, 10, 11, 10, 0, 0, tzinfo=UTC)
        trades.append(create_trade(net_pnl="-150.00", entry_time=d2, exit_time=d2 + timedelta(minutes=10)))
        trades.append(create_trade(net_pnl="-150.00", entry_time=d2 + timedelta(minutes=20), exit_time=d2 + timedelta(minutes=30)))

        # Day 3: 3 trades (net: +200)
        d3 = datetime(2026, 10, 12, 10, 0, 0, tzinfo=UTC)
        for i in range(3):
            t_in = d3 + timedelta(minutes=i * 20)
            trades.append(create_trade(net_pnl="100.00", entry_time=t_in, exit_time=t_in + timedelta(minutes=10)))

        # Day 4: 7 trades (Overtrading Day! Exceeds 1.5x median of 2.0 and >= 5 trades, loses -4000)
        d4 = datetime(2026, 10, 13, 10, 0, 0, tzinfo=UTC)
        for i in range(7):
            t_in = d4 + timedelta(minutes=i * 20)
            trades.append(create_trade(net_pnl="-600.00" if i < 5 else "100.00", entry_time=t_in, exit_time=t_in + timedelta(minutes=10)))

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(
            trades=trades,
            overtrading_multiplier=Decimal("1.50"),
            min_overtrading_trades=5,
        )

        ot = report.overtrading
        assert ot.total_active_days == 4
        assert ot.overtrading_days_count == 1
        assert ot.baseline_median_trades == Decimal("2.50")  # median of [2, 2, 3, 7] is 2.5
        assert ot.overtrading_trades_count == 7
        # Day 4 Net: 5 * (-600) + 2 * (100) = -2800.00
        assert ot.overtrading_net_pnl == Decimal("-2800.00")
        assert ot.normal_days_count == 3


class TestPositionSizeCreep:
    """Tests lot size spikes after losing trades."""

    def test_size_creep_after_loss(self) -> None:
        t0 = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
        # Trade 1: 50 qty, loses 2000
        t1 = create_trade(
            quantity="50",
            net_pnl="-2000.00",
            entry_time=t0,
            exit_time=t0 + timedelta(minutes=10),
        )
        # Trade 2: 100 qty (2.0x size spike after loss!) -> loses 4000
        t2 = create_trade(
            quantity="100",
            net_pnl="-4000.00",
            entry_time=t0 + timedelta(minutes=15),
            exit_time=t0 + timedelta(minutes=25),
        )
        # Trade 3: 50 qty (wins 1000)
        t3 = create_trade(
            quantity="50",
            net_pnl="1000.00",
            entry_time=t0 + timedelta(minutes=30),
            exit_time=t0 + timedelta(minutes=40),
        )

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(
            trades=[t1, t2, t3],
            size_creep_threshold=Decimal("1.25"),
        )

        sc = report.size_creep
        assert sc.post_loss_trades_count == 2  # Both t2 (after t1 loss) and t3 (after t2 loss)
        assert sc.size_creep_trades_count == 1  # Only t2 exhibited size creep (100 vs 50)
        assert sc.pct_of_post_loss_trades == Decimal("50.00")
        assert sc.size_creep_net_pnl == Decimal("-4000.00")
        assert sc.max_size_multiplier == Decimal("2.00")


class TestHoldingDurationDispositionEffect:
    """Tests asymmetry between winning holding time vs losing holding time."""

    def test_disposition_effect_detected(self) -> None:
        # 2 winning trades: held 120s and 240s (avg = 180s = 3m)
        w1 = create_trade(net_pnl="1000.00", duration_seconds=120)
        w2 = create_trade(net_pnl="2000.00", duration_seconds=240)

        # 2 losing trades: held 720s and 960s (avg = 840s = 14m)
        l1 = create_trade(net_pnl="-1000.00", duration_seconds=720)
        l2 = create_trade(net_pnl="-1500.00", duration_seconds=960)

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[w1, w2, l1, l2])
        ht = report.holding_time

        assert ht.winners_count == 2
        assert ht.losers_count == 2
        assert ht.avg_winner_duration_seconds == 180
        assert ht.avg_loser_duration_seconds == 840
        assert ht.avg_winner_duration_display == "3m"
        assert ht.avg_loser_duration_display == "14m"

        # Ratio: 840 / 180 = 4.67
        assert ht.holding_duration_ratio == Decimal("4.67")
        assert ht.is_disposition_effect_detected is True

    def test_disciplined_loss_cutting_no_disposition(self) -> None:
        # Winners held 600s, Losers held 120s
        w1 = create_trade(net_pnl="1000.00", duration_seconds=600)
        l1 = create_trade(net_pnl="-500.00", duration_seconds=120)

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[w1, l1])
        assert report.holding_time.is_disposition_effect_detected is False
        assert report.holding_time.holding_duration_ratio == Decimal("0.20")


class TestCompositeDisciplineScoringAndTopLeak:
    """Tests 0-100 composite scoring and top leak ranking."""

    def test_disciplined_trader_gets_flawless_score(self) -> None:
        trades = [
            create_trade(net_pnl="1000.00", duration_seconds=300),
            create_trade(net_pnl="1500.00", duration_seconds=300),
            create_trade(net_pnl="800.00", duration_seconds=300),
        ]
        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=trades)
        assert report.discipline_score == 100
        assert report.top_leak.leak_type == "NONE"

    def test_severe_tilt_trader_identifies_top_leak(self) -> None:
        t0 = datetime(2026, 10, 15, 10, 0, 0, tzinfo=UTC)
        # Loss of 5,000
        t1 = create_trade(net_pnl="-5000.00", entry_time=t0, exit_time=t0 + timedelta(minutes=10))
        # Revenge trade 2 mins later loses 8,000
        t2 = create_trade(net_pnl="-8000.00", entry_time=t0 + timedelta(minutes=12), exit_time=t0 + timedelta(minutes=25))

        report = BehaviorMetricsEngine.calculate_behavioral_metrics(trades=[t1, t2])
        assert report.discipline_score < 100
        assert report.top_leak.leak_type == "REENTRY_TILT"
        assert report.top_leak.financial_impact_inr == Decimal("8000.00")


class TestFastApiBehaviorEndpoints:
    """Tests FastAPI router endpoints for behavioral analytics."""

    @pytest.fixture
    def client(self) -> TestClient:
        return TestClient(app)

    def test_compute_behavior_endpoint(self, client: TestClient) -> None:
        t1 = create_trade(net_pnl="-1000.00")
        t2 = create_trade(net_pnl="500.00")

        payload = {
            "trades": [t1.model_dump(mode="json"), t2.model_dump(mode="json")],
            "overtrading_multiplier": "1.50",
            "min_overtrading_trades": 5,
        }

        response = client.post("/api/v1/behavior/compute", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "discipline_score" in data
        assert "top_leak" in data
        assert "reentry" in data
        assert "overtrading" in data
        assert "size_creep" in data
        assert "holding_time" in data

    def test_get_behavior_summary_default_endpoint(self, client: TestClient) -> None:
        response = client.get("/api/v1/behavior/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["discipline_score"] == 100
        assert data["top_leak"]["leak_type"] == "NONE"
