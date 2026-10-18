"""FastAPI Router for Behavioral Leak Analytics."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.engine.behavior_metrics import BehaviorMetricsEngine
from app.models.behavior import BehavioralLeakReport, ComputeBehaviorRequest

router = APIRouter(prefix="/api/v1/behavior", tags=["behavior"])


@router.post(
    "/compute",
    response_model=BehavioralLeakReport,
    status_code=status.HTTP_200_OK,
    summary="Compute behavioral leaks (re-entry tilt, overtrading, size creep, holding duration)",
)
def compute_behavioral_leaks(payload: ComputeBehaviorRequest) -> BehavioralLeakReport:
    """Detects and isolates the 4 cardinal psychological trading errors:

    Re-entry Tilt, Overtrading Days, Position Size Creep, and the Disposition Effect.
    """
    return BehaviorMetricsEngine.calculate_behavioral_metrics(
        trades=payload.trades,
        overtrading_multiplier=payload.overtrading_multiplier,
        min_overtrading_trades=payload.min_overtrading_trades,
        size_creep_threshold=payload.size_creep_threshold,
    )


@router.get(
    "/summary",
    response_model=BehavioralLeakReport,
    status_code=status.HTTP_200_OK,
    summary="Get empty or default behavioral leak report",
)
def get_behavioral_summary(
    overtrading_multiplier: Annotated[Decimal, Query(ge=1.0)] = Decimal("1.50"),
    min_overtrading_trades: Annotated[int, Query(ge=1)] = 5,
    size_creep_threshold: Annotated[Decimal, Query(ge=1.0)] = Decimal("1.25"),
) -> BehavioralLeakReport:
    """Returns a baseline behavioral report for empty or default trade states."""
    return BehaviorMetricsEngine.calculate_behavioral_metrics(
        trades=[],
        overtrading_multiplier=overtrading_multiplier,
        min_overtrading_trades=min_overtrading_trades,
        size_creep_threshold=size_creep_threshold,
    )
