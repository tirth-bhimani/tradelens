
# Tasks: TradeLens (Trade Journal & Rule Backtester)

## Phase 1: Foundation, Infrastructure & Database Setup

## Task 1: Monorepo workspace initialization & service skeletons

**Description:** Set up the monorepo structure containing the Next.js frontend application (`apps/web`), the FastAPI Python analytics service (`services/analytics`), shared configuration, environment templates, and local development orchestration with docker-compose.

**Acceptance criteria:**
- [x] Monorepo workspace configuration links `apps/web` and `services/analytics` with root package scripts
- [x] Next.js 14+ application bootstraps with TypeScript, Tailwind CSS, and App Router
- [x] FastAPI backend initializes with health check endpoint (`/healthz`), Poetry/pyproject dependencies, and Pydantic v2 settings
- [x] Docker Compose file runs local PostgreSQL / Supabase emulation for offline development

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_health.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Access `http://localhost:8000/healthz` and verify `{"status": "ok"}` response

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `apps/web/package.json`
- `apps/web/app/page.tsx`
- `services/analytics/pyproject.toml`
- `services/analytics/app/main.py`
- `docker-compose.yml`

**Estimated scope:** Medium (3-5 files)

---

## Task 2: Supabase database schema & Row-Level Security (RLS) policies

**Description:** Define and apply initial database migrations for PostgreSQL in Supabase covering core tables (`profiles`, `organizations`, `imports`, `raw_fills`, `trades`, `charge_rates`, `stats_snapshots`, `rules`, `rule_runs`, `audit_log`, `ai_usage`) with strict Row-Level Security (RLS) enabled on every tenant table.

**Acceptance criteria:**
- [x] Migration creates all tables specified in Section 8 of the Project Plan with primary keys, indexes, and foreign keys
- [x] RLS is enabled on all user-facing tables with `auth.uid() = user_id` policies for SELECT, INSERT, UPDATE, DELETE
- [x] Public `charge_rates` table seeded with default Indian statutory fees (STT, GST, Exchange charges, Stamp duty)
- [x] Database test or seed script verifies that unauthorized queries cannot bypass RLS

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_db_schema.py`
- [x] Build succeeds: Docker PostgreSQL schema applied with zero errors
- [x] Manual check: Run `SELECT * FROM pg_tables WHERE schemaname = 'public'` and verify RLS is enabled on each table

**Dependencies:** Task 1

**Files likely touched:**
- `supabase/migrations/20261012000001_initial_schema.sql`
- `supabase/migrations/20261012000002_rls_policies.sql`
- `supabase/seed.sql`
- `services/analytics/tests/test_db_schema.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 3: Authentication and user profile onboarding flow

**Description:** Implement user authentication in Next.js using Supabase Auth (Email + Password and Google OAuth), email verification redirection, and an onboarding profile screen to capture timezone (default IST), trading segments, and starting capital.

**Acceptance criteria:**
- [x] Email/password signup, login, password reset, and Google OAuth callbacks work cleanly
- [x] New user signup triggers creation of corresponding `profiles` row
- [x] Onboarding wizard collects user display name, timezone (defaulting to Asia/Kolkata), active segments (Equity, F&O), and starting capital
- [x] Protected route middleware redirects unauthenticated users to `/login` and un-onboarded users to `/onboarding`

**Verification:**
- [x] Tests pass: `npm run test -- apps/web/tests/auth.test.ts`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Register a test account, check user redirect to onboarding, and verify `profiles` row saved with `timezone = 'Asia/Kolkata'`

**Dependencies:** Task 2

**Files likely touched:**
- `apps/web/lib/supabase/client.ts`
- `apps/web/lib/supabase/server.ts`
- `apps/web/middleware.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/onboarding/page.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Foundation & Auth
- [x] All database migrations apply cleanly with RLS active
- [x] Frontend builds without TypeScript or styling errors
- [x] User can sign up, log in, complete onboarding, and load an empty dashboard
- [x] Review with team before proceeding

---

## Phase 2: Trade Import & Ingestion Pipeline

## Task 4: Secure CSV upload API & storage handler

**Description:** Build the frontend file drag-and-drop component and backend upload handler that streams CSV files into a private Supabase Storage bucket, applies file size/type constraints, and sanitizes against CSV formula injection (`=`, `+`, `-`, `@`).

**Acceptance criteria:**
- [x] File dropzone accepts `.csv` files up to 25MB with upload progress indicator
- [x] Uploaded file is saved in private bucket with path `<user_id>/<import_id>.csv` accessible only via signed URLs
- [x] CSV injection protection sanitizes or flags cells beginning with `=`, `+`, `-`, or `@`
- [x] New record created in `imports` table with status `uploaded`

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_upload.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Upload a sample CSV file and verify storage entry and `imports` database row created

**Dependencies:** Task 3

**Files likely touched:**
- `apps/web/components/trades/file-dropzone.tsx`
- `apps/web/app/api/trades/upload/route.ts`
- `services/analytics/app/routers/upload.py`
- `services/analytics/app/security/sanitizer.py`
- `services/analytics/tests/test_upload.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 5: General-purpose trade CSV parser (Universal column inference & multi-broker support)

