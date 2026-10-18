# SPEC-task17: Numeric Grounding Validation & Insight Caching Layer

- **Module**: `services/analytics/app/ai/`
- **Status**: Approved & In Implementation
- **Owner**: TradeLens Team
- **Dependencies**: Task 16 (`app/ai/client.py`, `app/ai/schemas.py`)
- **Downstream**: Task 18 (Frontend AI Insight Cards & Leak Display)

---

## 1. Problem Statement

Large Language Models (LLMs), including free-tier models (Gemini 1.5 Flash, Groq Llama 3.3), are prone to numeric hallucination. In a financial and trading psychology platform, displaying fabricated loss figures (e.g. citing a ₹50,000 loss when the trader only lost ₹8,000) destroys user trust and introduces serious compliance liability.

Furthermore, running repeated inference requests on unchanged trading datasets wastes API quotas, increases latency, and risks hitting provider rate limits.

---

## 2. Solution Architecture

```
                       POST /api/v1/ai/insights
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    Compute SHA-256 `stats_hash`     │
               └──────────────────┬──────────────────┘
                                  │
                       Cache Hit? │
                   ┌──────────────┴──────────────┐
                   │ Yes                         │ No
                   ▼                             ▼
       ┌──────────────────────┐      ┌───────────────────────┐
       │ Return Cached Report │      │ Check Daily Rate Limit│
       └──────────────────────┘      └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │ Invoke AIClient (LLM) │
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │ GroundingValidator    │
                                     │ (Cross-check numbers) │
                                     └───────────┬───────────┘
                                                 │
                                      Pass?      │
                         ┌───────────────────────┴───────────────────────┐
                         │ Yes                                           │ No (Hallucination Detected)
                         ▼                                               ▼
             ┌────────────────────────┐                     ┌────────────────────────┐
             │ Store Report in Cache  │                     │ Fallback to 100%       │
             │ & Log Token Usage      │                     │ Grounded Deterministic │
             └───────────┬────────────┘                     │ Engine & Store in Cache│
                         │                                  └───────────┬────────────┘
                         └───────────────────┬──────────────────────────┘
                                             ▼
                                  Return Verified Report
```

---

## 3. Detailed Specifications

### 3.1. Numeric Grounding Validator (`app/ai/grounding.py`)

- **Number Extraction**:
  - Regular expressions to capture integers, floats, percentages (`50%`), and Indian Rupee / currency figures (`₹12,450`, `12.5k`, `1.2 Lakh`).
  - Text fields scrutinized: `diagnosis`, `evidence`, `rationale`, `estimated_improvement`.
- **Ground Truth Catalog**:
  - All numeric values present in `InsightRequest.stats` (scalars, nested lists, and dicts).
  - Standard behavioral catalog parameters (cool-off minutes: 15, 30, 45, 60; daily trade limits: 1, 2, 3, 5, 10; risk percentages: 1%, 2%, 3%, 5%).
  - Structural ordinals (1, 2, 3, 4, 5).
- **Matching Rules**:
  - A numerical claim is grounded if:
    $$\frac{|n_{\text{claimed}} - n_{\text{truth}}|}{\max(|n_{\text{truth}}|, 1e-6)} \le 0.02 \quad (\text{i.e. within } 2\%)$$
  - For small numbers ($\le 1.0$), absolute difference $|n_{\text{claimed}} - n_{\text{truth}}| \le 0.05$.
- **Validation Outcome**:
  - If any claimed number is not grounded in truth or catalog defaults, `is_valid` is `False`.
  - Discrepancy details are recorded in `discrepancies: list[str]`.

### 3.2. Caching & Quota Tracking (`app/ai/cache.py`)

- **Dataset Fingerprinting**:
  - `compute_stats_hash(user_id: str, stats: dict[str, Any]) -> str`
  - Normalized JSON with alphabetically sorted keys and float precision formatting.
- **Cache Store**:
  - Integrates with PostgreSQL tables `insights` and `ai_usage`.
  - Built-in In-Memory LRU Cache with TTL fallback for offline and testing environments.
- **Rate Limiting**:
  - `check_rate_limit(user_id: str, max_daily_calls: int = 20) -> bool`
  - Prevents abuse and quota exhaustion.

---

## 4. Acceptance Criteria

1. Extract all numbers from AI explanation text and verify within 2% margin.
2. Flag, reject, and recover from hallucinated numbers by falling back to the 100% grounded deterministic engine.
3. Cache insights keyed by `user_id` and SHA-256 `stats_hash`.
4. Enforce daily rate caps in `ai_usage`.
5. 100% passing test suite across `test_grounding.py` and `test_ai_client.py`.
