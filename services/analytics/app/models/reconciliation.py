"""TradeLens Broker Statement Reconciliation Models and Contracts.

Pydantic models representing broker-issued tax statement summaries, scrip-level
P&L line items, diagnostic classification tags, and full reconciliation audit reports.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.trade import OpenPosition, PairedTrade

ReconciliationStatus = Literal["MATCHED", "DISCREPANCY", "MISSING_IN_APP", "MISSING_IN_BROKER"]

DiscrepancyReason = Literal[
    "DP_CHARGES_UNACCOUNTED",
    "OPEN_POSITION_RESIDUAL",
    "MISSING_TRADE_FILLS",
    "CORPORATE_ACTION_UNADJUSTED",
    "STAMP_DUTY_STATE_VARIATION",
    "ROUNDING_VARIANCE",
    "UNCLASSIFIED_DELTA",
]


class BrokerSymbolSummary(BaseModel):
    """Realized financials reported by broker for a single instrument."""

    symbol: str = Field(..., description="Canonical trading symbol (e.g. RELIANCE, NIFTY24OCT25000CE)")
    realized_gross_pnl: Decimal = Field(..., description="Broker-reported gross profit or loss")
    charges: Decimal = Field(default=Decimal("0.00"), description="Broker itemized charges if available on statement")
    net_pnl: Decimal = Field(..., description="Broker-reported net profit or loss")
    total_quantity: Decimal | None = Field(default=None, description="Executed volume if reported on statement")


class BrokerStatementSummary(BaseModel):
    """Aggregate numbers reported on an official broker statement or Tax P&L export."""

    broker_name: str = Field(default="ZERODHA", description="Broker source (ZERODHA, GROWW, ANGELONE, UPSTOX, etc.)")
    statement_period_start: str | None = Field(default=None, description="Start date (YYYY-MM-DD)")
    statement_period_end: str | None = Field(default=None, description="End date (YYYY-MM-DD)")
    total_gross_pnl: Decimal = Field(..., description="Total realized gross P&L on statement")
    total_charges: Decimal = Field(..., description="Total deductions/statutory charges on statement")
    total_net_pnl: Decimal = Field(..., description="Total net realized P&L on statement")
    symbols: list[BrokerSymbolSummary] = Field(
        default_factory=list,
        description="Per-symbol breakdowns reported by the broker",
    )


class SymbolReconciliation(BaseModel):
    """Comparative line-item for a single trading symbol between TradeLens and Broker."""

    symbol: str = Field(..., description="Canonical trading symbol")
    status: ReconciliationStatus = Field(..., description="MATCHED, DISCREPANCY, MISSING_IN_APP, MISSING_IN_BROKER")
    app_gross_pnl: Decimal = Field(default=Decimal("0.00"), description="TradeLens computed gross P&L")
    broker_gross_pnl: Decimal = Field(default=Decimal("0.00"), description="Broker-reported gross P&L")
    gross_delta: Decimal = Field(default=Decimal("0.00"), description="app_gross_pnl - broker_gross_pnl")
    app_charges: Decimal = Field(default=Decimal("0.00"), description="TradeLens computed charges")
    broker_charges: Decimal = Field(default=Decimal("0.00"), description="Broker-reported charges")
    charges_delta: Decimal = Field(default=Decimal("0.00"), description="app_charges - broker_charges")
    app_net_pnl: Decimal = Field(default=Decimal("0.00"), description="TradeLens computed net P&L")
    broker_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Broker-reported net P&L")
    net_delta: Decimal = Field(default=Decimal("0.00"), description="app_net_pnl - broker_net_pnl")
    paired_trades_count: int = Field(default=0, description="Number of closed paired trades in TradeLens")
    has_open_positions: bool = Field(default=False, description="True if residual open positions exist for this symbol")
    discrepancy_reasons: list[DiscrepancyReason] = Field(
        default_factory=list,
        description="Diagnosed root causes for discrepancies",
    )
    explanation: str | None = Field(default=None, description="Human-readable diagnostic explanation of any delta")


class ReconciliationReport(BaseModel):
    """Complete portfolio reconciliation audit output."""

    report_id: UUID = Field(default_factory=uuid4, description="Unique reconciliation audit UUID")
    broker_name: str = Field(default="ZERODHA", description="Broker statement source")
    tolerance_threshold: Decimal = Field(
        default=Decimal("1.00"),
        description="Allowed threshold in INR for matching (default ₹1.00)",
    )
    total_symbols_evaluated: int = Field(..., description="Total unique symbols evaluated")
    matched_symbols_count: int = Field(..., description="Count of symbols within tolerance")
    discrepancy_symbols_count: int = Field(..., description="Count of symbols exceeding tolerance")
    match_percentage: Decimal = Field(..., description="Percentage of symbols cleanly matched (0.00 - 100.00)")

    # Aggregate Portfolio Financials
    app_total_gross_pnl: Decimal = Field(..., description="TradeLens aggregate gross P&L")
    broker_total_gross_pnl: Decimal = Field(..., description="Broker statement total gross P&L")
    gross_pnl_delta: Decimal = Field(..., description="app_total_gross_pnl - broker_total_gross_pnl")

    app_total_charges: Decimal = Field(..., description="TradeLens aggregate charges")
    broker_total_charges: Decimal = Field(..., description="Broker statement total charges")
    charges_delta: Decimal = Field(..., description="app_total_charges - broker_total_charges")

    app_total_net_pnl: Decimal = Field(..., description="TradeLens aggregate net P&L")
    broker_total_net_pnl: Decimal = Field(..., description="Broker statement total net P&L")
    net_pnl_delta: Decimal = Field(..., description="app_total_net_pnl - broker_total_net_pnl")

    is_fully_reconciled: bool = Field(..., description="True if portfolio net P&L and all symbols are within tolerance")
    symbols: list[SymbolReconciliation] = Field(default_factory=list, description="Per-symbol comparative breakdown")
    systemic_warnings: list[str] = Field(
        default_factory=list,
        description="Portfolio-wide anomalies, e.g. unrecorded DP charges or open lot carryover",
    )


class ReconciliationRequest(BaseModel):
    """Payload for the FastAPI reconciliation endpoint."""

    trades: list[PairedTrade] = Field(..., description="List of closed PairedTrade instances")
    open_positions: list[OpenPosition] = Field(default_factory=list, description="Residual open positions")
    statement_summary: BrokerStatementSummary = Field(..., description="Broker reported statement summary")
    tolerance_threshold: Decimal = Field(default=Decimal("1.00"), description="Allowed matching tolerance (default ₹1.00)")
