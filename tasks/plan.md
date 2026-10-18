# Implementation Plan: TradeLens (Trade Journal & Rule Backtester)

## Overview
TradeLens is an educational behavioral analytics and rule backtesting web application for retail traders in India. Users upload broker trade history (starting with Zerodha and custom column CSVs), receive deterministic P&L calculations and behavioral leak identification (overtrading, revenge trading, size creep, holding losers), receive plain-language AI explanations grounded in computed numbers, and convert identified leaks into trading rules from a fixed catalog. A deterministic replay engine runs backtests on their own past trades (including a 70/30 train/test overfitting split) to quantify before/after impact without giving market trade recommendations.

Tasks are tracked in `tasks/todo.md`.

## Architecture Decisions
- **Next.js (App Router, TypeScript, Tailwind CSS) Frontend**: Provides responsive UI, server components, and interactive data visualization using Recharts and Lightweight Charts for equity curves.
- **FastAPI (Python, pandas, Pydantic) Analytics Engine**: Implements strictly deterministic trade parsing, FIFO fill pairing, Indian statutory charge calculations (STT, GST, stamp duty, exchange turnover), metrics, and rule replay simulation.
- **Supabase (PostgreSQL, Supabase Auth, Storage, Row-Level Security)**: Multi-tenant security with RLS enabled on all user tables (`profiles`, `imports`, `raw_fills`, `trades`, `rules`, `rule_runs`, etc.) to guarantee zero cross-user data leakage.
- **Claude API with Strict Structured JSON & Grounding Verification**: AI writes natural language explanations and proposes rules but never computes P&L. Every numeric claim in the AI's explanation is verified against the backend's computed statistics before reaching the user.
- **Fixed Catalog Rule Engine**: Rules are strictly constrained to an approved catalog (e.g. cooldown after loss, daily loss cutoff, max trades per day, position limits, expiry day exclusion) ensuring safety and predictability.
- **Background Worker & Transactional Email**: Celery/RQ or scheduled worker for large file processing and weekly performance summaries delivered via Resend.

## Task List Summary

### Phase 1: Foundation, Infrastructure & Database Setup
- [x] Task 1: Monorepo workspace initialization & service skeletons
- [x] Task 2: Supabase database schema & Row-Level Security (RLS) policies
- [x] Task 3: Authentication and user profile onboarding flow
- [x] Checkpoint 1: Foundation & Auth verified

### Phase 2: Trade Import & Ingestion Pipeline
- [ ] Task 4: Secure CSV upload API & storage handler
- [ ] Task 5: Broker CSV parser (Zerodha tradebook & custom column mapper)
- [ ] Task 6: Ingestion validation report & trade ID deduplication
- [ ] Checkpoint 2: Ingestion pipeline verified

### Phase 3: Deterministic Trade Pairing & P&L Engine
- [x] Task 7: Instrument normalization (Equity, Futures, Options CE/PE, strike, lot size)
- [x] Task 8: FIFO trade fill pairing engine (partial fills, scaling, short sales)
- [x] Task 9: Indian statutory charges & tax computation engine
- [x] Checkpoint 3: Pairing & charges verified


### Phase 4: Accuracy Reconciliation & Core Metrics
- [x] Task 10: Broker statement reconciliation & discrepancy reporting
- [ ] Task 11: Core trading performance metrics computation engine
- [ ] Task 12: Behavioral leak metrics computation (revenge trading, overtrading, size creep)
- [ ] Checkpoint 4: Analytics & behavioral engine verified

### Phase 5: Trader Dashboard & Visualizations
- [ ] Task 13: Summary metric cards & Indian number formatting (₹ Lakhs/Crores)
- [ ] Task 14: Interactive equity curve & drawdown visualizer
- [ ] Task 15: P&L breakdowns, calendar heatmap & filterable trade log table
- [ ] Checkpoint 5: Dashboard experience verified

### Phase 6: AI Behavioral Insights Engine
- [ ] Task 16: Structured AI prompt pipeline & Claude API client with guardrails
- [ ] Task 17: Numeric grounding validation & insight caching layer
- [ ] Task 18: Frontend AI insight cards & leak display
- [ ] Checkpoint 6: AI insights verified

### Phase 7: Rule Lab & Deterministic Backtester
- [ ] Task 19: Fixed rule catalog definition & validator
- [ ] Task 20: Natural language to JSON rule translator
- [ ] Task 21: Deterministic trade replay engine & 70/30 train/test split
- [ ] Checkpoint 7: Rule replay engine verified

### Phase 8: Rule Lab UI & Rulebook Adherence
- [ ] Task 22: Rule Lab interactive interface & backtest runner
- [ ] Task 23: Saved rulebook & import adherence tracker
- [ ] Checkpoint 8: Rule Lab & adherence verified

### Phase 9: Coach Dashboard & Team Features
- [ ] Task 24: Coach-trader organization & permission consent model
- [ ] Task 25: Coach cohort dashboard with traffic-light risk flags
- [ ] Checkpoint 9: Coach & collaboration verified

### Phase 10: Reports, Data Control & Production Hardening
- [ ] Task 26: Automated weekly report engine & PDF/email delivery
- [ ] Task 27: Privacy, data export & account/import deletion
- [ ] Task 28: Security audit, cross-user RLS penetration tests & monitoring
- [ ] Checkpoint 10: Launch readiness verified

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Inaccurate P&L or charges** | High | Comprehensive unit tests with known edge cases; real sample broker reconciliation tests; editable charge rates; visible discrepancy explainer screen. |
| **Cross-user data leakage** | Critical | Enforce Supabase Row-Level Security on every table; automated penetration tests asserting user A cannot query user B records. |
| **Broker CSV format variations** | High | Auto-detection heuristic with robust fallback column mapping UI; validation report detailing unparsed rows. |
| **AI hallucinating figures or giving trade advice** | High | AI never computes P&L; numeric grounding assertion matches text figures against stats; system prompt forbids buy/sell predictions. |
| **AI cost explosion / latency** | Medium | Send only pre-computed summary stats (never raw trades); cache generated insights; enforce per-user daily token limits. |
| **Misleading rule backtest expectations** | Medium | Prominent approximation warnings; minimum sample size notices (< 30 trades); 70/30 in-sample vs out-of-sample validation. |

## Open Questions
- What specific initial sample files and matching broker P&L statements (e.g. Zerodha Equity & F&O) will be provided for baseline reconciliation testing?
- Is the Coach Dashboard required for the MVP launch, or can it be toggled behind a feature flag for single-trader users?
- What are the preferred rate limits and daily AI insight quotas per user?
