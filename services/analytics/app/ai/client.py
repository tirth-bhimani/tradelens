"""TradeLens Free-Tier AI Insights Client.

Provider-agnostic client supporting Google Gemini 1.5 Flash (Free), Groq Llama 3.3 (Free),
and an intelligent zero-cost deterministic rule-based fallback engine.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.ai.prompts import SYSTEM_PROMPT, build_insight_user_prompt
from app.ai.schemas import (
    InsightReport,
    InsightRequest,
    LeakDiagnosis,
    SuggestedRuleRecommendation,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIClient:
    """Unified client for generating behavioral trading insights with zero-cost free LLMs or Anthropic Claude."""

    def __init__(
        self,
        gemini_api_key: str | None = None,
        groq_api_key: str | None = None,
        anthropic_api_key: str | None = None,
        provider: str = "auto",
        timeout_seconds: float = 25.0,
    ) -> None:
        self.gemini_api_key = gemini_api_key or settings.gemini_api_key
        self.groq_api_key = groq_api_key or settings.groq_api_key
        self.anthropic_api_key = anthropic_api_key or settings.anthropic_api_key
        self.gemini_model = getattr(settings, "gemini_model", "gemini-3-flash-preview")
        self.provider = settings.ai_provider if (provider is None or provider == "auto") else provider
        self.timeout = timeout_seconds

    async def generate_insights(self, request: InsightRequest) -> InsightReport:
        """Generates structured behavioral insights, attempting Anthropic or cloud free tiers with deterministic fallback."""
        active_provider = self._resolve_provider()

        if active_provider == "anthropic" and self.anthropic_api_key:
            try:
                return await self._call_anthropic(request)
            except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
                logger.warning("Anthropic API call failed (%s). Falling back to deterministic engine.", e)

        elif active_provider == "gemini" and self.gemini_api_key:
            try:
                return await self._call_gemini(request)
            except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
                logger.warning("Gemini API call failed (%s). Falling back to deterministic engine.", e)

        elif active_provider == "groq" and self.groq_api_key:
            try:
                return await self._call_groq(request)
            except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as e:
                logger.warning("Groq API call failed (%s). Falling back to deterministic engine.", e)

        # Default / Fallback: Zero-cost deterministic behavioral engine
        return self._generate_deterministic(request)

    @property
    def provider_name(self) -> str:
        """Returns uppercase identifier for active provider."""
        resolved = self._resolve_provider()
        if resolved == "anthropic":
            return "ANTHROPIC_CLAUDE_3.5_SONNET"
        if resolved == "gemini":
            name = self.gemini_model.upper().replace("-", "_")
            return name if name.startswith("GEMINI_") else f"GEMINI_{name}"
        if resolved == "groq":
            return "GROQ_LLAMA_3.3_70B"
        return "FREE_DETERMINISTIC"

    async def generate_text(self, prompt: str, system_instruction: str) -> str:
        """Generates text/JSON response for an arbitrary user prompt and system instruction."""
        active = self._resolve_provider()

        if active == "anthropic" and self.anthropic_api_key:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": self.anthropic_api_key or "",
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 2048,
                "temperature": 0.2,
                "system": system_instruction,
                "messages": [{"role": "user", "content": prompt}],
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
            return str(data["content"][0]["text"])

        if active == "gemini" and self.gemini_api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"},
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
            return str(data["candidates"][0]["content"]["parts"][0]["text"])

        if active == "groq" and self.groq_api_key:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "system", "content": system_instruction}, {"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
            return str(data["choices"][0]["message"]["content"])

        # Default fallback: return structured deterministic JSON
        return json.dumps({
            "is_supported": False,
            "rule": None,
            "explanation": "No cloud LLM API key configured. Use standard behavioral phrasing for deterministic parsing.",
            "unsupported_reason": "Offline deterministic fallback active.",
        })

    def _resolve_provider(self) -> str:
        """Determines which provider to attempt based on available keys and configuration."""
        if self.provider == "anthropic" and self.anthropic_api_key:
            return "anthropic"
        if self.provider == "gemini" and self.gemini_api_key:
            return "gemini"
        if self.provider == "groq" and self.groq_api_key:
            return "groq"
        if self.provider == "deterministic":
            return "deterministic"

        # Auto detection: prefer Anthropic if provided, else Gemini, else Groq, else deterministic
        if self.anthropic_api_key:
            return "anthropic"
        if self.gemini_api_key:
            return "gemini"
        if self.groq_api_key:
            return "groq"
        return "deterministic"

    async def _call_anthropic(self, request: InsightRequest) -> InsightReport:
        """Calls Anthropic Claude 3.5 Sonnet via REST Messages API."""
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_api_key or "",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        user_content = build_insight_user_prompt(request)
        instructions = (
            f"{user_content}\n\n"
            "CRITICAL: Output ONLY a single raw JSON object matching the InsightReport schema. "
            "Do not include any conversational preamble or markdown fences."
        )

        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2048,
            "temperature": 0.2,
            "system": SYSTEM_PROMPT,
            "messages": [
                {"role": "user", "content": instructions},
            ],
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text_content = data["content"][0]["text"]
        parsed_json = self._clean_and_parse_json(text_content)
        parsed_json["provider_used"] = "ANTHROPIC_CLAUDE_3.5_SONNET"
        return InsightReport.model_validate(parsed_json)

    async def _call_gemini(self, request: InsightRequest) -> InsightReport:
        """Calls Google Gemini Flash via REST API with native JSON schema enforcement."""
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent"
            f"?key={self.gemini_api_key}"
        )

        user_content = build_insight_user_prompt(request)

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{user_content}"}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text_content = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed_json = self._clean_and_parse_json(text_content)
        name = self.gemini_model.upper().replace("-", "_")
        parsed_json["provider_used"] = name if name.startswith("GEMINI_") else f"GEMINI_{name}"
        return InsightReport.model_validate(parsed_json)

    async def _call_groq(self, request: InsightRequest) -> InsightReport:
        """Calls Groq Llama-3.3-70B via OpenAI-compatible completions endpoint."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }

        user_content = build_insight_user_prompt(request)

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text_content = data["choices"][0]["message"]["content"]
        parsed_json = self._clean_and_parse_json(text_content)
        parsed_json["provider_used"] = "GROQ_LLAMA_3.3_70B"
        return InsightReport.model_validate(parsed_json)

    def _clean_and_parse_json(self, raw_text: str) -> dict[str, Any]:
        """Strips potential markdown code blocks and parses raw JSON securely."""
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        text = text.removesuffix("```")
        text = text.strip()
        return json.loads(text)  # type: ignore[no-any-return]

    def _generate_deterministic(self, request: InsightRequest) -> InsightReport:
        """Zero-cost, offline deterministic engine that translates metrics into human-like institutional diagnoses."""
        score = request.discipline_score
        grade = (
            "A+" if score >= 90 else
            "A" if score >= 80 else
            "B" if score >= 70 else
            "C" if score >= 55 else
            "D" if score >= 40 else "F"
        )

        top_leaks: list[LeakDiagnosis] = []
        suggested_rules: list[SuggestedRuleRecommendation] = []

        # Analyze identified leaks from Task 12
        for leak in request.identified_leaks[:3]:
            leak_type = leak.get("leak_type", "UNKNOWN")
            severity = leak.get("severity", "MODERATE")

            if leak_type == "RE_ENTRY_TILT":
                top_leaks.append(
                    LeakDiagnosis(
                        leak_type="RE_ENTRY_TILT",
                        severity=severity,
                        title="Impulsive Re-entry Tilt Following Losses",
                        diagnosis=(
                            "You exhibited revenge trading impulses by rushing into new positions "
                            "within minutes of taking a loss, resulting in compounded capital degradation."
                        ),
                        evidence=(
                            f"Detected {leak.get('re_entry_count', 0)} hurried re-entries leading to "
                            f"₹{leak.get('pnl_impact_inr', 0.0):,.2f} in avoidable losses."
                        ),
                    )
                )
                suggested_rules.append(
                    SuggestedRuleRecommendation(
                        rule_id="COOL_OFF_AFTER_LOSS",
                        rule_name="15-Minute Mandatory Cooldown After Loss",
                        rationale="Enforces an emotional circuit breaker after any loss to reset cognitive clarity.",
                        recommended_parameters={"cooldown_minutes": 15, "max_consecutive_losses": 1},
                    )
                )

            elif leak_type == "OVERTRADING":
                top_leaks.append(
                    LeakDiagnosis(
                        leak_type="OVERTRADING",
                        severity=severity,
                        title="Excessive Intraday Trade Frequency",
                        diagnosis=(
                            "Trade frequency escalated beyond your optimal statistical edge, "
                            "generating friction through statutory brokerage and exchange tariffs."
                        ),
                        evidence=(
                            f"Execution surged past threshold limits on {leak.get('overtrading_days_count', 0)} sessions, "
                            f"incurring ₹{leak.get('pnl_impact_inr', 0.0):,.2f} in net drain."
                        ),
                    )
                )
                suggested_rules.append(
                    SuggestedRuleRecommendation(
                        rule_id="MAX_DAILY_TRADES_LIMIT",
                        rule_name="Intraday Trade Frequency Cap (5 Trades Max)",
                        rationale="Stops overtrading during low-volatility midday chop and caps daily transaction costs.",
                        recommended_parameters={"max_daily_trades": 5},
                    )
                )

            elif leak_type == "SIZE_CREEP":
                top_leaks.append(
                    LeakDiagnosis(
                        leak_type="SIZE_CREEP",
                        severity=severity,
                        title="Unplanned Position Sizing Escalation",
                        diagnosis=(
                            "Position lot sizing increased substantially above your baseline median, "
                            "exposing single trades to outsized variance."
                        ),
                        evidence=(
                            f"Detected {leak.get('size_creep_trades_count', 0)} trades with sizing >1.5x median, "
                            f"causing ₹{leak.get('pnl_impact_inr', 0.0):,.2f} in capital risk."
                        ),
                    )
                )
                suggested_rules.append(
                    SuggestedRuleRecommendation(
                        rule_id="MAX_LOT_SIZE_CAP",
                        rule_name="Position Sizing Guardrail (Fixed Max Lots)",
                        rationale="Restricts position sizing variance to ensure uniform risk distribution across trades.",
                        recommended_parameters={"max_quantity_multiplier": 1.25},
                    )
                )

            elif leak_type == "DISPOSITION_HOLDING":
                top_leaks.append(
                    LeakDiagnosis(
                        leak_type="DISPOSITION_HOLDING",
                        severity=severity,
                        title="Asymmetric Holding Times (Holding Losers)",
                        diagnosis=(
                            "Losing positions were held significantly longer than winning positions, "
                            "violating asymmetric risk-to-reward ratios."
                        ),
                        evidence=(
                            f"Loss holding duration was {leak.get('disposition_ratio', 0.0):.1f}x higher than win duration, "
                            f"eroding ₹{leak.get('pnl_impact_inr', 0.0):,.2f}."
                        ),
                    )
                )
                suggested_rules.append(
                    SuggestedRuleRecommendation(
                        rule_id="HARD_DAILY_STOP_LOSS",
                        rule_name="Time-Based Invalidation Stop",
                        rationale="Forces trade invalidation if a position fails to confirm direction within target time.",
                        recommended_parameters={"max_holding_minutes": 60},
                    )
                )

        # Fallback if no leaks detected (e.g. pristine or empty journal)
        if not top_leaks:
            top_leaks.append(
                LeakDiagnosis(
                    leak_type="GENERAL_DISCIPLINE",
                    severity="LOW",
                    title="Steady Trade Execution",
                    diagnosis=(
                        "No acute behavioral leaks detected in the current window. Continue adhering to your defined "
                        "risk per trade and honor stop-loss thresholds."
                    ),
                    evidence=f"Overall discipline score maintained at {score}/100 with {request.total_trades} closed trades.",
                )
            )
            suggested_rules.append(
                SuggestedRuleRecommendation(
                    rule_id="MAX_DAILY_TRADES_LIMIT",
                    rule_name="Standard Intraday Trade Cap",
                    rationale="Preserves capital consistency during unexpected market turbulence.",
                    recommended_parameters={"max_daily_trades": 6},
                )
            )

        summary = (
            f"Execution discipline scored at {score}/100 (Grade: {grade}) across {request.total_trades} closed trades. "
            f"Win rate stood at {request.win_rate:.1f}% with realized net P&L of ₹{request.total_net_pnl:,.2f}. "
            f"The primary areas for risk refinement center on mitigating {top_leaks[0].title.lower()}."
        )

        return InsightReport(
            overall_summary=summary,
            discipline_grade=grade,  # type: ignore[arg-type]
            discipline_score=score,
            top_leaks=top_leaks,
            suggested_rules=suggested_rules,
            educational_disclaimer=(
                "DISCLAIMER: This diagnostic audit is strictly educational and behavioral. "
                "TradeLens does not predict market prices, recommend securities, or provide financial advice."
            ),
            provider_used="FREE_DETERMINISTIC",
        )


def get_ai_client() -> AIClient:
    """Factory dependency for AIClient."""
    return AIClient()
