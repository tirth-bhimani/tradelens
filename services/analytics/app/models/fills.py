"""TradeLens Ingestion Fill Models and Parse Contracts."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

TradeType = Literal["BUY", "SELL"]


class RawFillCreate(BaseModel):
    """Pydantic model representing an individual executed trade fill."""

    import_id: Optional[UUID] = Field(None, description="Associated imports table record ID")
    user_id: Optional[UUID] = Field(None, description="Authenticated trader UUID")
    symbol: str = Field(..., description="Clean trading symbol, e.g. RELIANCE, NIFTY24OCT25000CE")
    trade_date: date = Field(..., description="Trade date in YYYY-MM-DD")
    fill_time: datetime = Field(..., description="Timestamp of execution with IST (+05:30) timezone")
    trade_type: TradeType = Field(..., description="Normalized BUY or SELL")
    quantity: Decimal = Field(..., gt=0, description="Positive execution volume or lot size")
    price: Decimal = Field(..., gt=0, description="Executed trade price per unit")
    order_id: Optional[str] = Field(None, description="Broker order ID")
    trade_id: str = Field(..., description="Unique trade execution ID or deterministic hash")
    raw_data: dict[str, Any] = Field(default_factory=dict, description="Original row audit payload")

    @field_validator("trade_type", mode="before")
    @classmethod
    def normalize_trade_type(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ("BUY", "B"):
                return "BUY"
            if clean in ("SELL", "S"):
                return "SELL"
        raise ValueError(f"Invalid trade type: {v}")


class CustomColumnMapping(BaseModel):
    """User-defined mapping from custom CSV header names to standard fields."""

    symbol: str = Field(..., description="Column name for trading symbol")
    trade_date: str = Field(..., description="Column name for trade execution date")
    trade_type: str = Field(..., description="Column name for transaction type (Buy/Sell)")
    quantity: str = Field(..., description="Column name for trade quantity/volume")
    price: str = Field(..., description="Column name for execution price")
    fill_time: Optional[str] = Field(None, description="Column name for execution timestamp")
    trade_id: Optional[str] = Field(None, description="Column name for trade ID")
    order_id: Optional[str] = Field(None, description="Column name for order ID")


class ParseResult(BaseModel):
    """Aggregate result from a tradebook parsing batch."""

    broker: str = Field(..., description="Detected broker, e.g. ZERODHA or CUSTOM")
    total_rows: int = Field(..., description="Total CSV data rows evaluated")
    imported_rows: int = Field(..., description="Successfully parsed fill records")
    skipped_rows: int = Field(..., description="Count of skipped or corrupt rows")
    fills: list[RawFillCreate] = Field(default_factory=list, description="Extracted fill models")
    error_report: list[dict[str, Any]] = Field(default_factory=list, description="Line-by-line error details")


class ParseCsvRequest(BaseModel):
    """API payload for the CSV parsing endpoint."""

    file_name: str
    content: str
    custom_mapping: Optional[CustomColumnMapping] = None
    import_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
