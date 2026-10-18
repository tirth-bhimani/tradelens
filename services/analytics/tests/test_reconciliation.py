"""Unit tests for the Broker Statement Reconciliation Engine.

Validates exact portfolio & scrip-level matching, statutory rounding tolerance,
CDSL/NSDL DP charge detection, residual open lot carryover, and missing fill diagnostics.
"""

from datetime import UTC, datetime
from decimal import Decimal

from app.engine.reconciliation import ReconciliationEngine
from app.main import app
from app.models.reconciliation import (
    BrokerStatementSummary,
    BrokerSymbolSummary,
)
from app.models.trade import OpenPosition, PairedTrade
from fastapi.testclient import TestClient


def create_trade(
    symbol: str,
    segment: str,
    quantity: Decimal,
    entry_price: Decimal,
    exit_price: Decimal,
    gross_pnl: Decimal,
    charges: Decimal,
    net_pnl: Decimal,
) -> PairedTrade:
    """Helper to instantiate a PairedTrade for reconciliation tests."""
    return PairedTrade(
        symbol=symbol,
        segment=segment,  # type: ignore[arg-type]
        instrument_type="EQ",
        is_short=False,
        is_intraday=segment == "EQUITY_INTRADAY",
        entry_time=datetime(2024, 10, 15, 10, 0, tzinfo=UTC),
        exit_time=datetime(2024, 10, 15, 11, 0, tzinfo=UTC),
        trade_duration_seconds=3600,
        quantity=quantity,
        entry_price=entry_price,
        exit_price=exit_price,
        gross_pnl=gross_pnl,
        charges=charges,
        net_pnl=net_pnl,
    )