**Description:** Implement a broker-agnostic, general-purpose tradebook CSV parsing engine in Python that automatically detects and maps column headers across any broker export (Groww, Upstox, Angel One, ICICI Direct, Kotak, Zerodha, Dhan, Fyers, Finvasia, Interactive Brokers) or custom trading spreadsheet, normalizes dates, times, symbols, transaction types (BUY/SELL), quantities, and trade prices into a standardized fill schema with IST timezone awareness, and supports custom column mappings.

**Acceptance criteria:**
- [x] Universal column inference automatically maps standard trade columns (date, time, symbol, trade type, quantity, price, trade ID, order ID) across any broker or custom CSV
- [x] Known broker formats (Zerodha, Groww, Upstox, Angel One, Dhan, etc.) recognized seamlessly
- [x] Custom column mapper parses arbitrary spreadsheets given explicit column mappings
- [x] Fills are extracted into typed Pydantic models (`RawFillCreate`) with normalized timestamps in IST (`Asia/Kolkata` / `+05:30`) and deterministic fallback trade IDs
- [x] Comprehensive unit tests pass across multiple broker formats, custom mappings, and corrupt row isolation

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_parsers.py`
- [x] Build succeeds: `mypy services/analytics/app/parsers`
- [x] Manual check: Run parser against sample tradebook files and inspect parsed fill records

**Dependencies:** Task 4

**Files likely touched:**
- `services/analytics/app/parsers/base.py`
- `services/analytics/app/parsers/universal.py`
- `services/analytics/app/parsers/custom_mapper.py`
- `services/analytics/app/parsers/zerodha.py`
- `services/analytics/app/parsers/normalizer.py`
- `services/analytics/app/models/fills.py`
- `services/analytics/tests/test_parsers.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 6: Ingestion validation report & trade ID deduplication

**Description:** Build the ingestion validation service and UI report that records fills into `raw_fills`, computes unique fill hashes/trade IDs to prevent duplicate imports, records invalid or skipped rows with explicit error reasons, and displays a summary modal to the user.

**Acceptance criteria:**
- [x] Fill deduplication detects existing trade IDs or duplicate fill fingerprints and skips double-counting
- [x] Skipped or malformed rows are stored with row number and reason in the `imports` error report JSON
- [x] UI displays an Import Summary modal: total rows, imported count, skipped count, and expandable error details
- [x] User has the ability to delete an individual import run, which removes its associated fills

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_ingestion_validator.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Re-upload the exact same CSV and verify that duplicate rows are skipped and reported

**Dependencies:** Task 5

**Files likely touched:**
- `services/analytics/app/ingestion/validator.py`
- `apps/web/components/trades/import-summary-modal.tsx`
- `apps/web/app/(dashboard)/imports/page.tsx`
- `services/analytics/tests/test_ingestion_validator.py`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Ingestion Pipeline
- [x] CSV uploads store securely in private bucket
- [x] Universal broker and custom CSVs parse into normalized fills
- [ ] Duplicate uploads are cleanly detected and reported
- [ ] Review with team before proceeding

---

## Phase 3: Deterministic Trade Pairing & P&L Engine

## Task 7: Instrument normalization engine

**Description:** Build the instrument parser and classifier to normalize Indian market symbols into structured metadata: instrument type (Equity, Futures, Options CE/PE), underlying symbol, expiry date, strike price, and standard exchange lot sizes.

