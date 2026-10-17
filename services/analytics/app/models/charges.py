"""TradeLens Statutory Charges Data Models and Schema Contracts.

Pydantic models representing Indian regulatory fee structures, configurable tariff
schedules, and itemized trade charges breakdowns matching the Supabase `charge_rates`
database schema.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.trade import TradeSegment


class ChargeRateConfig(BaseModel):
    """Statutory fee and tax rates for a specific trading segment and date window.

    Matches 1:1 with the Supabase `charge_rates` database table schema.
    Supports historical rate tracking via `effective_from` and `effective_to`.
    """

    id: UUID = Field(default_factory=uuid4, description="Unique configuration rate UUID")
    segment: TradeSegment = Field(..., description="Segment classification: EQUITY_DELIVERY, EQUITY_INTRADAY, FUTURES, OPTIONS")
    effective_from: date = Field(..., description="Start date of tariff applicability (inclusive)")
    effective_to: date | None = Field(default=None, description="End date of applicability (inclusive), or None if currently active")
    created_at: datetime | None = Field(default=None, description="Timestamp configuration was inserted")

    # Rates & Fees
    brokerage_per_order: Decimal = Field(
        default=Decimal("20.00"),
        description="Flat fee per executed order side (₹0 for discount equity delivery)",
    )
    brokerage_percent_cap: Decimal | None = Field(
        default=Decimal("0.0003"),
        description="Max 0.03% cap for EQUITY_INTRADAY and FUTURES; None for OPTIONS and EQUITY_DELIVERY",
    )
    stt_rate_buy: Decimal = Field(
        default=Decimal("0.000000"),
        description="STT rate applied on buy turnover (0.001 for delivery, 0 for others)",
    )
    stt_rate_sell: Decimal = Field(
        default=Decimal("0.000000"),
        description="STT rate applied on sell turnover (0.001 delivery, 0.00025 intraday, 0.0002 futures, 0.001 options)",
    )
    exchange_turnover_rate: Decimal = Field(
        ...,
        description="Stock exchange transaction fee rate (e.g. 0.0000297 for NSE cash, 0.0003503 for options premium)",
    )
    sebi_turnover_rate: Decimal = Field(
        default=Decimal("0.000001"),
        description="SEBI regulatory fee rate (₹10 per crore = 0.000001)",
    )
    gst_rate: Decimal = Field(
        default=Decimal("0.1800"),
        description="Goods & Services Tax rate (18% on brokerage + exchange + sebi fees)",
    )
    stamp_duty_rate_buy: Decimal = Field(
        ...,
        description="Indian Stamp Act unified rate on buy turnover only",
    )


class ChargesBreakdown(BaseModel):
    """Itemized breakdown of all regulatory, statutory, and broker fees incurred on a trade."""

    brokerage: Decimal = Field(..., description="Broker commission (entry + exit; ₹0 exit on expired options)")
    stt: Decimal = Field(..., description="Securities Transaction Tax (rounded to nearest integer rupee)")
    exchange_turnover_fee: Decimal = Field(..., description="Stock exchange infrastructure charges (2 decimals)")
    sebi_charges: Decimal = Field(..., description="SEBI regulatory fee (2 decimals)")
    gst: Decimal = Field(..., description="Goods & Services Tax (18% on brokerage + exchange + SEBI fees)")
    stamp_duty: Decimal = Field(..., description="Indian Stamp Duty on buy side (rounded to nearest integer rupee)")
    total_charges: Decimal = Field(..., description="Sum of all statutory and broker charges")

    # Analytics metrics
    turnover_entry: Decimal = Field(..., description="Gross turnover on entry execution")
    turnover_exit: Decimal = Field(..., description="Gross turnover on exit execution")
    total_turnover: Decimal = Field(..., description="turnover_entry + turnover_exit")
    charges_pct_of_turnover: Decimal = Field(
        default=Decimal("0.00"),
        description="Total charges as percentage of total turnover (0.00 if turnover is 0)",
    )
