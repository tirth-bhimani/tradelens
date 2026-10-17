"""TradeLens Paired Trade and Open Position Models.

Data models representing closed round-trip trades and residual open positions
resulting from FIFO fill matching.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

TradeSegment = Literal["EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS"]
TradeInstrumentType = Literal["EQ", "FUT", "CE", "PE"]
PositionSide = Literal["LONG", "SHORT"]


class PairedTrade(BaseModel):
    """Represents a closed round-trip trade matched via FIFO lot accounting.

    Matches 1:1 with the Supabase `trades` database table schema.
    """

    id: UUID = Field(default_factory=uuid4, description="Unique trade UUID")
    user_id: UUID | None = Field(default=None, description="Trader UUID")
    import_id: UUID | None = Field(default=None, description="Batch import UUID")
    symbol: str = Field(..., description="Canonical trading symbol, e.g. RELIANCE, NIFTY24OCT25000CE")
    segment: TradeSegment = Field(..., description="Tax & brokerage segment classification")
    instrument_type: TradeInstrumentType = Field(..., description="PostgreSQL check-constrained instrument classification")

    # Direction & Timing
    is_short: bool = Field(..., description="True if opened by SELL (short), False if opened by BUY (long)")
    is_intraday: bool = Field(..., description="True if entry and exit occurred on same calendar day")
    entry_time: datetime = Field(..., description="Timestamp of the matched entry fill")
    exit_time: datetime = Field(..., description="Timestamp of the closing exit fill")
    trade_duration_seconds: int = Field(..., ge=0, description="Holding duration in seconds (matches DB column)")

    # Volumes & Pricing
    quantity: Decimal = Field(..., gt=0, description="Matched execution volume (shares or contracts)")
    entry_price: Decimal = Field(..., ge=0, description="Volume-weighted average entry price")
    exit_price: Decimal = Field(..., ge=0, description="Volume-weighted average exit price (0 for expired OTM options)")

    # Financials
    gross_pnl: Decimal = Field(
        ...,
        description="P&L before statutory charges: (exit-entry)*qty for Long, (entry-exit)*qty for Short",
    )
    charges: Decimal = Field(
        default=Decimal("0.00"),
        description="Total regulatory and broker charges (calculated in Task 9)",
    )
    net_pnl: Decimal = Field(..., description="gross_pnl minus charges")

    # Audit & Lineage (Transient in Python, excluded when inserting into DB)
    entry_fill_ids: list[str] = Field(default_factory=list, description="IDs of RawFill records contributing to entry")
    exit_fill_ids: list[str] = Field(default_factory=list, description="IDs of RawFill records contributing to exit")
    tags: list[str] = Field(default_factory=list, description="Behavioral or user tags, e.g. FOMO, REVENGE")
    notes: str | None = Field(default=None, description="Optional trader journal annotations")

    @property
    def duration_seconds(self) -> int:
        """Alias for trade_duration_seconds for analytics convenience."""
        return self.trade_duration_seconds

    def to_db_record(self) -> dict[str, Any]:
        """Serializes trade model into Supabase `trades` table format, excluding transient lineage."""
        data = self.model_dump(exclude={"entry_fill_ids", "exit_fill_ids"})
        data["id"] = str(data["id"])
        if data.get("user_id"):
            data["user_id"] = str(data["user_id"])
        if data.get("import_id"):
            data["import_id"] = str(data["import_id"])
        data["entry_time"] = self.entry_time.isoformat()
        data["exit_time"] = self.exit_time.isoformat()
        for k in ("quantity", "entry_price", "exit_price", "gross_pnl", "charges", "net_pnl"):
            data[k] = float(data[k])
        return data


class OpenPosition(BaseModel):
    """Represents unmatched, open residual inventory remaining at the end of the batch."""

    symbol: str = Field(..., description="Canonical trading symbol")
    side: PositionSide = Field(..., description="LONG or SHORT open position")
    quantity: Decimal = Field(..., gt=0, description="Remaining unmatched quantity")
    average_price: Decimal = Field(..., gt=0, description="Volume-weighted average open price")
    first_fill_time: datetime = Field(..., description="Timestamp of oldest open fill in lot queue")
    fill_ids: list[str] = Field(default_factory=list, description="Underlying fill IDs making up this open lot")
    is_expired: bool = Field(default=False, description="True if contract has passed its expiry date")
    user_id: UUID | None = Field(default=None, description="Trader UUID")
    import_id: UUID | None = Field(default=None, description="Batch import UUID")


class PairingResult(BaseModel):
    """Batch result emitted by the FIFO pairing engine."""

    total_fills_processed: int = Field(..., ge=0)
    total_trades_created: int = Field(..., ge=0)
    trades: list[PairedTrade] = Field(default_factory=list)
    open_positions: list[OpenPosition] = Field(default_factory=list)
    unmatched_symbols: list[str] = Field(default_factory=list)
