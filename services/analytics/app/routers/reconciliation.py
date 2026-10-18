"""FastAPI Router for Broker Statement Reconciliation."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.engine.reconciliation import ReconciliationEngine
from app.models.reconciliation import (
    ReconciliationReport,
    ReconciliationRequest,
)

router = APIRouter(prefix="/api/v1/reconciliation", tags=["reconciliation"])


@router.post(
    "/run",
    response_model=ReconciliationReport,
    status_code=status.HTTP_200_OK,
    summary="Reconcile TradeLens paired trades against broker statement totals",
)
def run_reconciliation(payload: ReconciliationRequest) -> ReconciliationReport:
    """Computes two-level reconciliation and root-cause diagnostics between TradeLens trades

    and official broker statement summaries.
    """
    return ReconciliationEngine.reconcile(
        trades=payload.trades,
        open_positions=payload.open_positions,
        statement_summary=payload.statement_summary,
        tolerance_threshold=payload.tolerance_threshold,
    )
