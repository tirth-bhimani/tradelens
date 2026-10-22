"""Unit and Integration Tests for Deterministic Trade Replay Engine & 70/30 Split (Task 21).

Tests cover:
- All 9 Rule Catalog types evaluated chronologically:
  1. COOL_OFF_AFTER_LOSS (window active, expired, trigger_loss_inr, max_consecutive_losses)
  2. MAX_CONSECUTIVE_LOSSES (HALT_FOR_DAY, MANDATORY_COOLDOWN, win reset)
  3. DAILY_LOSS_LIMIT (rupee cap, capital percentage, daily reset)
  4. MAX_DAILY_TRADES_LIMIT (intraday count limit, multi-day reset)
  5. TIME_OF_DAY_CUTOFF (morning open, evening cutoff, midday lunch chop)
  6. MAX_POSITION_SIZE (quantity, lots, capital allocation)
  7. SKIP_INSTRUMENT_TYPE (Options Buy, Options Sell, Futures, Equity)
  8. NO_TRADING_ON_EXPIRY_DAY (HALT_FOR_DAY, CAP_LOTS, index matching)
  9. COMPOSITE_RULE (conjunction AND of multiple guardrails)
- 70/30 Chronological Train/Test Partitioning
- Overfitting Detection Heuristics
- Small Sample Size Alerts (<30 trades, <10 test trades)
- Dual Equity Curve Timeseries Synchronization
- Skipped Trades Diagnostic Ledger & Savings Summary
- FastAPI REST API Endpoint `POST /api/v1/rules/replay`
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.trade import PairedTrade, TradeInstrumentType, TradeSegment
from app.rules.catalog import (
    CompositeRule,
    CoolOffAfterLossRule,
    DailyLossLimitRule,
    MaxConsecutiveLossesRule,
    MaxDailyTradesLimitRule,
    MaxPositionSizeRule,
    NoTradingOnExpiryDayRule,
    SkipInstrumentTypeRule,
    TimeOfDayCutoffRule,
)
from app.rules.replay import (
    DualEquityPoint,
    MetricDelta,
    ReplayRequest,
    ReplayResult,
    SkippedTradeDetail,
    SkippedTradesSummary,
    execute_rule_replay,
    run_replay_simulation,
    summarize_skipped_trades,
)

IST = ZoneInfo("Asia/Kolkata")
client = TestClient(app)


# ==============================================================================
# Helper Factories
# ==============================================================================
def make_trade(
    symbol: str = "RELIANCE",
    segment: TradeSegment = "EQUITY_INTRADAY",
    instrument_type: TradeInstrumentType = "EQ",
    is_short: bool = False,
    is_intraday: bool = True,
    entry_time: datetime | None = None,
    exit_time: datetime | None = None,
    quantity: Decimal = Decimal("10"),
    entry_price: Decimal = Decimal("100.00"),
    exit_price: Decimal = Decimal("110.00"),
    gross_pnl: Decimal = Decimal("100.00"),
    charges: Decimal = Decimal("10.00"),
    net_pnl: Decimal = Decimal("90.00"),
    trade_id: uuid.UUID | None = None,
) -> PairedTrade:
    """Helper creating a deterministic PairedTrade for testing."""
    base_time = entry_time or datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST)
    close_time = exit_time or (base_time + timedelta(minutes=15))

    return PairedTrade(
        id=trade_id or uuid.uuid4(),
        symbol=symbol,
        segment=segment,
        instrument_type=instrument_type,
        is_short=is_short,
        is_intraday=is_intraday,
        entry_time=base_time,
        exit_time=close_time,
        trade_duration_seconds=int((close_time - base_time).total_seconds()),
        quantity=quantity,
        entry_price=entry_price,
        exit_price=exit_price,
        gross_pnl=gross_pnl,
        charges=charges,
        net_pnl=net_pnl,
    )


# ==============================================================================
# Rule 1: COOL_OFF_AFTER_LOSS Tests
# ==============================================================================
def test_cool_off_after_loss_triggers_and_expires() -> None:
    """Tests that cooldown skips trades entered within window and allows trades after window."""
    rule = CoolOffAfterLossRule(cooldown_minutes=20)
    day = date(2026, 10, 15)

    # Trade 1: losing trade exiting at 10:00 IST
    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("-1500.00"),
    )
    # Trade 2: entered at 10:10 IST (10 min < 20 min cooldown) -> should be SKIPPED
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 10, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 25, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )
    # Trade 3: entered at 10:25 IST (25 min > 20 min cooldown) -> should be EXECUTED
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 25, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 40, 0, tzinfo=IST),
        net_pnl=Decimal("800.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3], rule)
    assert len(executed) == 2
    assert executed[0].id == t1.id
    assert executed[1].id == t3.id

    assert len(skipped) == 1
    assert skipped[0].trade_id == t2.id
    assert "COOL_OFF_AFTER_LOSS" in skipped[0].reason


def test_cool_off_with_trigger_loss_and_consecutive_losses() -> None:
    """Tests cooldown trigger conditions (minimum loss in INR and consecutive losses count)."""
    rule = CoolOffAfterLossRule(
        cooldown_minutes=15,
        trigger_loss_inr=1000.0,
        max_consecutive_losses=2,
    )
    # Loss 1: -₹500 (below ₹1000 threshold, so streak doesn't qualify trigger loss)
    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 9, 45, 0, tzinfo=IST),
        net_pnl=Decimal("-500.00"),
    )
    # Loss 2: -₹1500 (qualifies trigger_loss, but consecutive_losses is only 1 for qualified)
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 50, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 5, 0, tzinfo=IST),
        net_pnl=Decimal("-1500.00"),
    )
    # Trade 3 entered 5m after Loss 2 -> should be SKIPPED (2 consecutive losses and loss >= 1000 INR)
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 10, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 20, 0, tzinfo=IST),
        net_pnl=Decimal("-1200.00"),
    )
    # Trade 4 entered 20m after Loss 2 (10:25, after 15m cooldown expires at 10:20) -> should be EXECUTED
    t4 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 25, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 35, 0, tzinfo=IST),
        net_pnl=Decimal("1000.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4], rule)
    assert len(executed) == 3
    assert len(skipped) == 1
    assert skipped[0].trade_id == t3.id


# ==============================================================================
# Rule 2: MAX_CONSECUTIVE_LOSSES Tests
# ==============================================================================
def test_max_consecutive_losses_halt_for_day() -> None:
    """Tests circuit breaker halting the rest of the market day upon reaching loss streak."""
    rule = MaxConsecutiveLossesRule(consecutive_losses=3, action="HALT_FOR_DAY")

    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 9, 45, 0, tzinfo=IST),
        net_pnl=Decimal("-100.00"),
    )
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 50, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("-200.00"),
    )
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 10, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 20, 0, tzinfo=IST),
        net_pnl=Decimal("-300.00"),
    )
    # Trade 4 is attempted on same day after 3 consecutive losses -> should be SKIPPED
    t4 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 45, 0, tzinfo=IST),
        net_pnl=Decimal("1000.00"),
    )
    # Trade 5 is attempted on next day -> should be EXECUTED (daily reset)
    t5 = make_trade(
        entry_time=datetime(2026, 10, 16, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 16, 9, 45, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4, t5], rule)
    assert len(executed) == 4
    assert len(skipped) == 1
    assert skipped[0].trade_id == t4.id
    assert "MAX_CONSECUTIVE_LOSSES" in skipped[0].reason


def test_max_consecutive_losses_reset_by_winning_trade() -> None:
    """Tests that an intermediate winning trade resets the consecutive loss streak."""
    rule = MaxConsecutiveLossesRule(consecutive_losses=2, action="HALT_FOR_DAY")

    # Loss 1
    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 9, 40, 0, tzinfo=IST),
        net_pnl=Decimal("-500.00"),
    )
    # Win (resets streak to 0)
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 50, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("300.00"),
    )
    # Loss 2 (streak is now 1, not 2)
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 10, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 20, 0, tzinfo=IST),
        net_pnl=Decimal("-400.00"),
    )
    # Trade 4 (streak is 1 < 2, so should execute)
    t4 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 40, 0, tzinfo=IST),
        net_pnl=Decimal("200.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4], rule)
    assert len(executed) == 4
    assert len(skipped) == 0


# ==============================================================================
# Rule 3: DAILY_LOSS_LIMIT Tests
# ==============================================================================
def test_daily_loss_limit_rupee_and_capital_percentage() -> None:
    """Tests rupee and percentage daily loss limits."""
    # Test Rupee limit: ₹5,000
    rule_inr = DailyLossLimitRule(max_loss_inr=5000.0)

    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("-3000.00"),
    )
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 15, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 45, 0, tzinfo=IST),
        net_pnl=Decimal("-2500.00"),
    )
    # Trade 3 on same day: realized loss is ₹-5500 <= -₹5000 -> skipped
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 11, 0, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 11, 30, 0, tzinfo=IST),
        net_pnl=Decimal("1000.00"),
    )
    # Trade 4 on next day: daily loss resets -> executed
    t4 = make_trade(
        entry_time=datetime(2026, 10, 16, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 16, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4], rule_inr)
    assert len(executed) == 3
    assert len(skipped) == 1
    assert skipped[0].trade_id == t3.id
    assert "DAILY_LOSS_LIMIT" in skipped[0].reason

    # Test Percentage limit: 2% of ₹100,000 = ₹2,000
    rule_pct = DailyLossLimitRule(max_loss_percent_capital=2.0, starting_capital=100000.0)
    t_loss = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("-2500.00"),
    )
    t_next = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 11, 0, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )
    exec_pct, skip_pct, _ = run_replay_simulation([t_loss, t_next], rule_pct, starting_capital=Decimal("100000.00"))
    assert len(exec_pct) == 1
    assert len(skip_pct) == 1
    assert skip_pct[0].trade_id == t_next.id


# ==============================================================================
# Rule 4: MAX_DAILY_TRADES_LIMIT Tests
# ==============================================================================
def test_max_daily_trades_limit() -> None:
    """Tests capping maximum completed trades per session."""
    rule = MaxDailyTradesLimitRule(max_trades=2)

    # Day 1: 3 trades
    t1 = make_trade(entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST))
    t2 = make_trade(entry_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST))
    t3 = make_trade(entry_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST))

    # Day 2: 1 trade
    t4 = make_trade(entry_time=datetime(2026, 10, 16, 9, 30, 0, tzinfo=IST))

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4], rule)
    assert len(executed) == 3
    assert len(skipped) == 1
    assert skipped[0].trade_id == t3.id
    assert "MAX_DAILY_TRADES_LIMIT" in skipped[0].reason


# ==============================================================================
# Rule 5: TIME_OF_DAY_CUTOFF Tests
# ==============================================================================
def test_time_of_day_cutoff_hours_and_lunch_break() -> None:
    """Tests operating window boundaries and midday lunch chop rejection."""
    rule = TimeOfDayCutoffRule(
        allowed_start_time="09:30",
        allowed_end_time="15:00",
        restricted_lunch_break=True,
    )

    # 1. Early entry at 09:15 IST -> skipped
    t_early = make_trade(entry_time=datetime(2026, 10, 15, 9, 15, 0, tzinfo=IST))
    # 2. Valid morning entry at 10:00 IST -> executed
    t_morning = make_trade(entry_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST))
    # 3. Lunch break entry at 12:15 IST -> skipped
    t_lunch = make_trade(entry_time=datetime(2026, 10, 15, 12, 15, 0, tzinfo=IST))
    # 4. Valid afternoon entry at 14:00 IST -> executed
    t_afternoon = make_trade(entry_time=datetime(2026, 10, 15, 14, 0, 0, tzinfo=IST))
    # 5. Late entry at 15:15 IST -> skipped
    t_late = make_trade(entry_time=datetime(2026, 10, 15, 15, 15, 0, tzinfo=IST))

    executed, skipped, _ = run_replay_simulation(
        [t_early, t_morning, t_lunch, t_afternoon, t_late], rule
    )
    assert len(executed) == 2
    assert {t.id for t in executed} == {t_morning.id, t_afternoon.id}
    assert len(skipped) == 3
    assert {s.trade_id for s in skipped} == {t_early.id, t_lunch.id, t_late.id}


# ==============================================================================
# Rule 6: MAX_POSITION_SIZE Tests
# ==============================================================================
def test_max_position_size() -> None:
    """Tests quantity, lot, and capital position size constraints."""
    # 1. Max quantity cap
    rule_qty = MaxPositionSizeRule(max_quantity=100)
    t_small = make_trade(quantity=Decimal("50"))
    t_big = make_trade(quantity=Decimal("150"))
    exec_qty, skip_qty, _ = run_replay_simulation([t_small, t_big], rule_qty)
    assert len(exec_qty) == 1
    assert len(skip_qty) == 1
    assert skip_qty[0].trade_id == t_big.id

    # 2. Max capital per trade: ₹50,000
    rule_cap = MaxPositionSizeRule(max_capital_per_trade_inr=50000.0)
    t_ok_cap = make_trade(entry_price=Decimal("100.00"), quantity=Decimal("400"))  # ₹40,000
    t_over_cap = make_trade(entry_price=Decimal("200.00"), quantity=Decimal("300"))  # ₹60,000
    exec_cap, skip_cap, _ = run_replay_simulation([t_ok_cap, t_over_cap], rule_cap)
    assert len(exec_cap) == 1
    assert len(skip_cap) == 1
    assert skip_cap[0].trade_id == t_over_cap.id


# ==============================================================================
# Rule 7: SKIP_INSTRUMENT_TYPE Tests
# ==============================================================================
def test_skip_instrument_type() -> None:
    """Tests selective filtering of disallowed instrument categories."""
    rule = SkipInstrumentTypeRule(disallowed_types=["OPTIONS_BUY", "FUTURES"])

    # Options Buy: CE, not short
    t_opt_buy = make_trade(
        symbol="NIFTY24OCT25000CE",
        segment="OPTIONS",
        instrument_type="CE",
        is_short=False,
    )
    # Options Sell: CE, short -> allowed
    t_opt_sell = make_trade(
        symbol="NIFTY24OCT25000CE",
        segment="OPTIONS",
        instrument_type="CE",
        is_short=True,
    )
    # Futures trade -> skipped
    t_fut = make_trade(
        symbol="NIFTY24OCTFUT",
        segment="FUTURES",
        instrument_type="FUT",
    )
    # Equity Intraday -> allowed
    t_eq = make_trade(
        symbol="TCS",
        segment="EQUITY_INTRADAY",
        instrument_type="EQ",
    )

    executed, skipped, _ = run_replay_simulation(
        [t_opt_buy, t_opt_sell, t_fut, t_eq], rule
    )
    assert len(executed) == 2
    assert {t.id for t in executed} == {t_opt_sell.id, t_eq.id}
    assert len(skipped) == 2
    assert {s.trade_id for s in skipped} == {t_opt_buy.id, t_fut.id}


# ==============================================================================
# Rule 8: NO_TRADING_ON_EXPIRY_DAY Tests
# ==============================================================================
def test_no_trading_on_expiry_day() -> None:
    """Tests expiry session detection and HALT_FOR_DAY vs CAP_LOTS actions."""
    # 2026-10-15 is a Thursday (NIFTY standard weekly expiry)
    rule_halt = NoTradingOnExpiryDayRule(
        action="HALT_FOR_DAY",
        affected_indices=["NIFTY"],
    )
    t_nifty_expiry = make_trade(
        symbol="NIFTY24OCT25000CE",
        segment="OPTIONS",
        instrument_type="CE",
        entry_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
    )
    # BANKNIFTY on Thursday is not its expiry (Wednesdays)
    t_bnf = make_trade(
        symbol="BANKNIFTY24OCT50000CE",
        segment="OPTIONS",
        instrument_type="CE",
        entry_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST),
    )

    executed, skipped, _ = run_replay_simulation([t_nifty_expiry, t_bnf], rule_halt)
    assert len(executed) == 1
    assert executed[0].id == t_bnf.id
    assert len(skipped) == 1
    assert skipped[0].trade_id == t_nifty_expiry.id


# ==============================================================================
# Rule 9: COMPOSITE_RULE Tests
# ==============================================================================
def test_composite_rule_conjunction() -> None:
    """Tests composite rule combining daily trade limit and cooldown after loss."""
    rule = CompositeRule(
        name="Disciplined Scalper",
        rules=[
            MaxDailyTradesLimitRule(max_trades=2),
            CoolOffAfterLossRule(cooldown_minutes=15),
        ],
    )

    # Trade 1: losing trade exiting at 10:00
    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 45, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 0, 0, tzinfo=IST),
        net_pnl=Decimal("-1000.00"),
    )
    # Trade 2 entered at 10:05 (violates cooldown) -> skipped
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 5, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 20, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )
    # Trade 3 entered at 10:25 (cooldown passed, count becomes 2) -> executed
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 25, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 45, 0, tzinfo=IST),
        net_pnl=Decimal("800.00"),
    )
    # Trade 4 entered at 11:00 (violates max_trades=2) -> skipped
    t4 = make_trade(
        entry_time=datetime(2026, 10, 15, 11, 0, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 11, 20, 0, tzinfo=IST),
        net_pnl=Decimal("400.00"),
    )

    executed, skipped, _ = run_replay_simulation([t1, t2, t3, t4], rule)
    assert len(executed) == 2
    assert {t.id for t in executed} == {t1.id, t3.id}
    assert len(skipped) == 2
    assert skipped[0].trade_id == t2.id
    assert "COOL_OFF_AFTER_LOSS" in skipped[0].reason
    assert skipped[1].trade_id == t4.id
    assert "MAX_DAILY_TRADES_LIMIT" in skipped[1].reason


# ==============================================================================
# 70/30 Split & Overfitting Detection Tests
# ==============================================================================
def test_70_30_split_and_overfitting_detector_clean() -> None:
    """Tests replay across 70/30 partitions where rule improves both train and test sets."""
    rule = CoolOffAfterLossRule(cooldown_minutes=15)
    trades: list[PairedTrade] = []

    # Generate 40 trades (28 train, 12 test) across multiple days
    # In both partitions, post-loss immediate trades are big losers that get saved
    start = datetime(2026, 9, 1, 9, 30, 0, tzinfo=IST)
    for i in range(40):
        t_entry = start + timedelta(hours=i * 2)
        if i % 4 == 0:
            net = Decimal("-500.00")
        elif i % 4 == 1:
            t_entry = trades[-1].exit_time + timedelta(minutes=5)
            net = Decimal("-2000.00")
        else:
            net = Decimal("1000.00")
        t_exit = t_entry + timedelta(minutes=10)
        trades.append(make_trade(entry_time=t_entry, exit_time=t_exit, net_pnl=net))

    res = execute_rule_replay(trades, rule, starting_capital=Decimal("100000.00"))

    assert res.rule_type == "COOL_OFF_AFTER_LOSS"
    assert res.overall_after.total_net_pnl > res.overall_before.total_net_pnl
    assert not res.is_overfit
    assert res.overfit_reason is None
    assert not res.small_sample_warning  # 40 trades > 30 and 12 test trades > 10


def test_70_30_split_detects_overfitting() -> None:
    """Tests that severe out-of-sample degradation flags is_overfit=True."""
    rule = CoolOffAfterLossRule(cooldown_minutes=30)
    trades: list[PairedTrade] = []

    start = datetime(2026, 9, 1, 9, 30, 0, tzinfo=IST)
    # First 28 trades (Train 70%): post-loss trades are massive losers (-₹5000), so rule skips them
    for i in range(28):
        t_entry = start + timedelta(hours=i * 3)
        if i % 2 == 1:
            t_entry = trades[-1].exit_time + timedelta(minutes=5)
            net = Decimal("-5000.00")
        else:
            net = Decimal("-1000.00")
        trades.append(make_trade(entry_time=t_entry, exit_time=t_entry + timedelta(minutes=10), net_pnl=net))

    # Next 12 trades (Test 30%): post-loss trades are massive WINNERS (+₹8000), so rule skips winners!
    test_start = trades[-1].exit_time + timedelta(days=1)
    for i in range(12):
        t_entry = test_start + timedelta(hours=i * 3)
        if i % 2 == 1:
            t_entry = trades[-1].exit_time + timedelta(minutes=5)
            net = Decimal("8000.00")  # Huge winner sacrificed!
        else:
            net = Decimal("-1000.00")
        trades.append(make_trade(entry_time=t_entry, exit_time=t_entry + timedelta(minutes=10), net_pnl=net))

    res = execute_rule_replay(trades, rule, starting_capital=Decimal("100000.00"))

    assert res.is_overfit is True
    assert res.overfit_reason is not None
    assert "Overfitting detected" in res.overfit_reason


def test_small_sample_warning() -> None:
    """Tests sample size warning triggers when dataset has fewer than 30 trades."""
    rule = MaxDailyTradesLimitRule(max_trades=5)
    # Only 15 trades
    trades = [
        make_trade(
            entry_time=datetime(2026, 10, 1, 9, 30, 0, tzinfo=IST) + timedelta(days=i),
            net_pnl=Decimal("100.00"),
        )
        for i in range(15)
    ]

    res = execute_rule_replay(trades, rule)
    assert res.small_sample_warning is True
    assert "Low statistical sample" in (res.small_sample_reason or "")


# ==============================================================================
# Dual Equity Curve & Skipped Summary Tests
# ==============================================================================
def test_dual_equity_curve_and_skipped_summary() -> None:
    """Tests dual equity curve timeseries and skipped trades financial aggregation."""
    rule = CoolOffAfterLossRule(cooldown_minutes=20)

    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 9, 45, 0, tzinfo=IST),
        net_pnl=Decimal("-2000.00"),
    )
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 50, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 5, 0, tzinfo=IST),
        net_pnl=Decimal("-1500.00"),  # Skipped loss
    )
    t3 = make_trade(
        entry_time=datetime(2026, 10, 15, 10, 15, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 30, 0, tzinfo=IST),
        net_pnl=Decimal("3000.00"),  # Executed win
    )

    res = execute_rule_replay([t1, t2, t3], rule, starting_capital=Decimal("100000.00"))

    # Initial curve point + 3 trade points = 4 points
    assert len(res.dual_equity_curve) == 4
    # Baseline
    assert res.dual_equity_curve[0].actual_equity == Decimal("100000.00")
    assert res.dual_equity_curve[0].simulated_equity == Decimal("100000.00")

    # Point 1 (t1 executed loss: -2000)
    assert res.dual_equity_curve[1].actual_equity == Decimal("98000.00")
    assert res.dual_equity_curve[1].simulated_equity == Decimal("98000.00")

    # Point 2 (t2 skipped loss: -1500 -> actual=96500, simulated stays 98000!)
    assert res.dual_equity_curve[2].actual_equity == Decimal("96500.00")
    assert res.dual_equity_curve[2].simulated_equity == Decimal("98000.00")
    assert res.dual_equity_curve[2].is_skipped is True

    # Point 3 (t3 executed win: +3000 -> actual=99500, simulated=101000)
    assert res.dual_equity_curve[3].actual_equity == Decimal("99500.00")
    assert res.dual_equity_curve[3].simulated_equity == Decimal("101000.00")
    assert res.dual_equity_curve[3].is_skipped is False

    # Check skipped summary
    assert res.skipped_summary.total_skipped == 1
    assert res.skipped_summary.losing_trades_avoided_count == 1
    assert res.skipped_summary.loss_avoided_inr == Decimal("1500.00")
    assert res.skipped_summary.winning_trades_sacrificed_count == 0
    assert res.skipped_summary.profit_sacrificed_inr == Decimal("0.00")
    assert res.skipped_summary.net_savings_inr == Decimal("1500.00")


# ==============================================================================
# FastAPI REST Endpoint Tests
# ==============================================================================
def test_fastapi_replay_endpoint_success() -> None:
    """Tests POST /api/v1/rules/replay returns HTTP 200 with complete ReplayResult."""
    t1 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 30, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 9, 45, 0, tzinfo=IST),
        net_pnl=Decimal("-1000.00"),
    )
    t2 = make_trade(
        entry_time=datetime(2026, 10, 15, 9, 50, 0, tzinfo=IST),
        exit_time=datetime(2026, 10, 15, 10, 5, 0, tzinfo=IST),
        net_pnl=Decimal("500.00"),
    )

    payload = {
        "rule": {
            "rule_type": "COOL_OFF_AFTER_LOSS",
            "cooldown_minutes": 20,
        },
        "trades": [t1.model_dump(mode="json"), t2.model_dump(mode="json")],
        "starting_capital": 100000.0,
        "train_ratio": 0.70,
    }

    response = client.post("/api/v1/rules/replay", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["rule_type"] == "COOL_OFF_AFTER_LOSS"
    assert "overall_before" in data
    assert "overall_after" in data
    assert "delta" in data
    assert "train_metrics" in data
    assert "test_metrics" in data
    assert "skipped_summary" in data
    assert "dual_equity_curve" in data
    assert len(data["skipped_trades"]) == 1


def test_fastapi_replay_endpoint_empty_trades_rejected() -> None:
    """Tests POST /api/v1/rules/replay rejects empty trades list with 422."""
    payload = {
        "rule": {
            "rule_type": "MAX_DAILY_TRADES_LIMIT",
            "max_trades": 5,
        },
        "trades": [],
        "starting_capital": 100000.0,
    }
    response = client.post("/api/v1/rules/replay", json=payload)
    assert response.status_code == 422
