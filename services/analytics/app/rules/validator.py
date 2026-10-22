"""TradeLens Rule Validator Engine (Task 19).

Strict verification and error formatting for the TradeLens trading rule catalog.
Provides structured validation results, friendly error messages, and JSON serialization.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from pydantic_core import ErrorDetails

from app.rules.catalog import APPROVED_RULE_TYPES, TradingRule

# Pre-compiled Pydantic TypeAdapter for the discriminated union
_TRADING_RULE_ADAPTER: TypeAdapter[TradingRule] = TypeAdapter(TradingRule)


class RuleValidationErrorDetail(BaseModel):
    """Detailed error record for a specific parameter constraint violation."""

    field: str = Field(..., description="Field or parameter name that failed validation")
    message: str = Field(..., description="Human-readable explanation of why the parameter is invalid")
    input_value: Any = Field(default=None, description="The invalid input value that was rejected")


class ValidationResult(BaseModel):
    """Structured validation report returned by validate_rule."""

    is_valid: bool = Field(..., description="True if the payload matches a valid catalog rule schema")
    rule: TradingRule | None = Field(default=None, description="Parsed Pydantic rule instance if valid")
    rule_type: str | None = Field(default=None, description="Catalog identifier of the rule")
    errors: list[RuleValidationErrorDetail] = Field(
        default_factory=list, description="List of specific parameter errors if invalid"
    )
    error_summary: str | None = Field(
        default=None, description="Concise human-readable summary of validation errors"
    )


class RuleCatalogValidationError(ValueError):
    """Exception raised when rule validation fails during strict parsing."""

    def __init__(self, message: str, errors: list[RuleValidationErrorDetail] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.errors = errors or []


def _format_error_detail(err: ErrorDetails) -> RuleValidationErrorDetail:
    """Formats a raw Pydantic error dictionary into a clean, trader-friendly record."""
    loc = err.get("loc", ())
    # Skip union/discriminator internal path noise if present
    field_parts = [str(part) for part in loc if part not in ("rules", "rule_type") or len(loc) == 1]
    field_name = ".".join(field_parts) if field_parts else "rule_payload"
    raw_msg = err.get("msg", "Invalid parameter")
    # Clean up generic Pydantic technical wording for user clarity
    msg = raw_msg.replace("Value error, ", "").strip()
    return RuleValidationErrorDetail(
        field=field_name,
        message=msg,
        input_value=err.get("input"),
    )


def validate_rule(payload: dict[str, Any]) -> ValidationResult:
    """Validates an arbitrary dictionary payload against the fixed V1 rule catalog.

    Args:
        payload: Dictionary containing at least a 'rule_type' and rule parameters.

    Returns:
        ValidationResult with is_valid=True and parsed rule, or is_valid=False with errors.
    """
    if not isinstance(payload, dict):
        return ValidationResult(
            is_valid=False,
            rule=None,
            rule_type=None,
            errors=[
                RuleValidationErrorDetail(
                    field="payload",
                    message="Rule payload must be a JSON object (dictionary)",
                    input_value=type(payload).__name__,
                )
            ],
            error_summary="Rule payload must be a JSON object (dictionary)",
        )

    rule_type = payload.get("rule_type")
    if not rule_type or not isinstance(rule_type, str):
        return ValidationResult(
            is_valid=False,
            rule=None,
            rule_type=None,
            errors=[
                RuleValidationErrorDetail(
                    field="rule_type",
                    message=f"Missing or invalid 'rule_type'. Must be one of: {', '.join(APPROVED_RULE_TYPES)}",
                    input_value=rule_type,
                )
            ],
            error_summary="Missing required 'rule_type' attribute.",
        )

    if rule_type not in APPROVED_RULE_TYPES:
        return ValidationResult(
            is_valid=False,
            rule=None,
            rule_type=rule_type,
            errors=[
                RuleValidationErrorDetail(
                    field="rule_type",
                    message=f"Uncataloged rule_type '{rule_type}'. Approved types: {', '.join(APPROVED_RULE_TYPES)}",
                    input_value=rule_type,
                )
            ],
            error_summary=f"Rule type '{rule_type}' is not recognized in TradeLens V1 catalog.",
        )

    try:
        parsed_rule = _TRADING_RULE_ADAPTER.validate_python(payload)
        return ValidationResult(
            is_valid=True,
            rule=parsed_rule,
            rule_type=rule_type,
            errors=[],
            error_summary=None,
        )
    except ValidationError as exc:
        details = [_format_error_detail(e) for e in exc.errors()]
        summary = "; ".join([f"{d.field}: {d.message}" for d in details])
        return ValidationResult(
            is_valid=False,
            rule=None,
            rule_type=rule_type,
            errors=details,
            error_summary=summary,
        )


def parse_rule(payload: dict[str, Any]) -> TradingRule:
    """Strictly parses a rule payload into a TradingRule, raising on validation error.

    Args:
        payload: Dictionary matching a rule catalog schema.

    Returns:
        Instantiated TradingRule object.

    Raises:
        RuleCatalogValidationError: If payload fails validation.
    """
    res = validate_rule(payload)
    if not res.is_valid or res.rule is None:
        raise RuleCatalogValidationError(res.error_summary or "Rule validation failed", res.errors)
    return res.rule


def serialize_rule(rule: TradingRule) -> dict[str, Any]:
    """Serializes a validated TradingRule model into a clean JSON-compatible dictionary.

    Args:
        rule: Instantiated TradingRule object.

    Returns:
        Dictionary representation ready for database storage.
    """
    return rule.model_dump(mode="json", exclude_none=True)
