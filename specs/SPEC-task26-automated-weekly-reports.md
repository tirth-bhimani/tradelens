# Spec: Task 26 - Automated Weekly Report Engine & PDF/Email Delivery

## Objective

Build the Automated Weekly Report Engine & Multi-Channel Delivery system for TradeLens. This feature synthesizes a trader's weekly execution activity into an authoritative, actionable performance report delivered via transactional email (Resend) and an in-app printable/exportable viewer (`/reports`).

The weekly report bridges raw trading history with disciplined behavioral feedback by delivering:
1. **Financial Performance Summary**: Weekly Gross P&L, Statutory Charges & Brokerage breakdown, and Final Net P&L.
2. **Execution Diagnostics**: Win rate, profit factor, total trades, average trade duration, and best/worst trading day identification (with specific date & P&L).
3. **Behavioral Discipline & Adherence**: Weekly rulebook adherence score (0-100%), count of rule violations, and top behavioral leak (e.g. revenge re-entries, size creep, overtrading spiral).
4. **Actionable Focus Item for Next Week**: Algorithmic prescriptive recommendation directly targeting the trader's primary behavioral vulnerability.
5. **Multi-Channel Delivery & Export**:
   - **In-App Report Hub (`/reports`)**: Interactive viewer displaying historical weekly reports, performance breakdown charts, and a clean "Print / Save PDF" view styled via responsive `@media print` rules.
   - **Transactional Email (Resend)**: Responsive, dark-themed HTML email template rendering tables, metric cards, leak badges, and unsubscribe/notification preference links.
   - **User Notification Preferences**: Toggle in Settings (`/settings/notifications`) enabling traders to opt in/out of weekly email delivery.
   - **Scheduled Cron & On-Demand Dispatch**: API route (`/api/reports/cron`) protected by bearer token for automated Sunday batch processing, plus an on-demand generation action for immediate report compilation.

---

## Assumptions

1. **Email Provider**: Resend is the designated transactional email provider. If `RESEND_API_KEY` is not present in the runtime environment (such as offline local sandbox), the engine gracefully falls back to mock delivery with local HTML preview generation, logging the payload without throwing runtime errors.
2. **PDF Generation Method**: Uses native browser print engine with high-fidelity `@media print` styling (clean vector typography, page break avoidance, hidden navbar/chrome) triggered via `window.print()`. This provides instantaneous, zero-overhead PDF export across all operating systems without requiring heavy server-side headless browsers (Puppeteer/Chromium).
3. **Reporting Week Boundary**: A trading week runs Monday 00:00:00 to Friday 23:59:59 (or Sunday 23:59:59) in the trader's profile timezone (default `Asia/Kolkata` IST).
4. **Empty Week State**: If a trader has zero trades during a given week, the report indicates "Zero executions recorded this week" with a clean resting state rather than failing or showing NaN metrics.
5. **Data Sovereignty & RLS**: Generated reports are stored in `weekly_reports` protected by Row-Level Security (`auth.uid() = user_id`). Users can only query their own reports.

---

## Tech Stack

- **Backend Calculation Engine**: Python 3.11+, FastAPI, Pydantic v2, `app.engine.core_metrics.CoreMetricsEngine`, `app.engine.behavior_metrics.BehaviorMetricsEngine`, `app.rules.adherence.evaluate_rulebook_adherence`
- **Email Delivery**: Resend REST API (`httpx` / HTTP client), responsive Jinja2/Python HTML email generator with inline CSS
- **Frontend Viewer**: Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, Lucide React icons
- **Print / PDF Engine**: CSS Paged Media module (`@media print`, `@page { margin: 15mm; }`, `break-inside: avoid`)
- **Database & Storage**: PostgreSQL 15 (Supabase), Row-Level Security (RLS) policies
- **Scheduled Ingestion**: Next.js API Route (`/api/reports/cron`), FastAPI Background Task / Cron endpoint (`/api/v1/reports/batch-cron`)
- **Testing**: Pytest (`services/analytics/tests/test_weekly_report.py`), Vitest (`apps/web/tests/reports.test.ts`)

---

## Commands

