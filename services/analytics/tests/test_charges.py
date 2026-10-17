"""Unit tests for StatutoryChargesEngine and Indian market tax calculations.

Validates exact decimal precision, dual-precision statutory rounding (Income Tax Act
s. 288B and Indian Stamp Rules 2019), Zerodha Brokerage Calculator reconciliation,
Budget 2024 date sensitivity, short-selling inversions, and expired option exemptions.
"""

from datetime import UTC, datetime
from decimal import Decimal

from app.engine.charges import StatutoryChargesEngine
from app.models.charges import ChargeRateConfig
from app.models.trade import PairedTrade


def create_sample_trade(
    symbol: str,
    segment: str,
    inst_type: str,
    quantity: Decimal,
    entry_price: Decimal,
    exit_price: Decimal,
    is_short: bool,
    is_intraday: bool,
    entry_time: datetime,
    exit_time: datetime,
) -> PairedTrade:
    """Helper to instantiate a PairedTrade for charges testing."""
    if is_short:
        gross_pnl = (entry_price - exit_price) * quantity
    else:
        gross_pnl = (exit_price - entry_price) * quantity

    duration_seconds = max(0, int((exit_time - entry_time).total_seconds()))
    return PairedTrade(
        symbol=symbol,
        segment=segment,  # type: ignore[arg-type]
        instrument_type=inst_type,  # type: ignore[arg-type]
        is_short=is_short,
        is_intraday=is_intraday,
        entry_time=entry_time,
        exit_time=exit_time,
        trade_duration_seconds=duration_seconds,
        quantity=quantity,
        entry_price=entry_price,
        exit_price=exit_price,
        gross_pnl=gross_pnl,
        charges=Decimal("0.00"),
        net_pnl=gross_pnl,
    )


