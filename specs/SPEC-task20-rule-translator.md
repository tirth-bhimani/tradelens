# SPEC-task20: Natural Language to JSON Rule Translator

- **Module**: `services/analytics/app/rules/translator.py`, `services/analytics/app/routers/rules.py`
- **Status**: Draft / Ready for Review
- **Owner**: TradeLens Analytics Team
- **Dependencies**: Task 16 (`app/ai/client.py`), Task 19 (`app/rules/catalog.py`, `app/rules/validator.py`)
- **Downstream**: Task 21 (Deterministic 70/30 Replay Backtester), Task 22 (Rule Lab Interactive Interface)

---

## Assumptions I'm Making

1. **Multi-Provider AI Architecture**:
   - The translator leverages the existing AI client infrastructure from Task 16 ([`services/analytics/app/ai/client.py`](file:///D:/resume/sdd/services/analytics/app/ai/client.py)) supporting Google Gemini 1.5 Flash, Groq Llama 3.3, Anthropic Claude 3.5 Sonnet, and an offline deterministic rule mapper.
   - For offline testing and free local usage, a deterministic pattern-matching engine parses common trader phrasings without requiring external API keys.
2. **Fixed V1 Catalog Constraint**:
   - The translator can ONLY output rules belonging to the 9 approved catalog types established in Task 19:
     `COOL_OFF_AFTER_LOSS`, `MAX_CONSECUTIVE_LOSSES`, `DAILY_LOSS_LIMIT`, `MAX_DAILY_TRADES_LIMIT`, `TIME_OF_DAY_CUTOFF`, `MAX_POSITION_SIZE`, `SKIP_INSTRUMENT_TYPE`, `NO_TRADING_ON_EXPIRY_DAY`, and `COMPOSITE_RULE`.
   - Technical indicators (e.g. RSI, EMA crossover), price predictions, or discretionary trade advice are **out-of-scope** and must be cleanly rejected with a polite explanation of supported guardrails.
3. **Multi-Clause Conjunctions**:
   - Compound sentences containing multiple guardrails (e.g., *"Max 5 trades per day and don't let me trade for 30 minutes after a loss"*) must be translated into a `COMPOSITE_RULE` combining atomic rules with `AND` conjunction.
4. **Mandatory Schema Validation**:
   - All translated outputs must pass strict Pydantic v2 verification through `validate_rule()` from `app.rules.validator`. If an LLM hallucination or invalid parameter is produced, the validator intercepts it and falls back to deterministic extraction or a clear rejection explanation.
5. **API Endpoint & Service Contract**:
   - Expose a FastAPI router endpoint `POST /rules/translate` taking `{ "prompt": str, "starting_capital": float | None }` and returning `{ "success": bool, "rule": TradingRule | None, "explanation": str, "is_supported": bool, "unsupported_reason": str | None }`.

---

## 1. Objective

Build an intelligent, fault-tolerant translation service in Python that compiles free-form trader rules into strict, validated TradeLens rule catalog JSON:
1. **System Prompt & Grammar Definition (`services/analytics/app/rules/prompt.py`)**:
   - Structured prompt providing the LLM with exact parameter schemas, bounds, and few-shot examples for all 9 rules.
   - Strict instructions to reject uncataloged concepts (technical analysis indicators, directional price predictions).
2. **Rule Translator Engine (`services/analytics/app/rules/translator.py`)**:
   - `translate_rule_text(prompt: str, starting_capital: float | None = None) -> TranslationResult`.
   - Hybrid engine: fast deterministic rule parser for standard English phrases + LLM fallback for nuanced phrasing.
   - Multi-clause splitter for composite rules.
   - Pipeline verification using Task 19's `validate_rule()`.
3. **FastAPI Translation Endpoint (`services/analytics/app/routers/rules.py`)**:
   - High-performance REST endpoint for the Next.js Rule Lab interactive interface.
4. **Comprehensive Test Suite (`services/analytics/tests/test_translator.py`)**:
   - Tests asserting accurate translation of single rules across varied phrasings.
   - Tests for composite multi-clause statements.
   - Negative tests verifying rejection of unsupported indicator/price prediction requests.

---

## 2. Architecture & Translation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       User Natural Language Prompt                          │
│        e.g., "Max 5 trades per day and 30 min cooldown after losses"        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Regex Pattern Matcher & Clause Splitter                     │
│    (Fast offline parsing for standard phrasing; extracts clauses & numbers) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Match Found?
                       ┌───────────────┴───────────────┐
                   Yes │                               │ No / Nuanced
                       ▼                               ▼
       ┌───────────────────────────────┐   ┌──────────────────────────────────┐
       │   Deterministic Rule Mapper   │   │   LLM Structured JSON Prompt     │
       │  (Zero API cost, instant res) │   │ (Gemini / Groq / Claude fallback)│
       └───────────────┬───────────────┘   └──────────────────┬───────────────┘
                       │                                      │
                       └───────────────┬──────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Task 19 Rule Validator Engine                           │
│                app.rules.validator.validate_rule(payload)                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Valid?
                       ┌───────────────┴───────────────┐
                   Yes │                               │ No (Hallucination / Error)
                       ▼                               ▼
       ┌───────────────────────────────┐   ┌──────────────────────────────────┐
       │ Return Validated TradingRule  │   │ Graceful Error / Rejection Msg   │
       │  HTTP 200 { success: true }   │   │  HTTP 200 { is_supported: false }│
       └───────────────────────────────┘   └──────────────────────────────────┘
```

---

## 3. Supported Phrasing & Translation Targets

| Trader Natural Language Input | Target Catalog Rule | Extracted Parameters |
|---|---|---|
| *"Don't let me trade for 20 minutes after losing money"* | `COOL_OFF_AFTER_LOSS` | `cooldown_minutes: 20, max_consecutive_losses: 1` |
| *"Pause for 45 mins if I lose more than 3000 rupees"* | `COOL_OFF_AFTER_LOSS` | `cooldown_minutes: 45, trigger_loss_inr: 3000.0` |
| *"Stop me for the day after 3 consecutive red trades"* | `MAX_CONSECUTIVE_LOSSES` | `consecutive_losses: 3, action: "HALT_FOR_DAY"` |
| *"Cap my daily loss at 5000 rs"* | `DAILY_LOSS_LIMIT` | `max_loss_inr: 5000.0, action: "HALT_FOR_DAY"` |
| *"Don't allow more than 2% daily loss on 2 lakh capital"* | `DAILY_LOSS_LIMIT` | `max_loss_percent_capital: 2.0, starting_capital: 200000.0` |
| *"Limit me to 5 trades maximum each day"* | `MAX_DAILY_TRADES_LIMIT` | `max_trades: 5, action: "HALT_FOR_DAY"` |
| *"Only trade between 9:30 AM and 2:30 PM, avoid lunch"* | `TIME_OF_DAY_CUTOFF` | `allowed_start_time: "09:30", allowed_end_time: "14:30", restricted_lunch_break: True` |
| *"Max 2 lots per trade on BankNifty options"* | `MAX_POSITION_SIZE` | `max_lots: 2, segment: "FNO"` |
| *"No naked options buying"* | `SKIP_INSTRUMENT_TYPE` | `disallowed_types: ["OPTIONS_BUY"]` |
| *"Don't trade on Thursdays on Nifty expiry"* | `NO_TRADING_ON_EXPIRY_DAY` | `action: "HALT_FOR_DAY", affected_indices: ["NIFTY"]` |
| *"Max 4 trades a day and 30 min cooldown after any loss"* | `COMPOSITE_RULE` | `conjunction: "AND", rules: [MAX_DAILY_TRADES_LIMIT(4), COOL_OFF_AFTER_LOSS(30)]` |
| *"Buy call options when 20 EMA crosses 50 EMA"* | **REJECTED** | `is_supported: False, unsupported_reason: "TradeLens is a behavioral risk guardrail engine. Moving average indicator triggers are not supported."` |

---

## 4. Tech Stack

- **Runtime**: Python 3.11+ / 3.13
- **Validation**: Pydantic v2 (`TradingRule`, `validate_rule` from `app.rules`)
- **LLM Client**: `app.ai.client.AIClient` (Google Gemini 1.5 Flash, Groq Llama 3.3, Claude 3.5 Sonnet, Deterministic)
- **Web API**: FastAPI, Pydantic request/response schemas
- **Testing**: `pytest`, `pytest-asyncio`
- **Typing**: `mypy --strict`

---

## 5. Commands

```powershell
# Run Task 20 translator test suite
services/analytics/.venv/Scripts/pytest.exe services/analytics/tests/test_translator.py -v

# Run entire backend test suite
services/analytics/.venv/Scripts/pytest.exe services/analytics/

# Type check translator module
services/analytics/.venv/Scripts/python.exe -m mypy services/analytics/app/rules/translator.py
```

---

## 6. Project Structure

```
services/analytics/
  app/
    rules/
      __init__.py              → Updated exports for translator
      catalog.py               → Task 19 rule schemas
      validator.py             → Task 19 validation engine
      registry.py              → Task 19 catalog registry
      prompt.py                → System prompts, few-shot examples, JSON translation schemas
      translator.py            → Translation engine (deterministic matcher + AI LLM pipeline)
    routers/
      rules.py                 → FastAPI REST endpoint POST /rules/translate
  tests/
    test_translator.py         → Comprehensive unit and integration test suite
```

---

## 7. Code Style & Conventions

- Deterministic first, LLM fallback: fast regex pattern matching handles standard rule queries with zero network latency.
- Strict Pydantic response envelope:

```python
class TranslateRuleRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500, description="Trader natural language prompt")
    starting_capital: float | None = Field(default=None, gt=0, description="User capital for % drawdown rules")

class TranslateRuleResponse(BaseModel):
    success: bool
    is_supported: bool
    rule: dict[str, Any] | None = None
    rule_type: str | None = None
    explanation: str
    unsupported_reason: str | None = None
```

---

## 8. Testing Strategy

- **Test file**: `services/analytics/tests/test_translator.py`
- **Test Scenarios**:
  1. `test_translate_cooldown_variations`: Test multiple natural language phrasing of cooldown timers (e.g. "15 min break", "pause 30 mins after loss").
  2. `test_translate_daily_loss_limit`: Test rupee amounts ("cap loss at ₹4000", "5k max loss") and percent thresholds ("2% of capital").
  3. `test_translate_max_trades`: Test "max 5 trades", "limit to 3 orders per day".
  4. `test_translate_session_window`: Test morning/afternoon timing ("only trade 9:15 to 11:30", "no trading after 2pm").
  5. `test_translate_composite_multi_clause`: Test compound sentences joined with "and", "plus", or semicolons.
  6. `test_unsupported_technical_analysis_rejection`: Test rejection of RSI, Bollinger Bands, Moving Averages with helpful explanation.
  7. `test_unsupported_price_predictions_rejection`: Test rejection of "predict BankNifty tomorrow".
  8. `test_fastapi_endpoint`: Test `POST /rules/translate` endpoint end-to-end via FastAPI `TestClient`.

---

## 9. Boundaries

- **Always do**:
  - Always validate translated JSON through `validate_rule()` before returning.
  - Provide a clear, polite explanation when rejecting an unsupported rule concept.
  - Support offline deterministic execution for rapid testing without requiring API keys.
  - Run `pytest` and `mypy` before completing.
- **Ask first**:
  - Adding new endpoints outside `/rules/translate`.
  - Modifying the core `AIClient` provider hierarchy.
- **Never do**:
  - Never allow technical analysis indicators or trade execution signals to pass through.
  - Never return unvalidated JSON that could crash downstream backtest engines.
  - Never leak API keys in response logs.

---

## 10. Success Criteria

1. `services/analytics/app/rules/translator.py` translates natural language descriptions into valid catalog rule schemas.
2. Compound sentences with multiple rules produce valid `COMPOSITE_RULE` outputs with `AND` conjunction.
3. Unsupported requests (technical indicators, price forecasts) are gracefully rejected with `is_supported=False`.
4. All translated rules pass `validate_rule()` validation with 0 parameter violations.
5. FastAPI router endpoint `POST /rules/translate` responds with structured status.
6. All tests in `services/analytics/tests/test_translator.py` pass cleanly.
7. Mypy passes with 0 errors in strict mode.

---

## 11. Open Questions

- None. The translation target schemas directly map to the approved Task 19 catalog.