```bash
# Web Frontend Testing & Verification
Test: npm test --prefix apps/web -- --run
Build: npm run build --prefix apps/web
Lint: npm run lint --prefix apps/web
Typecheck: npm run typecheck --prefix apps/web

# Backend Analytics Verification
Pytest: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/test_weekly_report.py
```

---

## Project Structure

```
specs/
  SPEC-task26-automated-weekly-reports.md        # This specification

supabase/
  migrations/
    20261022000003_weekly_reports.sql           # Schema for weekly_reports & notification_preferences

services/analytics/
  app/
    core/
      config.py                                 # Resend API key & email sender config settings
    reports/
      __init__.py
      weekly.py                                 # Core weekly report computation & focus recommendation engine
      email_sender.py                           # Responsive HTML email compiler & Resend dispatch client
    routers/
      reports.py                                # FastAPI endpoints for weekly report generation & batch cron
  tests/
    test_weekly_report.py                       # Unit & integration tests for report metrics & email templating

apps/web/
  app/
    (dashboard)/
      reports/
        page.tsx                                # In-app reports archive & latest weekly report viewer
      settings/
        notifications/
          page.tsx                              # Notification preferences & email digest toggle
    api/
      reports/
        cron/
          route.ts                              # Bearer-token protected cron trigger route
        generate/
          route.ts                              # On-demand weekly report trigger endpoint
  components/
    reports/
      weekly-summary-view.tsx                   # Master printable weekly report view with PDF export button
      report-card.tsx                           # Mini summary card for report archive list
      email-preview-modal.tsx                   # Dev modal to inspect raw HTML email output
    settings/
      notification-settings-form.tsx            # Form to update weekly digest email preferences
    dashboard/
      DashboardNav.tsx                          # Add Weekly Reports under Analytics dropdown
  lib/
    reports/
      report-actions.ts                         # Server actions to fetch/generate reports & update preferences
      report-types.ts                           # TypeScript interfaces matching backend models
      report-defaults.ts                        # Fallback mock report data for offline development
  tests/
    reports.test.ts                             # Vitest tests for report components, formatting, and actions
```

---

## Data Contract & Database Schema

### 1. `weekly_reports` Table
```sql
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_trades INT NOT NULL DEFAULT 0,
    winning_trades INT NOT NULL DEFAULT 0,
    losing_trades INT NOT NULL DEFAULT 0,
    win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    gross_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_pnl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    best_day_date DATE,
    best_day_pnl NUMERIC(14, 2) DEFAULT 0.00,
    worst_day_date DATE,
    worst_day_pnl NUMERIC(14, 2) DEFAULT 0.00,
    adherence_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    rule_violations_count INT NOT NULL DEFAULT 0,
    top_behavioral_leak TEXT,
    top_leak_loss NUMERIC(14, 2) DEFAULT 0.00,
    focus_item TEXT NOT NULL,
    metrics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    email_sent_at TIMESTAMPTZ,
    email_delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_weekly_report UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week ON weekly_reports(user_id, week_start_date DESC);
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_weekly_reports" ON weekly_reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "service_role_manage_weekly_reports" ON weekly_reports
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
```

