"""TradeLens AI Behavioral Insights Schemas.

Pydantic v2 schemas for requesting and validating structured AI behavioral insights,
leak explanations, rule guardrail suggestions, and anti-hallucination grounding checks.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class LeakDiagnosis(BaseModel):
    """Structured explanation and numerical evidence for a single behavioral leak."""

    leak_type: str = Field(..., description="Classification of the leak (e.g. RE_ENTRY_TILT, OVERTRADING)")
    severity: Literal["CRITICAL", "HIGH", "MODERATE", "LOW"] = Field(
        ..., description="Assessed impact on trading capital"
    )
    title: str = Field(..., description="Concise plain-English headline of the leak")
    diagnosis: str = Field(..., description="Contextual explanation of why and how this leak damaged P&L")
    evidence: str = Field(..., description="Exact numerical proof cited directly from the trader's statistics")


class SuggestedRuleRecommendation(BaseModel):
    """Specific guardrail rule recommendation from the TradeLens rule catalog."""

    rule_id: str = Field(..., description="Canonical rule catalog identifier")
    rule_name: str = Field(..., description="Trader-friendly rule title")
    rationale: str = Field(..., description="How this rule mechanically stops the diagnosed behavioral leak")
    recommended_parameters: dict[str, Any] = Field(
        default_factory=dict, description="Recommended threshold parameters for backtesting"
    )


class GroundingResult(BaseModel):
    """Result of cross-checking AI output text against actual computed statistics."""

    is_valid: bool = Field(..., description="True if all cited metrics are mathematically grounded within tolerance")
    extracted_numbers: list[float] = Field(
        default_factory=list, description="All numerical claims extracted from AI text"
    )
    matched_numbers: list[float] = Field(
        default_factory=list, description="Extracted numbers that match ground truth stats"
    )
    discrepancies: list[str] = Field(
        default_factory=list, description="List of ungrounded or hallucinated claims flagged"
    )
    rejection_reason: str | None = Field(
        default=None, description="Detailed explanation if report was rejected due to grounding failure"
    )


class InsightReport(BaseModel):
    """Complete structured behavioral audit report produced by the AI pipeline."""

    overall_summary: str = Field(..., description="Comprehensive diagnosis of execution discipline")
    discipline_grade: Literal["A+", "A", "B", "C", "D", "F"] = Field(
        ..., description="Overall qualitative discipline grade"
    )
    discipline_score: int = Field(..., ge=0, le=100, description="Quantitative discipline score from 0 to 100")
    top_leaks: list[LeakDiagnosis] = Field(
        default_factory=list, description="Top behavioral leaks prioritized by severity and P&L impact"
    )
    suggested_rules: list[SuggestedRuleRecommendation] = Field(
        default_factory=list, description="Targeted rule guardrails to backtest against historical trades"
    )
    educational_disclaimer: str = Field(
        default=(
            "DISCLAIMER: This diagnostic audit is strictly educational and behavioral. "
            "TradeLens does not predict market prices, recommend securities, or provide financial advice."
        ),
        description="Mandatory compliance disclaimer",
    )
    provider_used: str = Field(
        default="FREE_DETERMINISTIC",
        description="LLM provider or engine that generated this report (e.g. GEMINI_FLASH, GROQ_LLAMA, FREE_DETERMINISTIC)",
    )
    cached: bool = Field(
        default=False,
        description="True if this report was served directly from the insight cache",
    )
    stats_hash: str | None = Field(
        default=None,
        description="Deterministic SHA-256 fingerprint of the input dataset metrics",
    )
    grounding_verified: bool = Field(
        default=True,
        description="Whether all cited metrics passed anti-hallucination numeric grounding checks",
    )


class InsightRequest(BaseModel):
    """Payload containing pre-computed summary statistics for AI behavioral diagnosis."""

    user_id: str = Field(
        default="anonymous_trader",
        description="User identifier for cache indexing and daily quota enforcement",
    )
    total_trades: int = Field(..., ge=0, description="Total closed round-trip trades count")
    win_rate: float = Field(..., ge=0.0, le=100.0, description="Percentage of winning trades")
    total_net_pnl: float = Field(..., description="Aggregate realized net P&L in INR")
    profit_factor: float | None = Field(default=None, description="Gross profit / Gross loss ratio")
    expectancy_inr: float = Field(default=0.0, description="Average net return per trade in INR")
    max_drawdown_inr: float = Field(default=0.0, ge=0.0, description="Peak-to-trough drawdown in INR")
    max_consecutive_losses: int = Field(default=0, ge=0, description="Maximum losing streak count")
    discipline_score: int = Field(default=100, ge=0, le=100, description="Computed discipline score 0-100")
    identified_leaks: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of detected behavioral leak summaries from Task 12 engine",
    )
