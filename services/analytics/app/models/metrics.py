"""TradeLens Performance Metrics and Reporting Models.

Data models representing core trading performance KPIs, expectancy metrics,
drawdown analysis, streak records, equity curve timeseries, and API payloads.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.trade import PairedTrade, TradeSegment

StreakType = Literal["WIN", "LOSS", "NONE"]


class PerformanceSummary(BaseModel):
    """Core financial KPIs and trade outcome distribution."""

    total_trades: int = Field(default=0, ge=0, description="Total number of closed round-trip trades")
    winning_trades: int = Field(default=0, ge=0, description="Number of trades with net_pnl > 0")
    losing_trades: int = Field(default=0, ge=0, description="Number of trades with net_pnl < 0")
    breakeven_trades: int = Field(default=0, ge=0, description="Number of trades with net_pnl == 0")

    win_rate: Decimal = Field(default=Decimal("0.00"), description="Percentage of winning trades (0.00 - 100.00)")
    loss_rate: Decimal = Field(default=Decimal("0.00"), description="Percentage of losing trades (0.00 - 100.00)")
    breakeven_rate: Decimal = Field(default=Decimal("0.00"), description="Percentage of breakeven trades (0.00 - 100.00)")

    total_gross_pnl: Decimal = Field(default=Decimal("0.00"), description="Aggregate gross P&L before charges in INR")
    total_charges: Decimal = Field(default=Decimal("0.00"), description="Aggregate statutory and broker charges in INR")
    total_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Aggregate realized net P&L in INR")


class ExpectancyMetrics(BaseModel):
    """Statistical edge, payout ratios, and trade expectation metrics."""

    average_win: Decimal = Field(default=Decimal("0.00"), description="Average net profit per winning trade in INR")
    average_loss: Decimal = Field(default=Decimal("0.00"), description="Average net loss magnitude per losing trade in INR")
    win_loss_ratio: Decimal | None = Field(default=None, description="Average Win / Average Loss payout ratio (None if zero losses)")
    profit_factor: Decimal | None = Field(default=None, description="Gross Profits / Gross Losses ratio (None if zero losses)")
    is_infinite_profit_factor: bool = Field(default=False, description="True if profitable trades exist with zero losses")

    expectancy_inr: Decimal = Field(default=Decimal("0.00"), description="Expected rupee return per trade: (Total Net PnL / Total Trades)")
    expectancy_ratio: Decimal | None = Field(default=None, description="Expectancy / Average Loss ratio")

    largest_win: Decimal = Field(default=Decimal("0.00"), description="Maximum single trade net profit in INR")
    largest_loss: Decimal = Field(default=Decimal("0.00"), description="Maximum single trade net loss magnitude in INR")


class StreakMetrics(BaseModel):
    """Consecutive run analysis for winning and losing streaks."""

    max_consecutive_wins: int = Field(default=0, ge=0, description="Maximum consecutive winning trades count")
    max_consecutive_losses: int = Field(default=0, ge=0, description="Maximum consecutive losing trades count")
    max_win_streak_pnl: Decimal = Field(default=Decimal("0.00"), description="Net P&L generated during the longest winning streak")
    max_loss_streak_pnl: Decimal = Field(default=Decimal("0.00"), description="Net P&L lost during the longest losing streak")

    current_streak_type: StreakType = Field(default="NONE", description="Active streak classification: WIN, LOSS, or NONE")
    current_streak_count: int = Field(default=0, ge=0, description="Count of trades in active streak")
    current_streak_pnl: Decimal = Field(default=Decimal("0.00"), description="Net P&L accumulated in active streak")


class DrawdownMetrics(BaseModel):
    """Peak-to-trough equity degradation analytics."""

    max_drawdown_inr: Decimal = Field(default=Decimal("0.00"), ge=0, description="Maximum peak-to-trough decline in INR")
    max_drawdown_pct: Decimal | None = Field(default=None, description="Maximum percentage decline from peak equity")

    peak_date: datetime | None = Field(default=None, description="Timestamp of the equity peak prior to max drawdown")
    trough_date: datetime | None = Field(default=None, description="Timestamp of the lowest trough during max drawdown")
    recovery_date: datetime | None = Field(default=None, description="Timestamp when equity surpassed prior peak (None if unrecovered)")
    duration_days: int | None = Field(default=None, ge=0, description="Duration in calendar days from peak to recovery (or current)")

    current_drawdown_inr: Decimal = Field(default=Decimal("0.00"), ge=0, description="Current drawdown from peak in INR")
    current_drawdown_pct: Decimal | None = Field(default=None, description="Current drawdown percentage from peak")
    is_in_drawdown: bool = Field(default=False, description="True if current equity is below all-time peak")


class EquityPoint(BaseModel):
    """Point-in-time trade-by-trade equity snapshot for plotting."""

    timestamp: datetime = Field(..., description="Trade exit timestamp")
    trade_id: UUID = Field(..., description="Unique trade UUID")
    symbol: str = Field(..., description="Canonical trading symbol")
    net_pnl: Decimal = Field(..., description="Net realized P&L of this trade")
    cumulative_pnl: Decimal = Field(..., description="Running total net P&L up to this trade")
    equity: Decimal = Field(..., description="Starting capital + cumulative P&L")
    peak_equity: Decimal = Field(..., description="Highest equity reached up to this point")
    drawdown_inr: Decimal = Field(..., ge=0, description="Drawdown amount below peak in INR")
    drawdown_pct: Decimal | None = Field(default=None, description="Drawdown percentage below peak")


class DailyEquityPoint(BaseModel):
    """Calendar-day aggregated equity summary for daily P&L charts."""

    date: str = Field(..., description="Trading date in YYYY-MM-DD format")
    trades_count: int = Field(..., ge=0, description="Number of trades closed on this calendar day")
    daily_gross_pnl: Decimal = Field(..., description="Gross P&L realized on this day")
    daily_charges: Decimal = Field(..., description="Total charges debited on this day")
    daily_net_pnl: Decimal = Field(..., description="Net P&L realized on this day")
    cumulative_pnl: Decimal = Field(..., description="Cumulative P&L at the end of this day")
    equity: Decimal = Field(..., description="Total equity at the end of this day")
    peak_equity: Decimal = Field(..., description="Peak equity reached up to this day")
    drawdown_inr: Decimal = Field(..., ge=0, description="Drawdown below peak at end of this day")
    drawdown_pct: Decimal | None = Field(default=None, description="Drawdown percentage below peak at end of this day")


class PerformanceReport(BaseModel):
    """Complete institutional performance analytics report."""

    summary: PerformanceSummary = Field(default_factory=PerformanceSummary)
    expectancy: ExpectancyMetrics = Field(default_factory=ExpectancyMetrics)
    streaks: StreakMetrics = Field(default_factory=StreakMetrics)
    drawdown: DrawdownMetrics = Field(default_factory=DrawdownMetrics)
    equity_curve: list[EquityPoint] = Field(default_factory=list)
    daily_equity_curve: list[DailyEquityPoint] = Field(default_factory=list)

    dataset_hash: str = Field(default="", description="Deterministic SHA-256 fingerprint for caching")
    starting_capital: Decimal = Field(default=Decimal("0.00"), description="Starting account equity used for calculations")
    generated_at: datetime = Field(..., description="Timestamp of report generation")


class ComputeMetricsRequest(BaseModel):
    """Payload to request metrics calculation from an in-memory list of trades."""

    trades: list[PairedTrade] = Field(..., description="List of closed PairedTrade instances")
    starting_capital: Decimal = Field(default=Decimal("0.00"), ge=0, description="Initial account equity in INR")
    from_date: date | None = Field(default=None, description="Optional start date filter")
    to_date: date | None = Field(default=None, description="Optional end date filter")
    segments: list[TradeSegment] | None = Field(default=None, description="Optional segment filter")
    symbols: list[str] | None = Field(default=None, description="Optional symbol filter")