**Acceptance criteria:**
- [x] Parses standard Indian ticker patterns (e.g., `NIFTY24OCT25000CE`, `BANKNIFTY24NOVFUT`, `RELIANCE`)
- [x] Extracts option type (`CE` / `PE`), strike price, and expiry timestamp accurately
- [x] Applies correct lot sizes for F&O contracts according to effective date schedule
- [x] Gracefully flags unrecognized instrument formats for user review without crashing

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_instruments.py`
- [x] Build succeeds: `mypy services/analytics/app/engine/instruments.py`
- [x] Manual check: Test with 20 real F&O and equity symbols and assert 100% correct classification

**Dependencies:** Task 6

**Files likely touched:**
- `services/analytics/app/engine/instruments.py`
- `services/analytics/app/models/instruments.py`
- `services/analytics/tests/test_instruments.py`

**Estimated scope:** Small (1-2 files)

---

## Task 8: FIFO trade fill pairing engine

**Description:** Build the core trade pairing engine in Python using First-In-First-Out (FIFO) matching to pair individual buy and sell fills into closed round-trip `trades`, handling partial fills, scaling in/out, short-selling (open sell, close buy), and intraday vs positional categorization.

**Acceptance criteria:**
- [x] Matches buys and sells in strict chronological order using FIFO lot accounting
- [x] Supports partial fills (e.g. buy 100, sell 40, sell 60) and multiple scale-ins
- [x] Correctly identifies short trades opened by sell and closed by buy
- [x] Categorizes trades into intraday (opened and closed on same calendar day) vs positional
- [x] Flags unmatched open positions and edge cases (bonus, split, expiry settlement) for review

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_pairing.py`
- [x] Build succeeds: `mypy services/analytics/app/engine/pairing.py`
- [x] Manual check: Run against synthetic multi-fill trade scenarios and verify matched quantity and entry/exit timestamps

**Dependencies:** Task 7

**Files likely touched:**
- `services/analytics/app/engine/pairing.py`
- `services/analytics/app/models/trade.py`
- `services/analytics/tests/test_pairing.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 9: Indian statutory charges & tax computation engine

**Description:** Build the statutory charges calculation engine for Indian financial markets, computing Brokerage, Securities Transaction Tax (STT), Exchange Turnover Fees, SEBI turnover fees, GST (18% on brokerage + exchange fees + SEBI), and Stamp Duty using configurable rate tables per segment (Equity Delivery, Equity Intraday, Futures, Options).

**Acceptance criteria:**
- [x] Computes exact charges breakdown for each paired trade according to segment rules
- [x] Correctly applies STT (e.g. on sell side for delivery/intraday/futures, on sell side of premium for options)
- [x] Computes GST (18%) and Stamp Duty according to Indian state / exchange tariffs
- [x] Calculates Gross P&L, Total Charges, and Net P&L per trade
- [x] Allows overriding charge rates via an editable `charge_rates` configuration

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_charges.py`
- [x] Build succeeds: `mypy services/analytics/app/engine/charges.py`
- [x] Manual check: Compare TradeLens charges calculation with official Zerodha brokerage calculator figures for 5 test trades

**Dependencies:** Task 8

**Files likely touched:**
- `services/analytics/app/engine/charges.py`
- `services/analytics/app/models/charges.py`
- `services/analytics/tests/test_charges.py`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Pairing & Charges
- [x] Instrument normalization handles Equity and F&O symbols accurately
- [x] FIFO pairing accurately pairs complex multi-fill orders and short sales
- [x] Indian statutory charges match broker calculators within 1 rupee tolerance
- [x] Review with team before proceeding

---

## Phase 4: Accuracy Reconciliation & Core Metrics

## Task 10: Broker statement reconciliation & discrepancy reporting

**Description:** Build the reconciliation engine and UI that compares TradeLens computed Net P&L and charges against broker tax P&L summaries from uploaded sample statements, surfacing an itemized discrepancy report with explanations for any delta.

**Acceptance criteria:**
- [x] Backend ingestion accepts broker P&L statement summary numbers (Gross P&L, charges, Net P&L)
- [x] Reconciliation engine matches total Net P&L and per-symbol P&L against computed trades
- [x] Differences exceeding ₹1.00 are highlighted with probable causes (unmatched lots, corporate actions, stamp duty variance)
- [x] UI provides a Reconciliation View comparing App P&L vs Broker P&L side-by-side

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_reconciliation.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Run reconciliation on a test sample and verify matched green checkmarks or clear discrepancy flags

**Dependencies:** Task 9

**Files likely touched:**
- `services/analytics/app/engine/reconciliation.py`
- `apps/web/app/(dashboard)/reconciliation/page.tsx`
- `apps/web/components/reconciliation/discrepancy-card.tsx`
- `services/analytics/tests/test_reconciliation.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 11: Core trading performance metrics computation engine

**Description:** Implement deterministic computation of portfolio and trade analytics: total net P&L, win rate, average win, average loss, profit factor, expectancy, maximum drawdown (peak-to-trough in ₹ and %), longest winning streak, longest losing streak, and time-based equity curves.

**Acceptance criteria:**
- [x] Computes win rate, profit factor, win/loss ratio, and expectancy correctly across any date filter
- [x] Computes running equity curve and peak-to-trough drawdown series
- [x] Calculates consecutive win and loss streaks
- [x] Caches aggregated results in `stats_snapshots` for rapid dashboard retrieval

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_core_metrics.py`
- [x] Build succeeds: `mypy services/analytics/app/engine/core_metrics.py`
- [x] Manual check: Run against sample trade set with known win rate and drawdown; verify exact mathematical match

