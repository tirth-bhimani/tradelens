# SPEC-task19: Fixed Rule Catalog Definition & Validator

- **Module**: `services/analytics/app/rules/`
- **Status**: Draft / Ready for Review
- **Owner**: TradeLens Analytics & Backtester Team
- **Dependencies**: Task 8 (FIFO Trade Pairing Engine & Trade models)
- **Downstream**: Task 20 (Natural Language Translator), Task 21 (Deterministic 70/30 Replay Backtester)

---

## 1. Problem Statement

To backtest behavioral guardrails and simulate counter-factual portfolio performance, TradeLens needs a mathematically strict, deterministic catalog of rules. Without a formal schema:
1. Traders could configure invalid parameters (negative cooldowns, impossible market hours).
2. The backtest replay engine (Task 21) would encounter runtime exceptions or unpredictable behavior.
3. Natural language AI translation (Task 20) would lack a rigid grammar to constrain LLM outputs.

Task 19 establishes the fixed V1 rule catalog and validation engine in Python using Pydantic v2.

---

## 2. Catalog Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TradingRule (Discriminated Union)                     │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       ├──► COOL_OFF_AFTER_LOSS         (cooldown_minutes, trigger_loss_inr)
       ├──► MAX_CONSECUTIVE_LOSSES      (consecutive_losses, action, cooldown)
       ├──► DAILY_LOSS_LIMIT            (max_loss_inr, max_loss_percent_capital)
       ├──► MAX_DAILY_TRADES_LIMIT      (max_trades, action)
       ├──► TIME_OF_DAY_CUTOFF          (allowed_start_time, allowed_end_time)
       ├──► MAX_POSITION_SIZE           (max_quantity, max_lots, max_capital)
       ├──► SKIP_INSTRUMENT_TYPE        (disallowed_types: OPTIONS_BUY, etc.)
       ├──► NO_TRADING_ON_EXPIRY_DAY    (action, max_lots, affected_indices)
       └──► COMPOSITE_RULE              (conjunction: AND, rules: [Rule1, Rule2])
```

---

## 3. Detailed Specifications

### 3.1. Catalog Schema Models (`app/rules/catalog.py`)

- All models inherit from `BaseModel` and declare a constant literal `rule_type`.
- Boundary validators:
  - Time format: `^([01]\d|2[0-3]):[0-5]\d$` (HH:MM).
  - Cooldown: $1 \le \text{minutes} \le 240$.
  - Consecutive losses: $1 \le \text{losses} \le 10$.
  - Daily trades: $1 \le \text{trades} \le 100$.
  - Loss percentages: $0.1 \le \text{percent} \le 25.0$.

### 3.2. Validation Engine (`app/rules/validator.py`)

- `validate_rule(payload: dict[str, Any]) -> ValidationResult`:
  - Parses dictionary through `TradingRuleAdapter`.
  - Formats clean error messages with exact field location and friendly explanation.
- Composite rules:
  - Enforces flat composition (no recursive composite rules).
  - Enforces minimum 2 and maximum 6 sub-rules.
  - Ensures no duplicate rule types within the composite.

### 3.3. Catalog Registry (`app/rules/registry.py`)

- Exposes metadata for UI catalogs (Task 22) and AI prompts (Task 20):
  - Rule name, description, category.
  - Parameter specifications (type, default, min, max, label).

---

## 4. Verification & Testing

- Unit tests in `tests/test_rules_catalog.py`:
  - 100% test coverage across all 9 rule types.
  - Boundary assertions for edge parameters.
  - Full roundtrip serialization check.
