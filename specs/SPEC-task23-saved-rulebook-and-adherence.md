# Spec: Task 23 - Saved Rulebook & Import Adherence Tracker

## Objective

Build the personal Trading Rulebook and automated post-import adherence tracking pipeline for TradeLens. 

While Task 21 & Task 22 enabled traders to backtest counterfactual rules in the Rule Lab sandbox, traders currently lack a mechanism to **persist activated rules** into their active portfolio and **measure post-import execution discipline**.

This feature enables traders to:
1. **Save Verified Rules**: Convert tested rules from Rule Lab into persistent, active portfolio guardrails saved in PostgreSQL (`rules` table).
2. **Rulebook Management Interface**: View, toggle (active/paused), and delete rules with clear behavioral intent, parameter summaries, and historical backtest references at `/rules`.
3. **Automated Post-Import Adherence Evaluation**: Automatically evaluate newly uploaded trade files against all active rules in the user's rulebook, identifying exact rule breaches without human guesswork.
4. **Discipline & Adherence Scorecard**: Compute the trader's net **Discipline Adherence Score** (`% of trades honoring active rules`) and surface violation tags on the Trade Journal ledger and Dashboard ribbon.

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, Lucide React icons
- **State & Data Fetching**: React Server Actions, Supabase Client (`@supabase/ssr`), SWR / React Hooks
- **Backend Analytics Engine**: Python 3.11, FastAPI, Pydantic v2
- **Database**: PostgreSQL 15 (Supabase), Row-Level Security (RLS) policies on `rules` and `rule_runs`
- **Testing**: Vitest (`apps/web`), Pytest (`services/analytics`)

---

## Commands

```bash
# Web Frontend
Test: npm test --prefix apps/web
Build: npm run build --prefix apps/web
Lint: npm run lint --prefix apps/web

# Python Analytics Service
Test: poetry run pytest services/analytics/tests/test_adherence.py
Lint: poetry run ruff check services/analytics
Typecheck: poetry run mypy services/analytics
```

---

## Project Structure

```
apps/web/
  app/(dashboard)/
    rules/
      page.tsx                          # Dedicated Rulebook Manager page (/rules)
    rule-lab/
      page.tsx                          # Integrates Save-to-Rulebook action
    imports/
      page.tsx                          # Displays post-import adherence card
    dashboard/
      page.tsx                          # Surfaces Discipline Adherence Scorecard
  components/
    rules/
      rulebook-list.tsx                 # List of active & paused rules
      rule-card.tsx                     # Individual rule card with toggle & delete
      adherence-badge.tsx               # Visual pill for trade table rows
      adherence-scorecard.tsx           # High-level discipline KPI card
    dashboard/
      DashboardNav.tsx                  # Adds 'Rulebook' link to main nav
  lib/
    rules/
      rulebook-actions.ts               # Server actions for CRUD on rules table (with mock fallback)
      adherence-types.ts                # TypeScript interfaces for adherence reports
      adherence-evaluator.ts            # Client/Node deterministic adherence evaluator fallback

services/analytics/
  app/
    rules/
      adherence.py                      # Multi-rule adherence evaluation engine
    routers/
      rules.py                          # POST /rules/adherence/evaluate endpoint
  tests/
    test_adherence.py                   # Pytest test suite for adherence engine
```

---

## Data Contract & Schema

### PostgreSQL Schema (`rules` table - existing)
```sql
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,                    -- e.g. "COOL_OFF_AFTER_LOSS"
    rule_payload JSONB NOT NULL,                -- e.g. {"cooldown_minutes": 20, "loss_threshold": 1500}
    natural_language_text TEXT,                 -- e.g. "Pause 20m after any loss > ₹1,500"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Adherence Report Model (Python / Pydantic)
```python
class TradeViolation(BaseModel):
    trade_id: str
    symbol: str
    entry_time: datetime
    rule_id: str
    rule_type: str
    violation_code: str
    penalty_pnl: float                          # Net loss of the violating trade
    explanation: str

