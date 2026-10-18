"""TradeLens AI Behavioral Insights Router.

FastAPI endpoint for requesting structured behavioral insights, leak explanations,
and rule recommendations.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.ai.client import AIClient, get_ai_client
from app.ai.schemas import InsightReport, InsightRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Behavioral Insights"])


@router.post(
    "/insights",
    response_model=InsightReport,
    status_code=status.HTTP_200_OK,
    summary="Generate Structured Behavioral Insights",
    description=(
        "Analyzes pre-computed trading performance and behavioral leak metrics "
        "to deliver structured explanations, risk grades, and targeted rule suggestions."
    ),
)
async def generate_behavioral_insights(
    request: InsightRequest,
    client: Annotated[AIClient, Depends(get_ai_client)],
) -> InsightReport:
    """Generates structured AI insights using configured free LLM or deterministic fallback."""
    return await client.generate_insights(request)