class TestZerodhaCalculatorReconciliation:
    """Reconciles TradeLens calculations with official Zerodha Brokerage Calculator contract notes."""

    def test_equity_delivery_reconciliation(self) -> None:
        """Scenario 1: Equity Delivery (Buy 100 @ 2000, Sell 100 @ 2100)."""
        trade = create_sample_trade(
            symbol="RELIANCE",
            segment="EQUITY_DELIVERY",
            inst_type="EQ",
            quantity=Decimal(100),
            entry_price=Decimal("2000.00"),
            exit_price=Decimal("2100.00"),
            is_short=False,
            is_intraday=False,
            entry_time=datetime(2024, 10, 10, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 20, 15, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        assert breakdown.total_turnover == Decimal("410000.00")
        assert breakdown.brokerage == Decimal("0.00")  # Free delivery
        assert breakdown.stt == Decimal("410.00")  # 0.1% buy (200) + 0.1% sell (210)
        assert breakdown.exchange_turnover_fee == Decimal("12.18")  # 0.00297% of 410,000
        assert breakdown.sebi_charges == Decimal("0.41")  # ₹10/cr of 410,000
        assert breakdown.gst == Decimal("2.27")  # 18% of (0 + 12.18 + 0.41)
        assert breakdown.stamp_duty == Decimal("30.00")  # 0.015% of 200,000
        assert breakdown.total_charges == Decimal("454.86")

        # Verify net P&L
        assert trade.gross_pnl == Decimal("10000.00")
        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.charges == Decimal("454.86")
        assert enriched.net_pnl == Decimal("9545.14")

    def test_equity_intraday_reconciliation(self) -> None:
        """Scenario 2: Equity Intraday (Buy 400 @ 500, Sell 400 @ 510)."""
        trade = create_sample_trade(
            symbol="TCS",
            segment="EQUITY_INTRADAY",
            inst_type="EQ",
            quantity=Decimal(400),
            entry_price=Decimal("500.00"),
            exit_price=Decimal("510.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 9, 30, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 15, 15, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        assert breakdown.total_turnover == Decimal("404000.00")
        assert breakdown.brokerage == Decimal("40.00")  # ₹20 entry + ₹20 exit
        assert breakdown.stt == Decimal("51.00")  # 0.025% of 204,000 sell turnover
        assert breakdown.exchange_turnover_fee == Decimal("12.00")  # 0.00297% of 404,000
        assert breakdown.sebi_charges == Decimal("0.40")  # ₹10/cr
        assert breakdown.gst == Decimal("9.43")  # 18% of (40 + 12.00 + 0.40)
        assert breakdown.stamp_duty == Decimal("6.00")  # 0.003% of 200,000 buy turnover
        assert breakdown.total_charges == Decimal("118.83")

        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.charges == Decimal("118.83")
        assert enriched.net_pnl == Decimal("3881.17")

    def test_futures_reconciliation_post_budget_2024(self) -> None:
        """Scenario 3: Futures Post-Budget 2024 (Buy 50 @ 25000, Sell 50 @ 25100)."""
        trade = create_sample_trade(
            symbol="NIFTY24OCTFUT",
            segment="FUTURES",
            inst_type="FUT",
            quantity=Decimal(50),
            entry_price=Decimal("25000.00"),
            exit_price=Decimal("25100.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 11, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        assert breakdown.total_turnover == Decimal("2505000.00")
        assert breakdown.brokerage == Decimal("40.00")
        assert breakdown.stt == Decimal("251.00")  # 0.02% of 12,55,000 sell turnover (Budget 2024 rate)
        assert breakdown.exchange_turnover_fee == Decimal("43.34")  # 0.00173% of 25,05,000
        assert breakdown.sebi_charges == Decimal("2.51")
        assert breakdown.gst == Decimal("15.45")  # 18% of (40 + 43.34 + 2.51)
        assert breakdown.stamp_duty == Decimal("25.00")  # 0.002% of 12,50,000 buy turnover
        assert breakdown.total_charges == Decimal("377.30")

        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.charges == Decimal("377.30")
        assert enriched.net_pnl == Decimal("4622.70")

    def test_options_reconciliation_post_budget_2024(self) -> None:
        """Scenario 4: Options Post-Budget 2024 (Buy 50 @ 100, Sell 50 @ 150)."""
        trade = create_sample_trade(
            symbol="NIFTY24OCT25000CE",
            segment="OPTIONS",
            inst_type="CE",
            quantity=Decimal(50),
            entry_price=Decimal("100.00"),
            exit_price=Decimal("150.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 10, 30, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        # Traded premium turnover: 5,000 buy, 7,500 sell -> 12,500 total
        assert breakdown.total_turnover == Decimal("12500.00")
        assert breakdown.brokerage == Decimal("40.00")
        # STT = 0.1% of 7,500 sell premium = 7.50 -> rounded to nearest integer rupee = 8.00 (s. 288B)
        assert breakdown.stt == Decimal("8.00")
        assert breakdown.exchange_turnover_fee == Decimal("4.38")  # 0.03503% of 12,500
        assert breakdown.sebi_charges == Decimal("0.01")  # ₹10/cr
        assert breakdown.gst == Decimal("7.99")  # 18% of (40 + 4.38 + 0.01)
        # Stamp Duty = 0.003% of 5,000 buy premium = 0.15 -> rounded to nearest integer rupee = 0.00
        assert breakdown.stamp_duty == Decimal("0.00")
        assert breakdown.total_charges == Decimal("60.38")

        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.charges == Decimal("60.38")
        assert enriched.net_pnl == Decimal("2439.62")


class TestHistoricalAndRegulatoryEdgeCases:
    """Validates date sensitivity, short sales, expired options, and boundary edge cases."""

    def test_pre_budget_2024_options_stt_difference(self) -> None:
        """Scenario 5: Pre-Oct 2024 Options STT (0.0625%) vs Post-Oct 2024 (0.10%)."""
        # Trade executed in September 2024
        trade_sept = create_sample_trade(
            symbol="NIFTY24SEP25000CE",
            segment="OPTIONS",
            inst_type="CE",
            quantity=Decimal(50),
            entry_price=Decimal("100.00"),
            exit_price=Decimal("150.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 9, 20, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 9, 20, 10, 30, tzinfo=UTC),
        )

        breakdown_sept = StatutoryChargesEngine.calculate_trade_charges(trade_sept)

        # STT pre-Oct 2024 = 0.0625% of 7,500 = 4.6875 -> rounded to nearest integer = 5.00
        assert breakdown_sept.stt == Decimal("5.00")
        assert breakdown_sept.total_charges == Decimal("57.38")

        # Compare with same trade executed in October 2024
        trade_oct = trade_sept.model_copy(
            update={
                "entry_time": datetime(2024, 10, 5, 10, 0, tzinfo=UTC),
                "exit_time": datetime(2024, 10, 5, 10, 30, tzinfo=UTC),
            }
        )
        breakdown_oct = StatutoryChargesEngine.calculate_trade_charges(trade_oct)
        assert breakdown_oct.stt == Decimal("8.00")
        assert breakdown_oct.total_charges == Decimal("60.38")

    def test_short_selling_leg_reversal(self) -> None:
        """Scenario 6: Short-Selling Trade (Sell first, Buy to cover)."""
        trade = create_sample_trade(
            symbol="INFY",
            segment="EQUITY_INTRADAY",
            inst_type="EQ",
            quantity=Decimal(100),
            entry_price=Decimal("1000.00"),  # Sold @ 1000 (entry) -> 1,00,000 turnover
            exit_price=Decimal("950.00"),  # Bought to cover @ 950 (exit) -> 95,000 turnover
            is_short=True,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 14, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        # STT is levied on SELL leg (which is the entry leg for Short)
        # 0.025% of 1,00,000 = 25.00
        assert breakdown.stt == Decimal("25.00")

        # Stamp duty is levied on BUY leg (which is the exit leg for Short)
        # 0.003% of 95,000 = 2.85 -> rounded to nearest integer = 3.00
        assert breakdown.stamp_duty == Decimal("3.00")

        # Gross P&L for short: (1000 - 950) * 100 = +5,000.00
        assert trade.gross_pnl == Decimal("5000.00")
        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.net_pnl == trade.gross_pnl - breakdown.total_charges

    def test_expired_otm_option_zero_exit_brokerage(self) -> None:
        """Scenario 7: Expired OTM Option (Zero exit brokerage exemption)."""
        trade = create_sample_trade(
            symbol="BANKNIFTY24OCT50000CE",
            segment="OPTIONS",
            inst_type="CE",
            quantity=Decimal(50),
            entry_price=Decimal("100.00"),
            exit_price=Decimal("0.00"),  # Expired worthless
            is_short=False,
            is_intraday=False,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 24, 15, 30, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        # Brokerage should be ONLY ₹20 (entry), exit brokerage is 0
        assert breakdown.brokerage == Decimal("20.00")
        assert breakdown.turnover_exit == Decimal("0.00")
        assert breakdown.stt == Decimal("0.00")  # 0 sell turnover
        assert breakdown.exchange_turnover_fee == Decimal("1.75")  # 0.03503% of 5,000
        assert breakdown.sebi_charges == Decimal("0.01")
        assert breakdown.gst == Decimal("3.92")  # 18% of (20 + 1.75 + 0.01)
        assert breakdown.stamp_duty == Decimal("0.00")
        assert breakdown.total_charges == Decimal("25.68")

        assert trade.gross_pnl == Decimal("-5000.00")
        enriched = StatutoryChargesEngine.enrich_trades_with_charges([trade])[0]
        assert enriched.net_pnl == Decimal("-5025.68")

    def test_small_turnover_brokerage_cap(self) -> None:
        """Scenario 8: Small turnover intraday trade applies 0.03% cap correctly."""
        trade = create_sample_trade(
            symbol="PENNYSTOCK",
            segment="EQUITY_INTRADAY",
            inst_type="EQ",
            quantity=Decimal(10),
            entry_price=Decimal("50.00"),  # Turnover 500
            exit_price=Decimal("55.00"),  # Turnover 550
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 11, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)

        # 0.03% of 500 = 0.15; 0.03% of 550 = 0.165 -> 0.17
        # Total brokerage = 0.15 + 0.17 = 0.32 (far below the ₹40 flat maximum)
        assert breakdown.brokerage == Decimal("0.32")

    def test_zero_turnover_defense(self) -> None:
        """Scenario 9: Trade with zero turnover does not trigger ZeroDivisionError."""
        trade = create_sample_trade(
            symbol="DUMMY",
            segment="EQUITY_DELIVERY",
            inst_type="EQ",
            quantity=Decimal(1),
            entry_price=Decimal("0.00"),
            exit_price=Decimal("0.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 11, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)
        assert breakdown.total_turnover == Decimal("0.00")
        assert breakdown.charges_pct_of_turnover == Decimal("0.0000")

    def test_custom_schedule_override(self) -> None:
        """Scenario 10: Custom broker rate schedule overrides default charges."""
        trade = create_sample_trade(
            symbol="RELIANCE",
            segment="EQUITY_DELIVERY",
            inst_type="EQ",
            quantity=Decimal(100),
            entry_price=Decimal("2000.00"),
            exit_price=Decimal("2100.00"),
            is_short=False,
            is_intraday=False,
            entry_time=datetime(2024, 10, 10, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 20, 15, 0, tzinfo=UTC),
        )

        # Custom broker charging flat ₹15 per order on delivery
        custom_cfg = ChargeRateConfig(
            segment="EQUITY_DELIVERY",
            effective_from=datetime(2020, 1, 1).date(),
            effective_to=None,
            brokerage_per_order=Decimal("15.00"),  # ₹15 per side
            brokerage_percent_cap=None,
            stt_rate_buy=Decimal("0.001"),
            stt_rate_sell=Decimal("0.001"),
            exchange_turnover_rate=Decimal("0.0000297"),
            sebi_turnover_rate=Decimal("0.000001"),
            gst_rate=Decimal("0.18"),
            stamp_duty_rate_buy=Decimal("0.00015"),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade, config=custom_cfg)
        assert breakdown.brokerage == Decimal("30.00")  # ₹15 * 2

    def test_delivery_fractional_stt_separate_legs(self) -> None:
        """Scenario 11: Fractional STT on separate delivery contract notes rounds per Section 288B."""
        # Buy: 15 shares @ ₹100 = ₹1,500 turnover -> 0.1% = ₹1.50 -> rounds to ₹2.00
        # Sell: 15 shares @ ₹110 = ₹1,650 turnover -> 0.1% = ₹1.65 -> rounds to ₹2.00
        # Total STT debited across both contract notes = ₹2 + ₹2 = ₹4.00
        trade = create_sample_trade(
            symbol="IOC",
            segment="EQUITY_DELIVERY",
            inst_type="EQ",
            quantity=Decimal(15),
            entry_price=Decimal("100.00"),
            exit_price=Decimal("110.00"),
            is_short=False,
            is_intraday=False,
            entry_time=datetime(2024, 10, 10, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 18, 15, 0, tzinfo=UTC),
        )

        breakdown = StatutoryChargesEngine.calculate_trade_charges(trade)
        assert breakdown.stt == Decimal("4.00")

    def test_enrich_trades_with_sequence_input(self) -> None:
        """Scenario 12: enrich_trades_with_charges accepts arbitrary Sequence (e.g. tuple)."""
        trade = create_sample_trade(
            symbol="INFY",
            segment="EQUITY_INTRADAY",
            inst_type="EQ",
            quantity=Decimal(10),
            entry_price=Decimal("1500.00"),
            exit_price=Decimal("1520.00"),
            is_short=False,
            is_intraday=True,
            entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
            exit_time=datetime(2024, 10, 15, 11, 0, tzinfo=UTC),
        )

        # Pass as a tuple (Sequence[PairedTrade])
        enriched = StatutoryChargesEngine.enrich_trades_with_charges((trade,))
        assert len(enriched) == 1
        assert enriched[0].charges > Decimal("0.00")
        assert enriched[0].net_pnl == enriched[0].gross_pnl - enriched[0].charges
