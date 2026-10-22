"""TradeLens Trading Rules & Translation API Router (Task 20).

FastAPI endpoints for:
- Translating plain-English natural language into validated catalog rules.
- Fetching the complete Rule Catalog manifest and parameters.
- Validating arbitrary rule payloads against Task 19 schemas.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.ai.client import AIClient, get_ai_client
from app.rules.registry import get_catalog_manifest
from app.rules.translator import (
    TranslateRuleRequest,
    TranslateRuleResponse,
    translate_rule_text,
)
from app.rules.replay import ReplayRequest, ReplayResult, execute_rule_replay
from app.rules.validator import ValidationResult, validate_rule
from app.rules.adherence import (
    AdherenceReport,
    SavedRuleDefinition,
    evaluate_rulebook_adherence,
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rules", tags=["Trading Rules & Catalog"])


@router.post(
    "/translate",
    response_model=TranslateRuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate Natural Language to Catalog Rule JSON",
    description=(
        "Translates free-form trader rules into strict, validated TradeLens rule catalog JSON, "
        "handling composite statements and rejecting unsupported indicators or price predictions."
    ),
)
async def translate_rule(
    request: TranslateRuleRequest,
    client: Annotated[AIClient, Depends(get_ai_client)],
) -> TranslateRuleResponse:
    """Translates trader natural language into validated catalog JSON."""
    return await translate_rule_text(
        prompt=request.prompt,
        starting_capital=request.starting_capital,
        ai_client=client,
    )


@router.get(
    "/catalog",
    response_model=list[dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get Rule Catalog Manifest",
    description="Returns the full metadata catalog of all 9 approved V1 rules and parameter definitions.",
)
async def get_rule_catalog() -> list[dict[str, Any]]:
    """Returns the metadata catalog of all 9 approved rules."""
    return get_catalog_manifest()


@router.post(
    "/validate",
    response_model=ValidationResult,
    status_code=status.HTTP_200_OK,
    summary="Validate Raw Rule Payload",
    description="Validates an arbitrary rule JSON payload against strict Task 19 catalog schemas.",
)
async def validate_raw_rule(payload: dict[str, Any]) -> ValidationResult:
    """Validates raw rule payload against Pydantic catalog schemas."""
    return validate_rule(payload)


@router.post(
    "/replay",
    response_model=ReplayResult,
    status_code=status.HTTP_200_OK,
    summary="Simulate Rule Replay on Historical Trades",
    description=(
        "Simulates counter-factual execution of a trading rule against historical trades, "
        "computing before/after performance KPI deltas, dual equity curves, 70/30 train/test splits, "
        "and quantitative overfitting indicators."
    ),
)
async def replay_rule(request: ReplayRequest) -> ReplayResult:
    """Executes deterministic counter-factual backtest of a trading rule."""
    from decimal import Decimal

    return execute_rule_replay(
        trades=request.trades,
        rule=request.rule,
        starting_capital=Decimal(str(request.starting_capital)),
        train_ratio=request.train_ratio,
    )


class AdherenceEvaluationRequest(BaseModel):
    trades: list[dict[str, Any]]
    rules: list[SavedRuleDefinition]


@router.post(
    "/adherence/evaluate",
    response_model=AdherenceReport,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Rulebook Adherence on Imported Trades",
    description="Evaluates a list of trades chronologically against active rulebooks to detect violations and score discipline.",
)
def evaluate_adherence_endpoint(request: AdherenceEvaluationRequest) -> AdherenceReport:
    """Evaluates imported trades against user's active saved rules."""
    return evaluate_rulebook_adherence(
        trades=request.trades,
        rules=request.rules,
    )
