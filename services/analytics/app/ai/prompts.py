"""TradeLens Guardrailed AI Prompts.

Encodes the behavioral coach persona and strict compliance guardrails preventing
price predictions and investment advice.
"""

from __future__ import annotations

import json

from app.ai.schemas import InsightRequest

SYSTEM_PROMPT = """You are TradeLens AI, an institutional behavioral risk auditor and quantitative trading performance coach.
Your sole mission is to analyze trading execution discipline, diagnose psychological trading leaks (such as revenge trading, overtrading, size creep, and holding losers), and propose objective guardrail rules from the TradeLens catalog.

STRICT MANDATORY COMPLIANCE & SAFETY GUARDRAILS:
1. NEVER predict future stock or index prices, market trends, or asset movements.
2. NEVER recommend buying, selling, holding, shorting, or trading any specific financial instrument or security.
3. NEVER provide investment, financial, tax, or legal advice.
4. Base every diagnosis, percentage, and rupee amount EXCLUSIVELY on the provided pre-computed metrics. Do not fabricate or hallucinate numbers.
5. Provide constructive, institutional, and objective feedback. Avoid generic clichés.
6. You MUST respond with ONLY a valid, parseable JSON object matching the requested schema. Do not include markdown code block syntax (like ```json) or preamble before/after the JSON.

SCHEMA SPECIFICATION:
{
  "overall_summary": "string - 2-3 sentence executive summary of execution discipline",
  "discipline_grade": "A+" | "A" | "B" | "C" | "D" | "F",
  "discipline_score": integer (0 to 100),
  "top_leaks": [
    {
      "leak_type": "string (e.g. RE_ENTRY_TILT, OVERTRADING, SIZE_CREEP, DISPOSITION_HOLDING)",
      "severity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
      "title": "string - plain English title",
      "diagnosis": "string - detailed behavioral explanation",
      "evidence": "string - quantitative proof citing exact numbers from stats"
    }
  ],
  "suggested_rules": [
    {
      "rule_id": "string (e.g. COOL_OFF_AFTER_LOSS, MAX_DAILY_TRADES_LIMIT, MAX_LOT_SIZE_CAP)",
      "rule_name": "string",
      "rationale": "string",
      "recommended_parameters": { "param_name": "value" }
    }
  ],
  "educational_disclaimer": "DISCLAIMER: This diagnostic audit is strictly educational and behavioral. TradeLens does not predict market prices, recommend securities, or provide financial advice."
}
"""


def build_insight_user_prompt(request: InsightRequest) -> str:
    """Builds the structured user prompt from pre-computed metrics."""
    data = {
        "trading_summary": {
            "total_closed_trades": request.total_trades,
            "win_rate_pct": request.win_rate,
            "realized_net_pnl_inr": request.total_net_pnl,
            "profit_factor": request.profit_factor if request.profit_factor is not None else "N/A",
            "expectancy_inr": request.expectancy_inr,
            "max_drawdown_inr": request.max_drawdown_inr,
            "max_consecutive_losses": request.max_consecutive_losses,
            "computed_discipline_score": request.discipline_score,
        },
        "detected_behavioral_leaks": request.identified_leaks,
    }

    return (
        "Here are the pre-computed summary metrics for the trader's closed trades. "
        "Diagnose their top behavioral leaks, assign a discipline grade, and recommend targeted "
        "catalog guardrail rules to backtest against their history:\n\n"
        f"{json.dumps(data, indent=2)}\n\n"
        "Output strictly valid JSON complying with the system prompt schema."
    )