### 2. User Notification Preferences in `profiles` (or `notification_preferences`)
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications_email TEXT;
```

---

## Core Analytics Logic & Focus Item Generation

### Algorithmic Actionable Focus Item Generator
The focus recommendation engine deterministically prioritizes the trader's greatest weakness from the past week:
1. **Low Adherence (< 75%) or High Rule Violations**:
   - Focus: *"Enforce mandatory 15-minute cool-off after your first loss to prevent immediate rule-breaking cascades."*
2. **Revenge Trading Leak Detected**:
   - Focus: *"Place a hard cap of maximum 3 trades per day. Step away from the trading terminal immediately after any losing trade."*
3. **Position Size Creep Detected**:
   - Focus: *"Fix position sizing to strict 1% risk per trade regardless of prior trade outcome. Stop increasing lots to recover losses."*
4. **Holding Duration Asymmetry (Holding Losers Long, Cutting Winners Early)**:
   - Focus: *"Use automated hard bracket orders (GTT) with fixed 1:2 Risk/Reward at entry. Do not manually move stop-loss down."*
5. **High Statutory Charges & Brokerage (> 25% of Gross P&L)**:
   - Focus: *"High churn alert: Brokerage ate significant profits this week. Eliminate impulse scalp setups and trade only prime intraday sessions."*
6. **Clean Discipline & Profitable Week**:
   - Focus: *"Outstanding discipline this week. Maintain current position size and continue executing your defined rulebook playbook."*

---

## Email Template Design

The weekly digest email will use a clean, high-contrast, mobile-first responsive HTML layout:
- **Header**: TradeLens Logo & "Weekly Trading Performance Digest" with date range (e.g. `Oct 13, 2026 - Oct 17, 2026`).
- **Hero P&L Card**: Bold Net P&L in Emerald (profit) or Crimson (loss), accompanied by Gross P&L and Statutory Charges.
- **2x2 Grid of Key Statistics**: Win Rate, Total Executions, Best Day, Worst Day.
- **Discipline & Rule Adherence Meter**: Progress bar of rule adherence with violation breakdown.
- **Top Behavioral Leak Alert**: Warning box highlighting the most damaging leak and its INR financial drag.
- **Actionable Focus Callout**: Distinct highlight banner with the algorithmic target for next week.
- **Footer**: Link to view interactive report in TradeLens, link to Notification Preferences, and mandatory financial education disclaimer.

---

## Code Style Example

### Weekly Report Computation Engine (`services/analytics/app/reports/weekly.py`)

```python
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field

class WeeklyReportSummary(BaseModel):
    user_id: str
    week_start_date: str
    week_end_date: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    gross_pnl: Decimal
    total_charges: Decimal
    net_pnl: Decimal
    best_day_date: str | None = None
    best_day_pnl: Decimal = Decimal("0.00")
    worst_day_date: str | None = None
    worst_day_pnl: Decimal = Decimal("0.00")
    adherence_score: float = 100.00
    rule_violations_count: int = 0
    top_behavioral_leak: str | None = None
    top_leak_loss: Decimal = Decimal("0.00")
    focus_item: str
    daily_breakdown: list[dict[str, Any]] = Field(default_factory=list)

def generate_weekly_focus_item(
    adherence_score: float,
    rule_violations: int,
    top_leak: str | None,
    charges_ratio: float,
    net_pnl: Decimal,
) -> str:
    """Deterministically generate the highest priority focus item for next week."""
    if adherence_score < 75.0 or rule_violations >= 3:
        return "Enforce a mandatory 15-minute cool-off after any losing trade to avoid impulsive rule violations."
    if top_leak and "revenge" in top_leak.lower():
        return "Cap trading to a strict maximum of 3 trades per day. Step away from your desk if emotional agitation occurs."
    if top_leak and "size" in top_leak.lower():
        return "Lock in static lot sizing for every trade. Avoid escalating contract quantity to recoup prior losses."
    if charges_ratio > 0.25 and net_pnl > Decimal("0.00"):
        return "High churn alert: Charges consumed over 25% of gross P&L. Eliminate low-probability scalp trades."
    if net_pnl >= Decimal("0.00") and adherence_score >= 90.0:
        return "Excellent discipline this week. Maintain current position sizing and strictly honor your rulebook stop-loss levels."
    return "Prioritize pre-market setup validation. Execute only setups that meet 100% of your rulebook criteria."