**Dependencies:** Task 9

**Files likely touched:**
- `services/analytics/app/analytics/core_metrics.py`
- `services/analytics/app/models/metrics.py`
- `services/analytics/tests/test_core_metrics.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 12: Behavioral leak metrics computation

**Description:** Implement deterministic detection and calculation of four major behavioral leaks: (1) Re-entry after loss (trades taken within N minutes of a loss), (2) Overtrading days (days with trade volume > 1.5x user median), (3) Position size creep (quantity increases after losing trades), and (4) Holding losers longer than winners.

**Acceptance criteria:**
- [x] Re-entry metric computes % of trades opened within 5/15/30 mins of a loss and their specific win rate and P&L
- [x] Overtrading metric flags days exceeding average trade frequency and computes P&L on those specific days
- [x] Size creep metric detects lot/quantity spikes occurring immediately following losing trades
- [x] Holding time metric computes average duration of winning vs losing trades
- [x] Outputs structured behavioral stats dictionary ready for dashboard visualization and AI explanation

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_behavior_metrics.py`
- [x] Build succeeds: `mypy services/analytics/app/engine/behavior_metrics.py`
- [x] Manual check: Verify behavioral metrics correctly isolate revenge trading on sample dataset

**Dependencies:** Task 11

**Files likely touched:**
- `services/analytics/app/analytics/behavior_metrics.py`
- `services/analytics/app/models/behavior.py`
- `services/analytics/tests/test_behavior_metrics.py`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Analytics & Behavioral Engine
- [ ] Reconciliation screen highlights broker vs app differences with explanations
- [ ] Core metrics (win rate, profit factor, drawdown) calculate with verified precision
- [ ] All 4 behavioral leak metrics produce deterministic numbers and flags
- [ ] Review with team before proceeding

---

## Phase 5: Trader Dashboard & Visualizations

## Task 13: Summary metric cards & Indian currency formatting

**Description:** Create responsive summary metric cards in Next.js displaying Net P&L, Win Rate, Profit Factor, Expectancy, Max Drawdown, and Streak stats, formatted using standard Indian numeric grouping (₹ Lakhs and Crores with ₹ symbol).

**Acceptance criteria:**
- [x] Format utility correctly converts numbers into Indian format (e.g. ₹1,50,000 and ₹2.40 Cr)
- [x] Displays Net P&L with positive/negative color coding (green/red) and badges
- [x] Displays Win Rate, Average Win/Loss ratio, Expectancy, and Max Drawdown cards
- [x] Handles zero or empty trade states gracefully with skeleton loaders and onboarding prompts

**Verification:**
- [x] Tests pass: `npm run test --prefix apps/web` (58/58 passing)
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Inspect dashboard cards and verify numbers format in Lakhs/Crores accurately

**Dependencies:** Task 11

**Files likely touched:**
- `apps/web/lib/formatters/currency.ts`
- `apps/web/components/dashboard/metrics-grid.tsx`
- `apps/web/components/dashboard/metric-card.tsx`
- `apps/web/tests/formatters.test.ts`

**Estimated scope:** Small (1-2 files)

---

## Task 14: Interactive equity curve & drawdown visualizer

**Description:** Build interactive time-series charts for cumulative Net P&L (equity curve) and peak-to-trough drawdown using Recharts or Lightweight Charts, with date range selectors and hover tooltips showing individual trade points.

**Acceptance criteria:**
- [x] Equity curve plots cumulative Net P&L over time with smooth area/line rendering
- [x] Underwater drawdown chart displays peak-to-trough drops with percentage and rupee values
- [x] Interactive tooltip shows date, daily P&L, cumulative P&L, and trade count on hover
- [x] Supports quick filters: 1W, 1M, 3M, 1Y, All Time, and custom date range picker

**Verification:**
- [x] Tests pass: `npm run test --prefix apps/web` (76/76 passing across 8 suites)
- [x] Build succeeds: `npx tsc --noEmit --project apps/web/tsconfig.json` (0 errors)
- [x] Manual check: Load 1,000 sample trades and confirm responsive chart pan/zoom without lag

**Dependencies:** Task 13

**Files likely touched:**
- `apps/web/components/dashboard/equity-chart.tsx`
- `apps/web/components/dashboard/drawdown-chart.tsx`
- `apps/web/lib/charts/chart-options.ts`

