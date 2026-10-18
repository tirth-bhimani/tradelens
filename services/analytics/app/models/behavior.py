"""TradeLens Behavioral Leak Analytics Models.

Pydantic models representing detection and financial quantification of the
4 cardinal behavioral leaks: Re-entry Tilt, Overtrading, Size Creep, and Holding Losers.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.models.trade import PairedTrade

LeakType = Literal["REENTRY_TILT", "OVERTRADING", "SIZE_CREEP", "DISPOSITION_EFFECT", "NONE"]


class ReentryBucket(BaseModel):
    """Metrics for trades entered within a specific post-loss time window."""

    window_minutes: int = Field(..., description="Post-loss time window in minutes (e.g. 5, 15, 30, 60)")
    trades_count: int = Field(default=0, ge=0, description="Number of trades entered within this window following a loss")
    pct_of_all_trades: Decimal = Field(default=Decimal("0.00"), description="Percentage of total portfolio trades in this bucket")
    winning_trades: int = Field(default=0, ge=0, description="Winning trades count in this bucket")
    losing_trades: int = Field(default=0, ge=0, description="Losing trades count in this bucket")
    win_rate: Decimal = Field(default=Decimal("0.00"), description="Win rate percentage within this tilt window")
    total_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Total net P&L realized from trades in this window in INR")
    average_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Average return per trade in this window in INR")
    same_symbol_count: int = Field(default=0, ge=0, description="Count of revenge trades in the same symbol as preceding loss")
    cross_symbol_count: int = Field(default=0, ge=0, description="Count of revenge trades in different symbols")


class ReentryMetrics(BaseModel):
    """Aggregate statistics for hasty re-entries immediately following a losing trade."""

    total_reentry_trades: int = Field(default=0, ge=0, description="Total trades entered within <= 60 mins of a loss")
    pct_of_all_trades: Decimal = Field(default=Decimal("0.00"), description="Percentage of all trades executed on tilt")
    total_reentry_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Total net rupee P&L from all post-loss re-entries")
    buckets: list[ReentryBucket] = Field(default_factory=list, description="Breakdown across 5m, 15m, 30m, and 60m windows")


class OvertradingDay(BaseModel):
    """Single calendar day performance record with overtrading classification."""

    date: str = Field(..., description="Trading date in YYYY-MM-DD format")
    trades_count: int = Field(..., ge=0, description="Number of trades closed on this day")
    gross_pnl: Decimal = Field(..., description="Gross P&L in INR")
    charges: Decimal = Field(..., description="Statutory charges in INR")
    net_pnl: Decimal = Field(..., description="Net P&L in INR")
    win_rate: Decimal = Field(..., description="Win rate percentage on this day")
    is_overtrading: bool = Field(..., description="True if trades exceed overtrading threshold")
    volume_multiplier: Decimal = Field(default=Decimal("1.00"), description="Multiplier relative to median daily volume")


class OvertradingMetrics(BaseModel):
    """Volume fatigue analysis comparing normal disciplined days against overtrading days."""

    baseline_median_trades: Decimal = Field(default=Decimal("0.00"), description="Median daily trades across all active days")
    threshold_multiplier: Decimal = Field(default=Decimal("1.50"), description="Multiplier threshold used for flagging (e.g. 1.5x)")
    min_trades_threshold: int = Field(default=5, ge=1, description="Absolute minimum trade count required to flag overtrading")

    overtrading_days_count: int = Field(default=0, ge=0, description="Number of days flagged as overtrading")
    total_active_days: int = Field(default=0, ge=0, description="Total active calendar trading days")
    pct_overtrading_days: Decimal = Field(default=Decimal("0.00"), description="Percentage of active days that were overtraded")

    overtrading_trades_count: int = Field(default=0, ge=0, description="Total trades taken on overtrading days")
    overtrading_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Total net P&L realized on overtrading days in INR")
    overtrading_win_rate: Decimal = Field(default=Decimal("0.00"), description="Win rate on overtrading days")

    normal_days_count: int = Field(default=0, ge=0, description="Number of disciplined trading days")
    normal_days_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Total net P&L realized on disciplined days in INR")
    normal_days_win_rate: Decimal = Field(default=Decimal("0.00"), description="Win rate on disciplined days")

    days: list[OvertradingDay] = Field(default_factory=list, description="Chronological calendar day breakdown")


class SizeCreepMetrics(BaseModel):
    """Position sizing discipline analysis detecting lot/quantity spikes following a loss."""

    baseline_median_quantity: Decimal = Field(default=Decimal("0.00"), description="Median trade quantity across portfolio")
    post_loss_trades_count: int = Field(default=0, ge=0, description="Total trades executed immediately following a loss")
    size_creep_trades_count: int = Field(default=0, ge=0, description="Trades with lot size > 1.25x previous loss or > 1.5x median")
    pct_of_post_loss_trades: Decimal = Field(default=Decimal("0.00"), description="Percentage of post-loss trades with size creep")
    size_creep_net_pnl: Decimal = Field(default=Decimal("0.00"), description="Total net P&L realized from oversized revenge trades in INR")
    size_creep_win_rate: Decimal = Field(default=Decimal("0.00"), description="Win rate of oversized revenge trades")
    max_size_multiplier: Decimal = Field(default=Decimal("1.00"), description="Highest volume multiplier observed following a loss")


class HoldingTimeMetrics(BaseModel):
    """Holding duration asymmetry analysis detecting the disposition effect."""

    winners_count: int = Field(default=0, ge=0, description="Count of profitable trades analyzed")
    losers_count: int = Field(default=0, ge=0, description="Count of losing trades analyzed")

    avg_winner_duration_seconds: int = Field(default=0, ge=0, description="Average duration of winning trades in seconds")
    avg_loser_duration_seconds: int = Field(default=0, ge=0, description="Average duration of losing trades in seconds")
    median_winner_duration_seconds: int = Field(default=0, ge=0, description="Median duration of winning trades in seconds")
    median_loser_duration_seconds: int = Field(default=0, ge=0, description="Median duration of losing trades in seconds")

    avg_winner_duration_display: str = Field(default="0s", description="Human-readable duration for winners (e.g. 4m 12s)")
    avg_loser_duration_display: str = Field(default="0s", description="Human-readable duration for losers (e.g. 15m 30s)")

    holding_duration_ratio: Decimal | None = Field(default=None, description="Average Loser Duration / Average Winner Duration")
    is_disposition_effect_detected: bool = Field(default=False, description="True if losing trades are held longer than winning trades")


class TopLeakFinding(BaseModel):
    """Primary behavioral leakage source ranked by absolute rupee damage."""

    leak_type: LeakType = Field(default="NONE", description="Classification of the most damaging leak")
    title: str = Field(default="No Significant Leaks Detected", description="Editorial headline")
    financial_impact_inr: Decimal = Field(default=Decimal("0.00"), description="Rupee loss attributable to this leak")
    description: str = Field(default="Execution discipline is sound with no systemic leaks.", description="Plain-English explanation")


class BehavioralLeakReport(BaseModel):
    """Comprehensive behavioral audit report containing all 4 leak analyses."""

    discipline_score: int = Field(default=100, ge=0, le=100, description="Composite discipline score (0-100, where 100 is flawless)")
    top_leak: TopLeakFinding = Field(default_factory=TopLeakFinding)
    reentry: ReentryMetrics = Field(default_factory=ReentryMetrics)
    overtrading: OvertradingMetrics = Field(default_factory=OvertradingMetrics)
    size_creep: SizeCreepMetrics = Field(default_factory=SizeCreepMetrics)
    holding_time: HoldingTimeMetrics = Field(default_factory=HoldingTimeMetrics)
    generated_at: datetime = Field(..., description="Timestamp of report generation")


class ComputeBehaviorRequest(BaseModel):
    """Payload to request behavioral leak analysis from a list of trades."""

    trades: list[PairedTrade] = Field(..., description="List of closed PairedTrade instances")
    overtrading_multiplier: Decimal = Field(default=Decimal("1.50"), ge=Decimal("1.0"), description="Multiplier threshold for overtrading")
    min_overtrading_trades: int = Field(default=5, ge=1, description="Minimum trades per day to trigger overtrading flag")
    size_creep_threshold: Decimal = Field(default=Decimal("1.25"), ge=Decimal("1.0"), description="Multiplier threshold for size creep")