```

---

## Testing Strategy

### 1. Pytest (`services/analytics/tests/test_weekly_report.py`)
- **Report Calculation**:
  - Test calculation with mixed winning and losing trades over a 5-day week.
  - Verify exact arithmetic: Net P&L = Gross P&L - Statutory Charges.
  - Test identification of best day (highest single day net P&L) and worst day (lowest single day net P&L).
  - Test calculation when zero trades exist (safe empty report, 0% win rate, 100% baseline adherence).
- **Behavioral Leak & Focus Item Mapping**:
  - Test that a revenge trading leak triggers the revenge focus item.
  - Test that a low adherence score triggers the cool-off focus item.
  - Test high charges trigger the fee churn focus item.
- **Email Generation & Dispatch**:
  - Verify HTML email generator produces valid, escaped, and properly styled HTML.
  - Verify email dispatcher with mock Resend API client returns `status: "sent"` (or `"simulated"`) without throwing when API key is missing.
- **REST Endpoints**:
  - `POST /api/v1/reports/weekly` returns complete `WeeklyReportSummary` JSON.

### 2. Vitest (`apps/web/tests/reports.test.ts`)
- **Report View Component**:
  - Renders week selector dropdown, Net P&L badge, best/worst day cards, rule adherence gauge, and actionable focus item.
  - Verify "Export PDF / Print" button invokes `window.print()` when clicked.
- **Print CSS**:
  - Verify printable report container includes `@media print` rules: hides navigation header, sets black/white background compatibility, prevents awkward page breaks inside metric cards.
- **Notification Preferences**:
  - Toggle weekly digest checkbox and verify server action persists updated preference.
- **Navigation Integration**:
  - Verify `Weekly Reports` link is present under the `Analytics` navigation dropdown in `DashboardNav.tsx`.

---

## Boundaries

- **Always**:
  - Follow Indian statutory charge rules (Task 9) and rule adherence calculations (Task 23).
  - Provide a safe local development mode: if `RESEND_API_KEY` is not set, report generation and email previewing must still work seamlessly without errors.
  - Format all currency in Indian Rupees (`₹` format: e.g. `₹1,24,500.00`) and negative values in parentheses or standard minus prefix.
  - Ensure zero layout shifts and complete mobile responsiveness on `/reports`.
- **Ask First**:
  - Introducing heavy server-side PDF generation binaries (Puppeteer, Playwright) instead of lightweight native CSS `@media print`. (Recommended: Native CSS `@media print`).
  - Changing the default Sunday automated report generation schedule.
- **Never**:
  - Commit Resend API keys or live tokens to git.
  - Send transactional emails to users who have disabled `weekly_email_enabled`.
  - Expose reports belonging to other traders across tenant boundaries.

---

## Success Criteria

1. **Deterministic Weekly Computation**: Given a trader's paired trades and rules for any 7-day period, the analytics engine computes weekly Net P&L, Gross P&L, Charges, Win Rate, Best Day, Worst Day, Adherence Score, Top Leak, and Actionable Focus Item in under 100ms.
2. **Responsive In-App Hub (`/reports`)**: The reports page renders historic weekly reports with week selector, daily breakdown chart, leak alert banner, focus card, and a one-click "Print / Save PDF" view that produces clean PDF pages via standard browser print.
3. **Responsive HTML Email Generator**: Generates a responsive HTML email with inline CSS, tested across mobile and desktop viewports, with dynamic fallback to local preview if Resend API key is unconfigured.
4. **User Preference Controls**: Traders can toggle weekly email digest notifications in Settings (`/settings/notifications`), with persistent database updates.
5. **Automated Cron API**: `/api/reports/cron` route verifies authorization and triggers batch weekly report generation for all active traders.
6. **100% Verification**: All new Pytest tests (`test_weekly_report.py`) and Vitest tests (`reports.test.ts`) pass, and `npm run build --prefix apps/web` completes with zero errors.

---

## Design Decisions & Quality Review

During the multi-axis quality review, the following design decisions were ratified:
1. **On-Demand Report Generation**: In addition to the automated Sunday cron, traders can trigger on-demand generation for the current week directly from `/reports` via a prominent "Generate Report Now" action.
2. **Native Vector PDF Export**: Utilizes CSS Paged Media (`@media print`, `@page { margin: 12mm; }`, `break-inside: avoid`) invoked via `window.print()`. This avoids heavy binary dependencies (Chromium/Puppeteer), ensures instant client-side rendering, and produces crisp vector typography.
3. **Development Email Preview**: An interactive "Preview HTML Email" modal is available in development environments, allowing full inspection of the generated responsive transactional email without requiring a live Resend API key.
4. **Cron Security Gating**: The `/api/reports/cron` route requires a matching `Authorization: Bearer <CRON_SECRET>` header. Requests without valid authorization are rejected with HTTP 401.
5. **Data Sovereignty & Persistence**: Generated weekly reports are stored in `weekly_reports` with Row-Level Security, allowing instant historical browsing without recalculating metrics on every page load.
