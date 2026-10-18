# Spec: Task 16 - Structured AI Prompt Pipeline & Free LLM Provider Client with Guardrails

## Assumptions & Finalized Design Decisions

1. **Selected Free LLM Architecture (Best for TradeLens)**:
   - **Primary Free Cloud Provider: Google Gemini (Gemini 1.5 Flash / 2.0 Flash)**:
     - **Why Selected**: 100% free via Google AI Studio (`GEMINI_API_KEY`, no credit card required, 15 RPM, 1,500 requests/day). Features native JSON schema mode (`response_mime_type="application/json"`) ensuring zero JSON parsing errors.
   - **Secondary Free Cloud Provider: Groq (Llama-3.3-70B-Versatile)**:
     - Enabled automatically if `GROQ_API_KEY` is provided. Ultra-fast OpenAI-compatible free API.
   - **Built-in Zero-Setup Mode: Free Deterministic Rule-Based Engine (`FREE_DETERMINISTIC`)**:
     - **Active by default if no API key is provided**: TradeLens works immediately out of the box with $0 cost, zero API keys, and 100% offline reliability. It translates the trader's computed metrics from Tasks 11 & 12 directly into institutional, non-robotic behavioral explanations and rule recommendations.
2. **Strict Guardrails & Compliance**:
   - Role: **Educational Behavioral Analyst & Execution Risk Coach only**.
   - **Strictly Prohibited**:
     - Never predicts market or stock prices.
     - Never gives buy, sell, hold, or trading recommendations.
     - Never issues financial advice (mandatory disclaimer stamped on every payload).
   - **Data Privacy**:
     - Sends **only pre-computed summary statistics** (Task 11 & Task 12 reports: win rate, leak counts, drawdown, streaks).
     - **Never transmits raw trades, fill IDs, broker accounts, or personal information**.
3. **Structured JSON Output Schema**:
   - Strict Pydantic v2 schema validation for all LLM responses:
     - `top_leaks`: List of 1 to 3 identified leaks with plain-English diagnosis and severity.
     - `evidence`: Quantitative facts cited directly from the input metrics.
     - `suggested_rules`: Concrete guardrail rules from the TradeLens rule catalog (e.g. `COOL_OFF_AFTER_LOSS`, `MAX_DAILY_TRADES_LIMIT`).
     - `discipline_grade`: Letter grade (`A+`, `A`, `B`, `C`, `F`) reflecting overall behavioral discipline.
     - `educational_disclaimer`: Mandatory non-advisory compliance statement.
4. **Resilience & Fault Tolerance**:
   - Retries invalid or truncated JSON once with temperature adjustment.
   - Automatically falls back to deterministic free generation on HTTP 429 (rate limit) or connection failures.

---

## Objective

Build a zero-cost, structured AI prompt pipeline and provider-agnostic LLM client for the TradeLens analytics service (`services/analytics`):
1. **Pydantic Schemas (`schemas.py`)**:
   - Input: `InsightRequest` encapsulating pre-computed performance and leak metrics.
   - Output: `InsightReport`, `LeakDiagnosis`, `SuggestedRuleRecommendation`.
2. **Prompt Pipeline (`prompts.py`)**:
   - System prompt encoding behavioral coaching persona and anti-advice guardrails.
   - User prompt dynamically assembling metric summaries without raw trade data.
3. **Free LLM Client (`client.py`)**:
   - Provider implementation supporting **Gemini 1.5 Flash (Free)**, **Groq Llama 3.3 (Free)**, and the **Built-in Deterministic Engine (Free)**.
   - Resilient retry and zero-cost fallback handling using `httpx`.
4. **API Router (`ai_insights.py`)**:
   - FastAPI endpoint `POST /api/v1/ai/insights` delivering structured JSON insights.

---

## Tech Stack

- **Framework**: FastAPI with Python 3.11+
- **HTTP Client**: `httpx>=0.27.0` (asynchronous, already installed)
- **Validation**: Pydantic v2 (`pydantic>=2.6.0`)
- **Testing**: `pytest>=8.0.0` with `pytest-asyncio`
- **Typing**: `mypy` strict mode