**Estimated scope:** Medium (3-5 files)

---

## Task 15: P&L breakdowns, calendar heatmap & filterable trade log table

**Description:** Build breakdown visualizations (P&L by hour of day, day of week, instrument, expiry vs non-expiry), a monthly calendar heatmap of daily P&L, and a searchable/filterable trade log table supporting manual notes and psychological tags (e.g. FOMO, Revenge, Planned).

**Acceptance criteria:**
- [x] P&L by hour-of-day bar chart reveals most profitable and most costly trading windows
- [x] Calendar heatmap shows each trading day colored by net P&L with hover detail
- [x] Trade table displays round-trip trades with sorting, symbol filtering, and segment tabs
- [x] User can add notes and tags (`FOMO`, `Revenge`, `Rule Followed`) to individual trades

**Verification:**
- [x] Tests pass: `npm run test --prefix apps/web` (89/89 passing across 10 suites)
- [x] Build succeeds: `npx tsc --noEmit --project apps/web/tsconfig.json` (0 errors)
- [x] Manual check: Click a day on the calendar heatmap to filter the trade table to that day's trades

**Dependencies:** Task 14

**Files likely touched:**
- `apps/web/components/dashboard/calendar-heatmap.tsx`
- `apps/web/components/dashboard/time-breakdown-chart.tsx`
- `apps/web/components/trades/trade-table.tsx`
- `apps/web/app/(dashboard)/trades/page.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Dashboard Experience
- [x] Metrics grid displays accurate statistics formatted in Indian Rupees (Lakhs/Crores)
- [x] Equity and drawdown charts render smoothly with date filtering
- [x] Calendar heatmap and hourly breakdown highlight trading patterns
- [x] User can tag trades with psychological annotations
- [x] Review with team before proceeding

---

## Phase 6: AI Behavioral Insights Engine

## Task 16: Structured AI prompt pipeline & free-tier LLM client with guardrails

**Description:** Build the AI insight generator using free-tier LLMs (Google Gemini 1.5 Flash, Groq Llama 3.3, and offline deterministic engine) with structured JSON output mode, sending only pre-computed summary statistics (never raw trades) to explain top leaks in plain English and propose targeted rules, with strict prompt guardrails against trade advice.

**Acceptance criteria:**
- [x] System prompt enforces strict educational role: never predicts prices, never recommends buy/sell actions
- [x] Sends pre-computed stats dictionary to free-tier LLM API and requests structured JSON schema
- [x] Output schema validates: `top_leaks` (list of 3), `evidence` (specific stats), `suggested_rules` (from catalog), and `discipline_grade`
- [x] Error handling retries invalid JSON once, then fails gracefully with free deterministic fallback

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_ai_client.py` (6/6 passing)
- [x] Build succeeds: `mypy services/analytics/app/ai` (0 errors in 4 source files)
- [x] Manual check: Trigger AI insights on mock stats and inspect raw JSON against Pydantic schema

**Dependencies:** Task 12

**Files likely touched:**
- `services/analytics/app/ai/client.py`
- `services/analytics/app/ai/schemas.py`
- `services/analytics/app/ai/prompts.py`
- `services/analytics/tests/test_ai_client.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 17: Numeric grounding validation & insight caching layer

**Description:** Build a verification layer that cross-checks every number cited in the AI's explanation text against the real computed statistics to prevent hallucination, and implements an insights cache to avoid redundant API calls and control costs.

**Acceptance criteria:**
- [x] Numeric grounding validator extracts figures from AI text and verifies they match computed metrics within 2% margin
- [x] Discrepant AI responses are flagged, rejected, or regenerated
- [x] Insights are cached in `insights` table keyed by `user_id` and trade dataset hash
- [x] Tracks user token consumption in `ai_usage` table to enforce daily rate caps

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_grounding.py` (11/11 passing)
- [x] Build succeeds: `mypy services/analytics/app/ai` (0 errors in 7 source files)
- [x] Manual check: Inject hallucinated figure in mock AI output and assert grounding validator raises rejection error

**Dependencies:** Task 16

**Files likely touched:**
- `services/analytics/app/ai/grounding.py`
- `services/analytics/app/ai/cache.py`
- `services/analytics/tests/test_grounding.py`

**Estimated scope:** Small (1-2 files)

---

## Task 18: Frontend AI insight cards & leak display

**Description:** Create frontend UI components to present AI insights clearly: Top Leaks banner, evidence breakdown cards with trade count badges, confidence indicators, and a one-click 'Test this rule' button that pre-fills the Rule Lab.

