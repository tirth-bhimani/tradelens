"""FastAPI Router for Core Trading Performance Metrics."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.engine.core_metrics import CoreMetricsEngine
from app.models.metrics import ComputeMetricsRequest, PerformanceReport
from app.models.trade import TradeSegment

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])


@router.post(
    "/compute",
    response_model=PerformanceReport,
    status_code=status.HTTP_200_OK,
    summary="Compute trading performance metrics from trade series",
)
def compute_metrics(payload: ComputeMetricsRequest) -> PerformanceReport:
    """Computes comprehensive institutional performance metrics, win rate, expectancy,

    drawdown series, streaks, and equity curve on the provided trades.
    """
    return CoreMetricsEngine.calculate_metrics(
        trades=payload.trades,
        starting_capital=payload.starting_capital,
        from_date=payload.from_date,
        to_date=payload.to_date,
        segments=payload.segments,
        symbols=payload.symbols,
    )


@router.get(
    "/summary",
    response_model=PerformanceReport,
    status_code=status.HTTP_200_OK,
    summary="Get empty or default performance report summary",
)
def get_metrics_summary(
    starting_capital: Annotated[Decimal, Query(ge=0)] = Decimal("0.00"),
    from_date: Annotated[date | None, Query()] = None,
    to_date: Annotated[date | None, Query()] = None,
    segment: Annotated[list[TradeSegment] | None, Query()] = None,
    symbol: Annotated[list[str] | None, Query()] = None,
) -> PerformanceReport:
    """Returns a baseline performance metrics report with active query parameters."""
    return CoreMetricsEngine.calculate_metrics(
        trades=[],
        starting_capital=starting_capital,
        from_date=from_date,
        to_date=to_date,
        segments=segment,
        symbols=symbol,
    )
