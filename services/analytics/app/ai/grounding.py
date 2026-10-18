"""TradeLens AI Numeric Grounding Validator.

Cross-checks numerical claims made in AI behavioral insights against real computed
statistics to prevent financial hallucination, enforcing a strict 2% margin of error.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.ai.schemas import GroundingResult, InsightReport, InsightRequest

logger = logging.getLogger(__name__)

# Standard behavioral rule catalog parameters allowed without being flagged as hallucinated stats
ALLOWED_CATALOG_CONSTANTS: set[float] = {
    0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0,
    15.0, 20.0, 30.0, 45.0, 60.0, 90.0, 120.0,
    100.0,  # 100% full scale
}

# Calendar years and trading session hours to ignore as non-metric claims
IGNORED_YEARS: set[float] = {float(y) for y in range(2015, 2035)}


class GroundingValidator:
    """Anti-hallucination validator cross-checking LLM claims against computed metrics."""

    @classmethod
    def extract_numbers_from_text(cls, text: str) -> list[float]:
        """Extracts numerical quantities, currency, and percentages from natural language text."""
        if not text:
            return []

        # Remove known time references like 09:15, 15:30 to avoid confusing hours with metrics
        cleaned = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", " ", text)

        # Remove dates like 2026-10-18 or 18/10/2026
        cleaned = re.sub(r"\b\d{4}[-/]\d{2}[-/]\d{2}\b", " ", cleaned)
        cleaned = re.sub(r"\b\d{2}[-/]\d{2}[-/]\d{4}\b", " ", cleaned)

        # Regex for currency / Lakhs / Crores (e.g., 2.5 Lakh, 1.2 Cr, ₹12,500)
        numbers: list[float] = []

        # 1. Match Lakhs: e.g. "1.5 Lakh" or "1.5L"
        for m in re.finditer(r"(?:₹|Rs\.?\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lakhs|l)\b", cleaned, re.IGNORECASE):
            try:
                numbers.append(float(m.group(1)) * 100_000.0)
            except ValueError:
                continue

        # 2. Match Crores: e.g. "2.5 Cr" or "2.5 Crore"
        for m in re.finditer(r"(?:₹|Rs\.?\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:crore|crores|cr)\b", cleaned, re.IGNORECASE):
            try:
                numbers.append(float(m.group(1)) * 10_000_000.0)
            except ValueError:
                continue

        # 3. Match regular numbers, currencies (₹12,500 or -4,500), and percentages (42.5%)
        # Strip commas in numbers like 12,500.00
        num_pattern = re.compile(
            r"(?:₹|Rs\.?\s*)?([+-]?[0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[+-]?[0-9]+(?:\.[0-9]+)?)\s*(%?)",
            re.IGNORECASE,
        )

        for m in num_pattern.finditer(cleaned):
            raw_val = m.group(1).replace(",", "")
            is_pct = bool(m.group(2))
            if not raw_val or raw_val in {"+", "-", "."}:
                continue
            try:
                val = float(raw_val)
                # Ignore isolated 0
                if abs(val) < 1e-6:
                    continue
                # Ignore calendar years
                if val in IGNORED_YEARS:
                    continue
                numbers.append(val)
                # If marked as percentage (e.g. 42%), also check decimal form (0.42)
                if is_pct and val > 1.0:
                    numbers.append(val / 100.0)
            except ValueError:
                continue

        return numbers

    @classmethod
    def extract_ground_truth_numbers(cls, stats: dict[str, Any] | InsightRequest) -> set[float]:
        """Flattens all scalar numeric values from the computed statistics payload."""
        truth: set[float] = set()

        if isinstance(stats, InsightRequest):
            stats_dict = stats.model_dump()
        else:
            stats_dict = dict(stats)

        def _traverse(obj: Any) -> None:
            if isinstance(obj, (int, float)):
                fval = float(obj)
                if abs(fval) > 1e-6:
                    truth.add(fval)
                    truth.add(abs(fval))
                    # If percentage like 42.5, also add 0.425; if 0.425, add 42.5
                    if 0.0 < abs(fval) <= 1.0:
                        truth.add(abs(fval) * 100.0)
                    elif 1.0 < abs(fval) <= 100.0:
                        truth.add(abs(fval) / 100.0)
            elif isinstance(obj, dict):
                for v in obj.values():
                    _traverse(v)
            elif isinstance(obj, (list, tuple, set)):
                for item in obj:
                    _traverse(item)

        _traverse(stats_dict)
        return truth

    @classmethod
    def is_close(cls, claimed: float, truth: float, tolerance: float = 0.02) -> bool:
        """Determines if claimed number matches truth within relative tolerance (or 0.05 for near-zero)."""
        c = abs(claimed)
        t = abs(truth)
        if t < 1.0:
            return abs(c - t) <= 0.05
        return (abs(c - t) / t) <= tolerance

    @classmethod
    def validate_report(
        cls,
        report: InsightReport,
        request: InsightRequest | dict[str, Any],
        tolerance: float = 0.02,
    ) -> GroundingResult:
        """Validates that all numeric claims in an InsightReport are grounded in computed metrics."""
        ground_truth = cls.extract_ground_truth_numbers(request)

        # Collect text chunks from all diagnostic sections of the report
        text_corpus: list[str] = [report.overall_summary]

        for leak in report.top_leaks:
            text_corpus.append(leak.diagnosis)
            text_corpus.append(leak.evidence)

        for rule in report.suggested_rules:
            text_corpus.append(rule.rationale)
            for param_val in rule.recommended_parameters.values():
                if isinstance(param_val, (int, float)):
                    # Catalog recommendation parameters are allowed directly
                    ground_truth.add(float(param_val))

        combined_text = " ".join(text_corpus)
        extracted = cls.extract_numbers_from_text(combined_text)

        matched: list[float] = []
        discrepancies: list[str] = []

        for num in extracted:
            abs_num = abs(num)

            # 1. Allowed catalog constants (e.g. 15/30 min cool off, 3 trades limit)
            if any(cls.is_close(abs_num, allowed, tolerance) for allowed in ALLOWED_CATALOG_CONSTANTS):
                matched.append(num)
                continue

            # 2. Match against real ground-truth computed statistics
            is_matched = False
            for gt in ground_truth:
                if cls.is_close(abs_num, gt, tolerance):
                    matched.append(num)
                    is_matched = True
                    break

            if not is_matched:
                discrepancies.append(
                    f"Ungrounded metric claim: '{num}' in report does not match any computed statistic within {tolerance * 100:.0f}% margin."
                )

        is_valid = len(discrepancies) == 0
        rejection_reason = (
            f"Grounding validation rejected report due to {len(discrepancies)} ungrounded or hallucinated claims."
            if not is_valid
            else None
        )

        if not is_valid:
            logger.warning(
                "Grounding validation failed for report (discipline_grade=%s): %s",
                report.discipline_grade,
                "; ".join(discrepancies),
            )

        return GroundingResult(
            is_valid=is_valid,
            extracted_numbers=extracted,
            matched_numbers=matched,
            discrepancies=discrepancies,
            rejection_reason=rejection_reason,
        )