**Acceptance criteria:**
- [x] Top 3 leaks displayed as high-visibility cards on the dashboard
- [x] Each card shows the numeric evidence, trade count analyzed, and suggested rule
- [x] Small sample warnings shown when leak is based on fewer than 30 trades
- [x] Clicking 'Test this rule' deep links into the Rule Lab with pre-populated rule configuration

**Verification:**
- [x] Tests pass: `npm run test -- apps/web/tests/insights.test.tsx` (9/9 passing, 98/98 overall)
- [x] Build succeeds: `npm run build --prefix apps/web` (all static & dynamic pages compiled)
- [x] Manual check: Verify insight card renders on dashboard and clicking 'Test this rule' transitions to Rule Lab

**Dependencies:** Task 17

**Files likely touched:**
- `apps/web/components/insights/insight-card.tsx`
- `apps/web/components/insights/top-leaks-banner.tsx`
- `apps/web/app/(dashboard)/insights/page.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: AI Insights
- [x] Claude API client outputs validated structured JSON with zero hallucinated stats
- [x] System prompt strictly adheres to educational non-advisory guardrails
- [x] Numeric grounding asserts all stated figures match computed numbers
- [x] One-click 'Test this rule' CTA links directly into Rule Lab
- [x] Review with team before proceeding

---

## Phase 7: Rule Lab & Deterministic Backtester

## Task 19: Fixed rule catalog definition & validator

**Description:** Define the strict rule catalog schema and validator in Python for V1: (1) Cooldown after loss, (2) Max consecutive losses cutoff, (3) Daily loss limit, (4) Max trades per day, (5) Time of day cutoff, (6) Max position size, (7) Skip instrument type, (8) No trading on expiry day, and (9) Multi-rule combination.

**Acceptance criteria:**
- [x] Pydantic models define exact schema and allowed parameters for each rule in the catalog
- [x] Strict validator rejects any rule type or parameter outside the approved catalog
- [x] Multi-rule composite validator ensures all sub-rules evaluate in logical conjunction (AND)
- [x] Unit tests cover validation of every rule type and parameter boundaries

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_rules_catalog.py` (47/47 passing, 215/215 backend passing)
- [x] Build succeeds: `mypy services/analytics/app/rules` (0 issues in 4 source files)
- [x] Manual check: Attempt to validate an arbitrary or uncataloged rule and verify rejection

**Dependencies:** Task 8

**Files likely touched:**
- `services/analytics/app/rules/catalog.py`
- `services/analytics/app/rules/validator.py`
- `services/analytics/tests/test_rules_catalog.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 20: Natural language to JSON rule translator

**Description:** Implement an AI translation endpoint that takes user natural language rule descriptions (e.g. "Don't let me trade for 30 minutes after taking a loss"), queries Claude with the fixed catalog schema, and outputs validated catalog JSON.

**Acceptance criteria:**
- [x] Converts natural language prompt into valid catalog rule JSON
- [x] Rejects requests that cannot be mapped to the catalog with helpful explanation of supported rules
- [x] Validates output JSON through `rules/validator.py` before returning to user
- [x] Handles multi-clause statements (e.g. "Max 5 trades per day and stop after 2 losses") into composite rules

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_translator.py` (20/20 passing, 235/235 backend passing)
- [x] Build succeeds: `mypy services/analytics/app/rules` (0 issues in 8 source files)
- [x] Manual check: Input natural language rule and confirm valid structured JSON is produced

**Dependencies:** Task 19

**Files likely touched:**
- `services/analytics/app/rules/translator.py`
- `services/analytics/app/rules/prompt.py`
- `services/analytics/tests/test_translator.py`

**Estimated scope:** Small (1-2 files)

---

## Task 21: Deterministic trade replay engine & 70/30 train/test split

**Description:** Build the deterministic replay engine that iterates chronologically over the user's historical trades, filters or modifies trades violating the specified rule, computes before vs after metrics, and calculates a 70% in-sample / 30% out-of-sample split to detect overfitting.

