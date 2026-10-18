# Spec: Task 17 - Numeric Grounding Validation & Insight Caching Layer

## Assumptions & Design Decisions (Post Code-Review)

1. **Anti-Hallucination Numeric Grounding Validator (`app/ai/grounding.py`)**:
   - The AI's diagnostic text (`diagnosis`, `evidence`, `rationale`, `estimated_improvement`) will cite numerical claims, percentages, and monetary amounts (e.g., `42.5%`, `₹12,500`, `3 trades`, `15 minutes`).
   - We extract all numbers using regex and AST tokenization, and verify them against the ground-truth metrics dictionary from Tasks 11 & 12 within a strict **2% tolerance margin** (e.g. 42.5% vs 43% is acceptable, but citing 75% when the true win rate is 41% is flagged as a hallucination).
   - Standard rule catalog defaults (e.g., 15, 30, 45, 60 minutes cool-off; 2, 3, 5 max trades; 1%, 2% max risk) and structural ordinals (1, 2, 3) are allowed without being treated as hallucinated numbers.
   - Financial formatting support: Handles commas (`12,500`), currency symbols (`₹`, `Rs.`), percentages (`%`), and absolute values (matching loss of ₹4,500 against `-4500.00`).
   - Non-metric filters: Ignores calendar years (`2024`, `2025`, `2026`) and standard market operating hours (`09:15`, `15:30`, `9:15`) so timestamps are not flagged as performance claims.
   - If an ungrounded number is detected (>2% deviation), the validator rejects the LLM response and falls back to the deterministic behavioral engine (guaranteeing 100% mathematical accuracy).
2. **Deterministic Dataset Fingerprinting (`stats_hash`)**:
   - The input statistics dictionary is canonicalized (keys sorted recursively, floats formatted consistently) and hashed with SHA-256.
   - If an identical dataset is queried again, the cached report is returned in <5ms without making an external AI API call or consuming rate quotas.
3. **Hybrid Database Persistence with In-Memory Fallback**:
   - Connects to PostgreSQL `insights` and `ai_usage` tables when PostgreSQL is running using parameterized SQL queries.
   - Automatically falls back to an in-memory LRU/TTL cache during unit tests or when PostgreSQL is unreachable, ensuring 100% local testability without Docker.
4. **Rate Limiting & Cost Control**:
   - Enforces a daily quota of **20 insight requests per trader per day** to protect free-tier API quotas (Gemini / Groq).
   - Cost in USD is recorded as $0.0000 for free tier and deterministic engine.
5. **Schema Enhancements (`app/ai/schemas.py`)**:
   - `InsightRequest`: includes optional `user_id: str = "anonymous_trader"`.
   - `InsightReport`: includes `cached: bool = False`, `stats_hash: str | None = None`, and `grounding_verified: bool = True`.
   - `GroundingResult`: captures `is_valid: bool`, `extracted_numbers: list[float]`, `matched_numbers: list[float]`, `discrepancies: list[str]`.

---

## Objective

Build a bulletproof anti-hallucination verification layer and high-performance caching engine for the TradeLens AI insights pipeline (`services/analytics/app/ai/`):
- Cross-check every number cited in AI text against real computed statistics to prevent financial misinformation.
- Eliminate redundant external LLM calls and avoid rate limits by caching insight reports keyed by `user_id` and SHA-256 `stats_hash`.
- Track token usage and enforce daily user quotas.

---

## Tech Stack

- **Language / Framework**: Python 3.11+, FastAPI
- **Data Validation**: Pydantic v2
- **Hashing**: Standard library `hashlib.sha256`
- **Text Analysis**: Standard library `re`
- **Database**: `psycopg>=3.1.0` (connecting to PostgreSQL `insights` and `ai_usage` tables) with memory LRU fallback
- **Testing**: `pytest>=8.0.0` with `pytest-asyncio`
- **Typing & Linting**: `mypy` (strict mode), `ruff`

---

## Commands

```powershell
# Run Task 17 unit and integration tests
services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests/test_grounding.py -v

# Run all backend tests
services\analytics\.venv\Scripts\python.exe -m pytest services/analytics/tests

# Type checking
services\analytics\.venv\Scripts\python.exe -m mypy services/analytics/app/ai

# Linting
services\analytics\.venv\Scripts\python.exe -m ruff check services/analytics/app/ai services/analytics/tests/test_grounding.py
```

---

## Project Structure

```
services/analytics/
  app/
    ai/
      __init__.py
      schemas.py          → Extended with GroundingResult and cache metadata
      prompts.py          → Prompt engineering (Task 16)
      client.py           → LLM provider client (Task 16)
      grounding.py        → Anti-hallucination numeric validator & metric extractor
      cache.py            → SHA-256 fingerprinting, PostgreSQL persistence & rate limiter
    routers/
      ai_insights.py      → Updated endpoint integrating caching, rate limits, and grounding
  tests/
    test_grounding.py     → Unit and integration tests for numeric grounding, cache, and rate caps
```

---

## Code Style & Conventions

- Functional, pure-Python number extraction and comparison.
- Strict Pydantic models for validation results.
- Clean tolerance formulas handling both relative and small absolute differences.

---

## Testing Strategy

- **Test Suite**: `services/analytics/tests/test_grounding.py`
- **Key Test Cases**:
  1. `test_grounding_passes_for_accurate_metrics`: Validates that accurate win rate, profit, and leak metrics pass.
  2. `test_grounding_rejects_hallucinated_figures`: Confirms that invented numbers (>2% deviation) are flagged and rejected.
  3. `test_grounding_allows_catalog_rule_constants`: Verifies standard rule suggestions (e.g. 30 min cool-off) are not flagged.
  4. `test_stats_hash_is_deterministic`: Ensures dictionary key ordering does not alter SHA-256 fingerprint.
  5. `test_cache_hit_bypasses_llm`: Verifies duplicate requests return from cache in <5ms without invoking external LLMs.
  6. `test_daily_rate_limiter`: Confirms that exceeding 20 requests/day per user raises HTTP 429.
  7. `test_automatic_fallback_on_grounding_failure`: Asserts that an ungrounded LLM response automatically falls back to the deterministic report.

---

## Boundaries

- **Always do**:
  - Require every cited financial figure to match ground-truth within 2% margin.
  - Reject hallucinated AI responses and fall back to mathematically verified deterministic engine.
  - Return cached reports whenever `stats_hash` matches.
  - Ensure test suite passes with 0 failures without requiring a live PostgreSQL instance.
- **Ask first**:
  - Changing the daily rate limit threshold (default: 20 calls/day).
  - Widening the grounding tolerance beyond 2%.
- **Never do**:
  - Never allow an unverified or hallucinated number into the trader's behavioral report.
  - Never make redundant external LLM calls for an unchanged tradebook.

---

## Success Criteria

1. Numeric grounding validator correctly extracts and validates numbers against `InsightRequest.stats`.
2. Hallucinated numbers (>2% discrepancy) trigger automatic rejection and fallback to deterministic insights.
3. SHA-256 fingerprint caching returns cached reports in <5ms for unchanged datasets.
4. Rate limiter enforces a 20 requests/day quota per user.
5. All new tests pass in `pytest services/analytics/tests/test_grounding.py`.
6. Full test suite (155+ tests) and type-checking (`mypy`) pass with 0 errors.