---

## Commands

```powershell
# Run AI client and prompt pipeline unit tests
services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests/test_ai_client.py

# Run all backend tests
services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests

# Type checking
services\analytics\.venv\Scripts\python.exe -m mypy services/analytics/app/ai

# Linting
services\analytics\.venv\Scripts\python.exe -m ruff check services/analytics/app/ai
```

---

## Project Structure

```
services/analytics/
  app/
    ai/
      __init__.py
      schemas.py          → Pydantic v2 input/output schemas for structured insights
      prompts.py          → Guardrailed system and user prompt builders
      client.py           → Free-tier AI provider client (Gemini, Groq, Free Deterministic Fallback)
    routers/
      ai_insights.py      → FastAPI endpoint POST /api/v1/ai/insights
  tests/
    test_ai_client.py     → Unit tests for schema validation, guardrails, and free fallbacks
```

---

## Code Style & Conventions

- Asynchronous client methods with clear error handling and type hints.
- Output models strictly typed with Pydantic Field descriptions and constraints.
- Educational persona: Objective, constructive, non-judgmental, quantitative.

```python
# Example: Structured Output Contract
class LeakDiagnosis(BaseModel):
    leak_type: str = Field(..., description="Classification of the behavioral leak")
    severity: Literal["CRITICAL", "HIGH", "MODERATE", "LOW"]
    title: str = Field(..., description="Clean plain-English heading")
    diagnosis: str = Field(..., description="Explanation of how this behavior impacted P&L")
    evidence: str = Field(..., description="Exact numerical proof from stats")

class SuggestedRuleRecommendation(BaseModel):
    rule_id: str = Field(..., description="Catalog rule identifier")
    rule_name: str = Field(..., description="Human-readable rule title")
    rationale: str = Field(..., description="Why this guardrail stops the leak")
    recommended_parameters: dict[str, Any] = Field(default_factory=dict)

class InsightReport(BaseModel):
    overall_summary: str
    discipline_grade: str
    discipline_score: int
    top_leaks: list[LeakDiagnosis]
    suggested_rules: list[SuggestedRuleRecommendation]
    educational_disclaimer: str
```

---

## Testing Strategy

- **Test Framework**: `pytest` in `services/analytics/tests/test_ai_client.py`.
- **Test Scenarios**:
  1. **Prompt Guardrail Enforcement**:
     - System prompt explicitly contains anti-advice and no-prediction directives.
     - Prompt rejects passing raw trade fills (validates that only aggregate stats are formatted).
  2. **Deterministic Free Fallback**:
     - Generates valid, complete `InsightReport` when no API keys are configured.
     - Output validates 100% against Pydantic schema without network calls.
  3. **Schema Compliance & JSON Parsing**:
     - Validates handling of valid structured JSON.
     - Validates retry behavior on malformed JSON or markdown code block wrapping (` ```json `).
  4. **Rate Limit / Error Recovery**:
     - Simulates HTTP 429 / 500 from cloud API and verifies seamless fallback to deterministic insights.

---

## Boundaries

- **Always do**:
  - Enforce the educational disclaimer on every response.
  - Keep AI usage 100% free with the deterministic fallback option.
  - Validate output strictly against `InsightReport` Pydantic model.
  - Run `pytest` before finalizing.
- **Ask first**:
  - Adding paid-only AI provider dependencies.
  - Changing the output JSON schema contract.
- **Never do**:
  - Never generate trade recommendations (e.g. "Buy Reliance", "Short Nifty").
  - Never predict price targets or future market directions.
  - Never send raw individual trade fills or personal user data to external LLMs.

---

## Success Criteria

1. `schemas.py` defines strict Pydantic v2 models for inputs, diagnoses, rule suggestions, and reports.
2. `prompts.py` builds guardrailed prompts preventing financial advice.
3. `client.py` supports free cloud LLMs (Gemini / Groq) and 100% free offline deterministic generation.
4. `test_ai_client.py` passes with 100% assertion coverage.
5. All 149 existing backend tests continue to pass without regression.