**Acceptance criteria:**
- [x] Replays trades sequentially, accurately updating state (running daily loss, loss streaks, timestamps)
- [x] Identifies every skipped trade and computes revised before/after metrics (Net P&L, Win Rate, Drawdown, Profit Factor)
- [x] Generates dual equity curve data series (Actual vs Simulated with Rule)
- [x] Executes 70/30 chronological train/test split and flags potential overfitting when performance degrades on out-of-sample data
- [x] Emits explicit warnings when sample size is under 30 trades

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_replay.py`
- [x] Build succeeds: `mypy services/analytics/app/rules/replay.py`
- [x] Manual check: Run cooldown rule on revenge-trade sample; verify skipped trades and delta P&L

**Dependencies:** Task 19

**Files likely touched:**
- `services/analytics/app/rules/replay.py`
- `services/analytics/app/rules/evaluator.py`
- `services/analytics/tests/test_replay.py`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Rule Replay Engine
- [ ] Fixed rule catalog strictly enforces parameter boundaries
- [ ] Natural language translator safely compiles user requests into catalog JSON
- [ ] Deterministic replay engine accurately simulates rule overlay with 70/30 overfitting detection
- [ ] Review with team before proceeding

---

## Phase 8: Rule Lab UI & Rulebook Adherence

## Task 22: Rule Lab interactive interface & backtest runner

**Description:** Build the Rule Lab frontend interface in Next.js: rule selector / custom rule builder, backtest execution button, side-by-side comparison cards (Before vs After P&L, Win Rate, Max Drawdown), dual equity curve visualizer, and table of skipped trades with reasons.

**Acceptance criteria:**
- [x] Interactive UI allows picking from catalog templates or entering plain language
- [x] Shows comparative metric delta badges (e.g. `+₹42,500 (+14%)`, `Drawdown: -22% -> -14%`)
- [x] Dual equity curve renders Actual vs Simulated curves with clear legend
- [x] List of skipped trades displays exact timestamp, symbol, and rule violation reason
- [x] Prominent disclaimer banner: "Replay is an approximation based on past behavior"

**Verification:**
- [x] Tests pass: `npm run test -- apps/web/tests/rule-lab.test.ts`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Run a backtest in the UI, check before/after charts and skipped trade modal

**Dependencies:** Task 21

**Files likely touched:**
- `apps/web/app/(dashboard)/rule-lab/page.tsx`
- `apps/web/components/rule-lab/rule-builder.tsx`
- `apps/web/components/rule-lab/backtest-result-view.tsx`
- `apps/web/components/rule-lab/comparison-metrics.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Task 23: Saved rulebook & import adherence tracker

**Description:** Enable saving tested rules into the user's personal Trading Rulebook (`rules` table) and implement post-import adherence analysis that flags rule violations on newly uploaded trade files.

**Acceptance criteria:**
- [x] User can click 'Save to Rulebook' to activate rule with a custom name
- [x] Dedicated Rulebook page displays active and paused rules with toggle switches
- [x] When a new CSV is imported, the engine evaluates trades against active rules and flags violations
- [x] Adherence score (% of trades adhering to rules) is calculated and surfaced on dashboard

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_adherence.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Save a rule, upload a new CSV containing violating trades, and verify violations are flagged

**Dependencies:** Task 22

**Files likely touched:**
- `apps/web/app/(dashboard)/rules/page.tsx`
- `apps/web/components/rules/rule-card.tsx`
- `services/analytics/app/rules/adherence.py`
- `services/analytics/tests/test_adherence.py`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Rule Lab & Adherence
- [x] Rule Lab UI renders before/after equity curves and skipped trades cleanly
- [x] Disclaimer warnings and overfitting checks appear prominently
- [x] Rules can be saved to a personal rulebook
- [x] New imports show adherence tracking and rule violations
- [x] Review with team before proceeding

---

## Phase 9: Coach Dashboard & Team Features

## Task 24: Coach-trader organization & permission consent model

**Description:** Build the organization and coach-trader permission management module: coach invitation links, trader explicit consent screen, revocable access controls, and strict RLS policies ensuring coaches only see data for authorized traders.

**Acceptance criteria:**
- [x] Coach can generate an invitation link for a student/trader
- [x] Trader sees an explicit consent screen detailing what data the coach can view
- [x] Trader can revoke coach access at any time from Settings
- [x] Database RLS policy strictly grants read-only access to coach if and only if active consent exists

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_coach_access.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Invite trader with coach account, grant consent, then revoke; verify data access cuts off immediately

**Dependencies:** Task 2