class RuleAdherenceStat(BaseModel):
    rule_id: str
    rule_type: str
    is_active: bool
    total_evaluations: int
    violations_count: int
    adherence_pct: float
    avoidable_loss_incurred: float

class AdherenceReport(BaseModel):
    total_trades_evaluated: int
    total_adhering_trades: int
    total_violating_trades: int
    discipline_score_pct: float                 # (adhering / total) * 100
    total_avoidable_losses_incurred: float       # Sum of losses from violating trades
    violations: List[TradeViolation]
    rules_breakdown: List[RuleAdherenceStat]
    evaluated_at: datetime
```

---

## Code Style & Conventions

- **Frontend**: Clean institutional finance aesthetic matching TradeLens design system. No jumpy hover translations or nested box soup. Strict TypeScript typing, no `any`.
- **Backend**: Pure deterministic single-pass evaluation with explicit timezone awareness (default `Asia/Kolkata`). Pydantic v2 schemas for all inputs/outputs.
- **Offline / Mock Fallback**: All web server actions and adherence calls must gracefully fall back to local in-memory storage if Supabase credentials or the Python analytics service are unreachable, ensuring tests and local development never fail.

---

## Testing Strategy

1. **Backend (`services/analytics/tests/test_adherence.py`)**:
   - Test evaluating trades with zero violations (100% adherence score).
   - Test detecting cooldown breach: entry 3 minutes after loss > ₹1,500 violates `COOL_OFF_AFTER_LOSS`.
   - Test session trade cap: trade 5 on a session with `max_trades=4` is flagged as violation.
   - Test daily loss cutoff: trades executed after cumulative daily loss reaches -₹5,000 are flagged.
   - Test max position size: trade exceeding allowed lots/quantity is flagged.
   - Test paused rules (`is_active=False`): ensure paused rules are skipped and do not penalize adherence score.

2. **Frontend (`apps/web/tests/rulebook.test.tsx`)**:
   - Test rendering Rulebook page with empty and populated states.
   - Test toggle switch updates `is_active` state.
   - Test adherence scorecard displays discipline percentage and avoidable loss metrics.
   - Test trade log rows render violation badges when trade ID is in violation list.

---

## Boundaries

- **Always do:**
  - Order trades chronologically before running adherence checks.
  - Enforce Supabase Row-Level Security (`auth.uid() = user_id`) on all rule CRUD queries.
  - Keep adherence calculation deterministic and independent of AI LLM latency.
  - Run full test suites (`npm test` and `pytest`) before finalizing changes.

- **Ask first:**
  - Modifying the existing PostgreSQL database schema columns or foreign key constraints.
  - Adding third-party charting or state management packages.

- **Never do:**
  - Allow users to view or modify rules belonging to other tenants.
  - Calculate adherence asynchronously in a way that blocks tradebook CSV uploads.
  - Introduce layout-shifting or flickering animations on navigation.

---

## Success Criteria

1. **Save to Rulebook**: Clicking "Save to Rulebook" in Rule Lab saves the rule to the database and displays success feedback.
2. **Rulebook UI (`/rules`)**: User can view all saved rules, toggle active/paused status, and delete rules with clean responsive UI.
3. **Adherence Engine**: Analytics engine evaluates uploaded trades against active rules and returns violation list with avoidable loss tally.
4. **Visual Indicators**: Trades that violated rules display a distinct violation badge on the Trade Journal log.
5. **Scorecard**: Dashboard and imports summary show Discipline Score (e.g., `85% Adherence • ₹7,200 Avoidable Losses`).
6. **Zero Regressions**: 117+ Vitest tests and all Pytest tests pass cleanly; Next.js builds with 0 errors across 15+ routes.

---

## Resolved Architectural Decisions

1. **Navigation Placement**: Added **Rulebook** as a first-class navigation item in `DashboardNav.tsx` (`/rules`).
2. **Discipline Score Metric**: Primary score is pure execution count adherence (`(adhering_trades / total_trades) * 100%`); secondary metric is avoidable loss sum (`total_avoidable_losses_incurred`).
3. **Resilience**: Client-side TypeScript evaluator mirrors Python adherence engine for offline and mock demonstration fidelity.
