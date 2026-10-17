"""Comprehensive Unit and Scenario Tests for FIFO Trade Fill Pairing Engine (Task 8)."""

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from app.engine.pairing import (
    FifoPairingEngine,
)
from app.models.fills import RawFillCreate


def make_fill(
    symbol: str,
    trade_type: str,
    quantity: float | str | Decimal,
    price: float | str | Decimal,
    fill_time_str: str,
    trade_id: str | None = None,
    order_id: str | None = None,
    user_id=None,
    import_id=None,
) -> RawFillCreate:
    """Helper to construct a validated RawFillCreate for tests."""
    dt = datetime.fromisoformat(fill_time_str)
    return RawFillCreate(
        symbol=symbol,
        trade_date=dt.date(),
        fill_time=dt,
        trade_type=trade_type,  # type: ignore[arg-type]
        quantity=Decimal(str(quantity)),
        price=Decimal(str(price)),
        trade_id=trade_id or f"T_{uuid4().hex[:8]}",
        order_id=order_id or f"ORD_{uuid4().hex[:6]}",
        user_id=user_id,
        import_id=import_id,
        raw_data={"test": True},
    )


class TestSimpleRoundTrips:
    """Verify single 1-to-1 BUY and SELL pairing."""

    def test_single_long_profitable_trade(self) -> None:
        fills = [
            make_fill("RELIANCE", "BUY", 100, "2500.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("RELIANCE", "SELL", 100, "2550.00", "2024-10-15T10:00:00+05:30", trade_id="S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_fills_processed == 2
        assert result.total_trades_created == 1
        assert len(result.open_positions) == 0

        trade = result.trades[0]
        assert trade.symbol == "RELIANCE"
        assert trade.is_short is False
        assert trade.is_intraday is True
        assert trade.quantity == Decimal(100)
        assert trade.entry_price == Decimal("2500.00")
        assert trade.exit_price == Decimal("2550.00")
        assert trade.gross_pnl == Decimal("5000.00")
        assert trade.net_pnl == Decimal("5000.00")
        assert trade.trade_duration_seconds == 1800
        assert trade.duration_seconds == 1800
        assert trade.segment == "EQUITY_INTRADAY"
        assert trade.instrument_type == "EQ"
        assert trade.entry_fill_ids == ["B1"]
        assert trade.exit_fill_ids == ["S1"]

    def test_single_short_profitable_trade(self) -> None:
        fills = [
            make_fill("TCS", "SELL", 50, "4000.00", "2024-10-15T11:00:00+05:30", trade_id="S1"),
            make_fill("TCS", "BUY", 50, "3950.00", "2024-10-15T11:45:00+05:30", trade_id="B1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_short is True
        assert trade.is_intraday is True
        assert trade.quantity == Decimal(50)
        assert trade.entry_price == Decimal("4000.00")
        assert trade.exit_price == Decimal("3950.00")
        assert trade.gross_pnl == Decimal("2500.00")
        assert trade.trade_duration_seconds == 2700

    def test_single_long_losing_trade(self) -> None:
        fills = [
            make_fill("INFY", "BUY", 200, "1500.00", "2024-10-15T13:00:00+05:30"),
            make_fill("INFY", "SELL", 200, "1480.00", "2024-10-15T13:30:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)
        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_short is False
        assert trade.gross_pnl == Decimal("-4000.00")

    def test_single_short_losing_trade(self) -> None:
        fills = [
            make_fill("INFY", "SELL", 100, "1500.00", "2024-10-15T14:00:00+05:30"),
            make_fill("INFY", "BUY", 100, "1520.00", "2024-10-15T14:30:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)
        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_short is True
        assert trade.gross_pnl == Decimal("-2000.00")


class TestPartialScaleOuts:
    """Verify scaling out of positions into multiple discrete FIFO exit trades."""

    def test_partial_exits_fully_closing(self) -> None:
        # Buy 100, Sell 40, Sell 60
        fills = [
            make_fill("HDFCBANK", "BUY", 100, "1600.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("HDFCBANK", "SELL", 40, "1610.00", "2024-10-15T10:00:00+05:30", trade_id="S1"),
            make_fill("HDFCBANK", "SELL", 60, "1620.00", "2024-10-15T10:30:00+05:30", trade_id="S2"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 2
        assert len(result.open_positions) == 0

        t1, t2 = result.trades
        assert t1.quantity == Decimal(40)
        assert t1.entry_price == Decimal("1600.00")
        assert t1.exit_price == Decimal("1610.00")
        assert t1.gross_pnl == Decimal("400.00")
        assert t1.entry_fill_ids == ["B1"]
        assert t1.exit_fill_ids == ["S1"]

        assert t2.quantity == Decimal(60)
        assert t2.entry_price == Decimal("1600.00")
        assert t2.exit_price == Decimal("1620.00")
        assert t2.gross_pnl == Decimal("1200.00")
        assert t2.entry_fill_ids == ["B1"]
        assert t2.exit_fill_ids == ["S2"]

    def test_partial_exit_leaving_open_position(self) -> None:
        # Buy 100, Sell 40 -> 1 closed trade of 40, 60 remains open
        fills = [
            make_fill("HDFCBANK", "BUY", 100, "1600.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("HDFCBANK", "SELL", 40, "1610.00", "2024-10-15T10:00:00+05:30", trade_id="S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        assert len(result.open_positions) == 1

        op = result.open_positions[0]
        assert op.symbol == "HDFCBANK"
        assert op.side == "LONG"
        assert op.quantity == Decimal(60)
        assert op.average_price == Decimal("1600.0000")
        assert op.fill_ids == ["B1"]


class TestMultipleScaleIns:
    """Verify multiple entry fills (scaling in) matched chronologically."""

    def test_scale_in_long_then_single_exit(self) -> None:
        # Buy 50 @ 100, Buy 50 @ 110, Sell 100 @ 120
        # In FIFO lot accounting:
        # Exit consumes 50 from Lot 1 @ 100 -> P&L = (120 - 100) * 50 = +1000
        # Exit consumes 50 from Lot 2 @ 110 -> P&L = (120 - 110) * 50 = +500
        # Total P&L = +1500
        fills = [
            make_fill("WIPRO", "BUY", 50, "100.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("WIPRO", "BUY", 50, "110.00", "2024-10-15T09:45:00+05:30", trade_id="B2"),
            make_fill("WIPRO", "SELL", 100, "120.00", "2024-10-15T10:30:00+05:30", trade_id="S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 2
        assert len(result.open_positions) == 0

        t1, t2 = result.trades
        assert t1.quantity == Decimal(50)
        assert t1.entry_price == Decimal("100.00")
        assert t1.exit_price == Decimal("120.00")
        assert t1.gross_pnl == Decimal("1000.00")

        assert t2.quantity == Decimal(50)
        assert t2.entry_price == Decimal("110.00")
        assert t2.exit_price == Decimal("120.00")
        assert t2.gross_pnl == Decimal("500.00")

        total_pnl = sum((t.gross_pnl for t in result.trades), Decimal(0))
        assert total_pnl == Decimal("1500.00")

    def test_scale_in_short_then_partial_exit(self) -> None:
        # Sell 40 @ 500, Sell 60 @ 520, Buy 70 @ 480
        # FIFO matches:
        # 40 from Lot 1 (500) -> P&L = (500 - 480) * 40 = +800
        # 30 from Lot 2 (520) -> P&L = (520 - 480) * 30 = +1200
        # Remaining in Lot 2: 30 Short @ 520
        fills = [
            make_fill("SBIN", "SELL", 40, "500.00", "2024-10-15T10:00:00+05:30", trade_id="S1"),
            make_fill("SBIN", "SELL", 60, "520.00", "2024-10-15T10:15:00+05:30", trade_id="S2"),
            make_fill("SBIN", "BUY", 70, "480.00", "2024-10-15T11:00:00+05:30", trade_id="B1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 2
        assert len(result.open_positions) == 1

        op = result.open_positions[0]
        assert op.side == "SHORT"
        assert op.quantity == Decimal(30)
        assert op.average_price == Decimal("520.0000")


class TestPositionFlips:
    """Verify position reversals (flips) where an exit fill exceeds open inventory."""

    def test_flip_long_to_short(self) -> None:
        # Hold 50 Long @ 1000, Sell 150 @ 1020
        # -> Closes 50 Long @ +1000 P&L
        # -> Residual 100 Short @ 1020
        fills = [
            make_fill("TITAN", "BUY", 50, "1000.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("TITAN", "SELL", 150, "1020.00", "2024-10-15T10:30:00+05:30", trade_id="S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_short is False
        assert trade.quantity == Decimal(50)
        assert trade.entry_price == Decimal("1000.00")
        assert trade.exit_price == Decimal("1020.00")
        assert trade.gross_pnl == Decimal("1000.00")

        assert len(result.open_positions) == 1
        op = result.open_positions[0]
        assert op.side == "SHORT"
        assert op.quantity == Decimal(100)
        assert op.average_price == Decimal("1020.0000")

    def test_flip_short_to_long(self) -> None:
        # Hold 50 Short @ 200, Buy 80 @ 190
        # -> Closes 50 Short @ (200 - 190) * 50 = +500 P&L
        # -> Residual 30 Long @ 190
        fills = [
            make_fill("ITC", "SELL", 50, "200.00", "2024-10-15T11:00:00+05:30", trade_id="S1"),
            make_fill("ITC", "BUY", 80, "190.00", "2024-10-15T11:45:00+05:30", trade_id="B1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_short is True
        assert trade.quantity == Decimal(50)
        assert trade.gross_pnl == Decimal("500.00")

        assert len(result.open_positions) == 1
        op = result.open_positions[0]
        assert op.side == "LONG"
        assert op.quantity == Decimal(30)
        assert op.average_price == Decimal("190.0000")


class TestPositionalAndSegments:
    """Verify segment derivation, overnight swing holding, and derivatives."""

    def test_overnight_equity_delivery(self) -> None:
        # Buy on 2024-10-01, Sell on 2024-10-05
        fills = [
            make_fill("RELIANCE", "BUY", 100, "2500.00", "2024-10-01T15:00:00+05:30"),
            make_fill("RELIANCE", "SELL", 100, "2600.00", "2024-10-05T10:00:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.is_intraday is False
        assert trade.segment == "EQUITY_DELIVERY"
        assert trade.trade_duration_seconds > 86400

    def test_futures_segment_derivation(self) -> None:
        fills = [
            make_fill("NIFTY24OCTFUT", "BUY", 25, "25000.00", "2024-10-15T09:20:00+05:30"),
            make_fill("NIFTY24OCTFUT", "SELL", 25, "25100.00", "2024-10-15T09:50:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.instrument_type == "FUT"
        assert trade.segment == "FUTURES"
        assert trade.gross_pnl == Decimal("2500.00")

    def test_options_ce_segment_derivation(self) -> None:
        fills = [
            make_fill("NIFTY24OCT25000CE", "BUY", 25, "120.00", "2024-10-15T10:00:00+05:30"),
            make_fill("NIFTY24OCT25000CE", "SELL", 25, "160.00", "2024-10-15T10:45:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.instrument_type == "CE"
        assert trade.segment == "OPTIONS"
        assert trade.gross_pnl == Decimal("1000.00")

    def test_options_pe_short_segment_derivation(self) -> None:
        fills = [
            make_fill("BANKNIFTY24NOV50000PE", "SELL", 15, "350.00", "2024-10-15T13:00:00+05:30"),
            make_fill("BANKNIFTY24NOV50000PE", "BUY", 15, "200.00", "2024-10-15T15:00:00+05:30"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.instrument_type == "PE"
        assert trade.segment == "OPTIONS"
        assert trade.is_short is True
        assert trade.gross_pnl == Decimal("2250.00")


class TestMultiSymbolInterleavedStream:
    """Verify multiple instruments interleaved in a single tradebook."""

    def test_interleaved_symbols(self) -> None:
        fills = [
            make_fill("RELIANCE", "BUY", 100, "2500.00", "2024-10-15T09:15:00+05:30", trade_id="R_B1"),
            make_fill("TCS", "BUY", 50, "4000.00", "2024-10-15T09:20:00+05:30", trade_id="T_B1"),
            make_fill("RELIANCE", "SELL", 100, "2520.00", "2024-10-15T09:30:00+05:30", trade_id="R_S1"),
            make_fill("TCS", "SELL", 50, "4050.00", "2024-10-15T09:40:00+05:30", trade_id="T_S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 2
        symbols = [t.symbol for t in result.trades]
        assert "RELIANCE" in symbols
        assert "TCS" in symbols


class TestEdgeCasesAndSerialization:
    """Verify edge cases, out-of-order sorting, database serialization, and settlement."""

    def test_empty_fills_list(self) -> None:
        result = FifoPairingEngine.pair_fills([])
        assert result.total_fills_processed == 0
        assert result.total_trades_created == 0
        assert result.trades == []
        assert result.open_positions == []

    def test_out_of_order_fills_sorted_automatically(self) -> None:
        # Pass exit fill before entry fill in the list -> engine must sort by timestamp
        fills = [
            make_fill("INFY", "SELL", 100, "1550.00", "2024-10-15T11:00:00+05:30", trade_id="S1"),
            make_fill("INFY", "BUY", 100, "1500.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        assert trade.entry_fill_ids == ["B1"]
        assert trade.exit_fill_ids == ["S1"]
        assert trade.gross_pnl == Decimal("5000.00")

    def test_to_db_record_format(self) -> None:
        fills = [
            make_fill(
                "INFY",
                "BUY",
                100,
                "1500.00",
                "2024-10-15T09:30:00+05:30",
                user_id=uuid4(),
                import_id=uuid4(),
            ),
            make_fill(
                "INFY",
                "SELL",
                100,
                "1550.00",
                "2024-10-15T10:00:00+05:30",
            ),
        ]
        result = FifoPairingEngine.pair_fills(fills)
        trade = result.trades[0]
        db_rec = trade.to_db_record()

        # Assert DB constraints
        assert "entry_fill_ids" not in db_rec
        assert "exit_fill_ids" not in db_rec
        assert isinstance(db_rec["trade_duration_seconds"], int)
        assert isinstance(db_rec["quantity"], float)
        assert isinstance(db_rec["entry_price"], float)
        assert isinstance(db_rec["exit_price"], float)
        assert isinstance(db_rec["gross_pnl"], float)
        assert isinstance(db_rec["charges"], float)
        assert isinstance(db_rec["net_pnl"], float)
        assert db_rec["segment"] in ("EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS")
        assert db_rec["instrument_type"] in ("EQ", "FUT", "CE", "PE")

    def test_settle_expired_contracts(self) -> None:
        user_id = uuid4()
        import_id = uuid4()
        # Buy an option on 2024-10-01 that expired on 2024-10-10
        fills = [
            make_fill(
                "NIFTY24O1025000CE",
                "BUY",
                25,
                "50.00",
                "2024-10-05T09:30:00+05:30",
                trade_id="B1",
                user_id=user_id,
                import_id=import_id,
            ),
        ]
        result = FifoPairingEngine.pair_fills(fills)
        assert len(result.open_positions) == 1
        pos = result.open_positions[0]
        assert pos.is_expired is True
        assert pos.user_id == user_id
        assert pos.import_id == import_id

        # Settle expired options as of 2024-10-11
        settled, remaining = FifoPairingEngine.settle_expired_contracts(
            result.open_positions, as_of_date=date(2024, 10, 11)
        )
        assert len(settled) == 1
        assert len(remaining) == 0

        settled_trade = settled[0]
        assert settled_trade.user_id == user_id
        assert settled_trade.import_id == import_id
        assert settled_trade.exit_price == Decimal("0.00")
        assert settled_trade.gross_pnl == Decimal("-1250.00")  # (0 - 50) * 25
        assert "EXPIRED_UNEXERCISED" in settled_trade.tags

    def test_cross_notation_contract_key_pairing(self) -> None:
        """Verify broker exchange prefix and series variations pair through canonical contract key."""
        fills = [
            make_fill("NSE:RELIANCE", "BUY", 100, "2500.00", "2024-10-15T09:30:00+05:30", trade_id="B1"),
            make_fill("RELIANCE-EQ", "SELL", 100, "2550.00", "2024-10-15T10:00:00+05:30", trade_id="S1"),
        ]
        result = FifoPairingEngine.pair_fills(fills)

        assert result.total_trades_created == 1
        trade = result.trades[0]
        # Canonical symbol is clean RELIANCE
        assert trade.symbol == "RELIANCE"
        assert trade.quantity == Decimal(100)
        assert trade.gross_pnl == Decimal("5000.00")
        assert len(result.open_positions) == 0