**Files likely touched:**
- `supabase/migrations/20261012000003_coach_access.sql`
- `apps/web/app/(dashboard)/coach/traders/page.tsx`
- `apps/web/components/coach/invite-modal.tsx`
- `apps/web/components/settings/coach-consent-manager.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Task 25: Coach cohort dashboard with traffic-light risk flags

**Description:** Build the Coach Dashboard interface displaying a cohort list of assigned traders with traffic-light risk flags (rule violations, severe drawdown, position size spikes), cohort aggregate stats (average win rate, top leak), and drill-down into a trader's read-only dashboard.

**Acceptance criteria:**
- [x] Coach dashboard lists assigned traders with green/yellow/red risk indicators based on behavior metrics
- [x] Shows aggregate cohort metrics (cohort win rate, most common behavioral leak)
- [x] Coach can drill down into a specific trader's analytics in read-only mode
- [x] Coach can leave private feedback notes or assign a rule to a trader's rulebook

**Verification:**
- [x] Tests pass: `npm run test -- apps/web/tests/coach.test.ts`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Log in as coach, inspect cohort summary, drill down into trader, and leave a coaching note

**Dependencies:** Task 24

**Files likely touched:**
- `apps/web/app/(dashboard)/coach/page.tsx`
- `apps/web/components/coach/cohort-stats.tsx`
- `apps/web/components/coach/trader-risk-table.tsx`
- `apps/web/components/coach/trader-detail-modal.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Coach & Collaboration
- [x] Consent management ensures trader always has control over coach visibility
- [x] Coach dashboard surfaces real-time risk flags across students
- [x] Read-only drilldown and rule assignment work seamlessly
- [x] Review with team before proceeding

---

## Phase 10: Reports, Data Control & Production Hardening

## Task 26: Automated weekly report engine & PDF/email delivery

**Description:** Implement scheduled weekly summary report generation and delivery via transactional email (Resend) and in-app viewing: weekly net P&L, best/worst trading day, rule adherence rate, biggest behavioral leak, and one actionable focus item for next week.

**Acceptance criteria:**
- [x] Scheduled background worker computes weekly summary for active users every Sunday
- [x] In-app report viewer displays printable/PDF-exportable weekly summary
- [x] Email template renders responsive HTML email sent via Resend API
- [x] User can enable/disable weekly email delivery in Notification Preferences

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_weekly_report.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Trigger test report generation and verify email preview and in-app card

**Dependencies:** Task 12

**Files likely touched:**
- `services/analytics/app/reports/weekly.py`
- `services/analytics/app/reports/email_sender.py`
- `apps/web/app/api/reports/cron/route.ts`
- `apps/web/components/reports/weekly-summary-view.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Task 27: Privacy, data export & account/import deletion

**Description:** Implement user data control and compliance features satisfying Indian DPDP Act 2023 basics: full trade data export as CSV, deletion of individual imports, and hard deletion of entire account with all associated database rows and stored files.

**Acceptance criteria:**
- [x] 'Export My Data' generates a downloadable ZIP containing clean CSVs of all raw fills and trades
- [x] 'Delete Import' cascades removal of raw fills, trades, and computed snapshots for that batch
- [x] 'Delete Account' permanently scrubs user profile, files, trades, and rules across all tables
- [x] Privacy Policy and Terms of Service pages render with financial educational disclaimers

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_data_deletion.py`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Create test account, upload trades, execute Delete Account, and verify all records purged from database

**Dependencies:** Task 6

**Files likely touched:**
- `apps/web/app/(dashboard)/settings/data/page.tsx`
- `apps/web/app/api/user/export/route.ts`
- `apps/web/app/api/user/delete/route.ts`
- `services/analytics/app/security/export_cleaner.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 28: Security audit, cross-user RLS penetration tests & monitoring

**Description:** Conduct end-to-end security hardening: automated penetration tests verifying that user A cannot access or modify user B's records across any API route or Supabase query, configure Sentry error tracking, and apply rate limiting to sensitive endpoints.

**Acceptance criteria:**
- [x] Automated security test suite executes cross-tenant queries and asserts 100% rejection
- [x] Rate limiting active on login, CSV upload, and AI generation endpoints
- [x] Sentry error logging initialized across both Next.js and FastAPI services
- [x] Environment variable validation fails fast on startup if secrets are missing

**Verification:**
- [x] Tests pass: `pytest services/analytics/tests/test_rls_penetration.py` and `npm test -- apps/web/tests/security.test.ts`
- [x] Build succeeds: `npm run build --prefix apps/web`
- [x] Manual check: Run penetration test script simulating token spoofing and verify HTTP 403 / zero rows returned

**Dependencies:** Task 2, Task 27

**Files likely touched:**
- `services/analytics/tests/test_rls_penetration.py`
- `apps/web/tests/security.test.ts`
- `services/analytics/app/monitoring/sentry.py`
- `services/analytics/app/security/rate_limiter.py`
- `apps/web/lib/security/rate-limiter.ts`
- `apps/web/lib/config/env.ts`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Launch Readiness
- [x] All 28 tasks verified with automated tests passing
- [x] Zero cross-tenant data leaks verified by security penetration tests
- [x] Complete user flow works end-to-end: Upload -> P&L & Charges -> Behavioral Leaks -> AI Insight -> Rule Lab Replay -> Rulebook -> Export/Delete
- [x] Ready for client handover and user beta testing