class TestReconciliationEngine:
    """Test suite for ReconciliationEngine."""

    def test_exact_reconciliation_multi_symbol(self) -> None:
        """Scenario 1: All trades match broker statement exactly (delta = ₹0.00)."""
        trade1 = create_trade(
            symbol="RELIANCE",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(10),
            entry_price=Decimal("2500.00"),
            exit_price=Decimal("2550.00"),
            gross_pnl=Decimal("500.00"),
            charges=Decimal("30.00"),
            net_pnl=Decimal("470.00"),
        )
        trade2 = create_trade(
            symbol="INFY",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(20),
            entry_price=Decimal("1500.00"),
            exit_price=Decimal("1480.00"),
            gross_pnl=Decimal("-400.00"),
            charges=Decimal("25.00"),
            net_pnl=Decimal("-425.00"),
        )

        statement = BrokerStatementSummary(
            broker_name="ZERODHA",
            total_gross_pnl=Decimal("100.00"),
            total_charges=Decimal("55.00"),
            total_net_pnl=Decimal("45.00"),
            symbols=[
                BrokerSymbolSummary(
                    symbol="RELIANCE",
                    realized_gross_pnl=Decimal("500.00"),
                    charges=Decimal("30.00"),
                    net_pnl=Decimal("470.00"),
                ),
                BrokerSymbolSummary(
                    symbol="INFY",
                    realized_gross_pnl=Decimal("-400.00"),
                    charges=Decimal("25.00"),
                    net_pnl=Decimal("-425.00"),
                ),
            ],
        )

        report = ReconciliationEngine.reconcile(trades=[trade1, trade2], statement_summary=statement)

        assert report.is_fully_reconciled is True
        assert report.match_percentage == Decimal("100.00")
        assert report.matched_symbols_count == 2
        assert report.discrepancy_symbols_count == 0
        assert report.net_pnl_delta == Decimal("0.00")
        assert all(s.status == "MATCHED" for s in report.symbols)

    def test_rounding_variance_within_tolerance(self) -> None:
        """Scenario 2: Deltas under ₹1.00 are classified as MATCHED with ROUNDING_VARIANCE flag."""
        trade = create_trade(
            symbol="TCS",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(50),
            entry_price=Decimal("3500.00"),
            exit_price=Decimal("3520.00"),
            gross_pnl=Decimal("1000.00"),
            charges=Decimal("45.35"),
            net_pnl=Decimal("954.65"),
        )

        # Broker rounded charges to 45.00, net P&L 955.00 (delta = -0.35)
        statement = BrokerStatementSummary(
            broker_name="GROWW",
            total_gross_pnl=Decimal("1000.00"),
            total_charges=Decimal("45.00"),
            total_net_pnl=Decimal("955.00"),
            symbols=[
                BrokerSymbolSummary(
                    symbol="TCS",
                    realized_gross_pnl=Decimal("1000.00"),
                    charges=Decimal("45.00"),
                    net_pnl=Decimal("955.00"),
                ),
            ],
        )

        report = ReconciliationEngine.reconcile(trades=[trade], statement_summary=statement)

        assert report.is_fully_reconciled is True
        assert report.match_percentage == Decimal("100.00")
        assert report.symbols[0].status == "MATCHED"
        assert "ROUNDING_VARIANCE" in report.symbols[0].discrepancy_reasons

    def test_dp_charges_detection(self) -> None:
        """Scenario 3: Delivery trade where broker includes CDSL DP charge (₹15.93)."""
        trade = create_trade(
            symbol="ITC",
            segment="EQUITY_DELIVERY",
            quantity=Decimal(100),
            entry_price=Decimal("400.00"),
            exit_price=Decimal("450.00"),
            gross_pnl=Decimal("5000.00"),
            charges=Decimal("95.00"),
            net_pnl=Decimal("4905.00"),
        )

        # Broker deducted ₹15.93 DP charge on the delivery sell
        broker_charges = Decimal("95.00") + Decimal("15.93")  # 110.93
        broker_net = Decimal("5000.00") - broker_charges  # 4889.07

        statement = BrokerStatementSummary(
            broker_name="ZERODHA",
            total_gross_pnl=Decimal("5000.00"),
            total_charges=broker_charges,
            total_net_pnl=broker_net,
            symbols=[
                BrokerSymbolSummary(
                    symbol="ITC",
                    realized_gross_pnl=Decimal("5000.00"),
                    charges=broker_charges,
                    net_pnl=broker_net,
                ),
            ],
        )

        report = ReconciliationEngine.reconcile(trades=[trade], statement_summary=statement)

        assert report.is_fully_reconciled is False
        assert report.symbols[0].status == "DISCREPANCY"
        assert "DP_CHARGES_UNACCOUNTED" in report.symbols[0].discrepancy_reasons
        assert "Depository Participant" in report.symbols[0].explanation
        assert any("Depository Participant (DP) charges were detected" in w for w in report.systemic_warnings)

    def test_open_position_residual_detection(self) -> None:
        """Scenario 4: Symbol carries residual open lots affecting statement cutoff."""
        trade = create_trade(
            symbol="TATAMOTORS",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(100),
            entry_price=Decimal("900.00"),
            exit_price=Decimal("920.00"),
            gross_pnl=Decimal("2000.00"),
            charges=Decimal("40.00"),
            net_pnl=Decimal("1960.00"),
        )

        open_pos = OpenPosition(
            symbol="TATAMOTORS",
            side="LONG",
            quantity=Decimal(50),
            average_price=Decimal("915.00"),
            first_fill_time=datetime(2024, 10, 15, 12, 0, tzinfo=UTC),
        )

        # Broker statement shows different realized P&L due to partial settlement cutoff
        statement = BrokerStatementSummary(
            broker_name="UPSTOX",
            total_gross_pnl=Decimal("1000.00"),
            total_charges=Decimal("20.00"),
            total_net_pnl=Decimal("980.00"),
            symbols=[
                BrokerSymbolSummary(
                    symbol="TATAMOTORS",
                    realized_gross_pnl=Decimal("1000.00"),
                    charges=Decimal("20.00"),
                    net_pnl=Decimal("980.00"),
                ),
            ],
        )

        report = ReconciliationEngine.reconcile(
            trades=[trade],
            open_positions=[open_pos],
            statement_summary=statement,
        )

        assert report.symbols[0].status == "DISCREPANCY"
        assert "OPEN_POSITION_RESIDUAL" in report.symbols[0].discrepancy_reasons
        assert report.symbols[0].has_open_positions is True

    def test_missing_fills_both_directions(self) -> None:
        """Scenario 5: Symbols missing in broker vs missing in app."""
        app_only_trade = create_trade(
            symbol="HDFCBANK",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(10),
            entry_price=Decimal("1600.00"),
            exit_price=Decimal("1620.00"),
            gross_pnl=Decimal("200.00"),
            charges=Decimal("20.00"),
            net_pnl=Decimal("180.00"),
        )

        # Statement contains SBIN (which TradeLens doesn't have) and omits HDFCBANK
        statement = BrokerStatementSummary(
            broker_name="ANGELONE",
            total_gross_pnl=Decimal("500.00"),
            total_charges=Decimal("40.00"),
            total_net_pnl=Decimal("460.00"),
            symbols=[
                BrokerSymbolSummary(
                    symbol="SBIN",
                    realized_gross_pnl=Decimal("500.00"),
                    charges=Decimal("40.00"),
                    net_pnl=Decimal("460.00"),
                ),
            ],
        )

        report = ReconciliationEngine.reconcile(trades=[app_only_trade], statement_summary=statement)

        assert report.total_symbols_evaluated == 2
        assert report.discrepancy_symbols_count == 2
        assert report.match_percentage == Decimal("0.00")

        hdfc = next(s for s in report.symbols if s.symbol == "HDFCBANK")
        assert hdfc.status == "MISSING_IN_BROKER"
        assert "MISSING_TRADE_FILLS" in hdfc.discrepancy_reasons

        sbin = next(s for s in report.symbols if s.symbol == "SBIN")
        assert sbin.status == "MISSING_IN_APP"
        assert "MISSING_TRADE_FILLS" in sbin.discrepancy_reasons

    def test_zero_trades_empty_statement(self) -> None:
        """Scenario 6: Empty inputs do not cause ZeroDivisionError."""
        statement = BrokerStatementSummary(
            broker_name="ZERODHA",
            total_gross_pnl=Decimal("0.00"),
            total_charges=Decimal("0.00"),
            total_net_pnl=Decimal("0.00"),
            symbols=[],
        )

        report = ReconciliationEngine.reconcile(trades=[], statement_summary=statement)
        assert report.match_percentage == Decimal("100.00")
        assert report.is_fully_reconciled is True
        assert report.total_symbols_evaluated == 0

    def test_custom_tolerance_threshold(self) -> None:
        """Scenario 7: Configurable tolerance threshold controls matching boundary."""
        trade = create_trade(
            symbol="WIPRO",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(100),
            entry_price=Decimal("500.00"),
            exit_price=Decimal("505.00"),
            gross_pnl=Decimal("500.00"),
            charges=Decimal("40.00"),
            net_pnl=Decimal("460.00"),
        )

        # Delta of ₹2.50
        statement = BrokerStatementSummary(
            broker_name="ZERODHA",
            total_gross_pnl=Decimal("500.00"),
            total_charges=Decimal("42.50"),
            total_net_pnl=Decimal("457.50"),
            symbols=[
                BrokerSymbolSummary(
                    symbol="WIPRO",
                    realized_gross_pnl=Decimal("500.00"),
                    charges=Decimal("42.50"),
                    net_pnl=Decimal("457.50"),
                ),
            ],
        )

        # Default tolerance ₹1.00 -> DISCREPANCY
        strict_report = ReconciliationEngine.reconcile(
            trades=[trade],
            statement_summary=statement,
            tolerance_threshold=Decimal("1.00"),
        )
        assert strict_report.is_fully_reconciled is False
        assert strict_report.symbols[0].status == "DISCREPANCY"

        # Relaxed tolerance ₹3.00 -> MATCHED
        relaxed_report = ReconciliationEngine.reconcile(
            trades=[trade],
            statement_summary=statement,
            tolerance_threshold=Decimal("3.00"),
        )
        assert relaxed_report.is_fully_reconciled is True
        assert relaxed_report.symbols[0].status == "MATCHED"

    def test_reconciliation_api_endpoint(self) -> None:
        """Scenario 8: FastAPI endpoint /api/v1/reconciliation/run executes and returns JSON report."""
        client = TestClient(app)
        trade = create_trade(
            symbol="INFY",
            segment="EQUITY_INTRADAY",
            quantity=Decimal(10),
            entry_price=Decimal("1500.00"),
            exit_price=Decimal("1520.00"),
            gross_pnl=Decimal("200.00"),
            charges=Decimal("20.00"),
            net_pnl=Decimal("180.00"),
        )

        payload = {
            "trades": [trade.model_dump(mode="json")],
            "open_positions": [],
            "statement_summary": {
                "broker_name": "ZERODHA",
                "total_gross_pnl": "200.00",
                "total_charges": "20.00",
                "total_net_pnl": "180.00",
                "symbols": [
                    {
                        "symbol": "INFY",
                        "realized_gross_pnl": "200.00",
                        "charges": "20.00",
                        "net_pnl": "180.00",
                    }
                ],
            },
            "tolerance_threshold": "1.00",
        }

        response = client.post("/api/v1/reconciliation/run", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_fully_reconciled"] is True
        assert data["match_percentage"] == "100.00"
        assert len(data["symbols"]) == 1
        assert data["symbols"][0]["symbol"] == "INFY"
        assert data["symbols"][0]["status"] == "MATCHED"

