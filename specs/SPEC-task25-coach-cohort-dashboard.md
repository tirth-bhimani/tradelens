# Spec: Task 25 - Coach Cohort Dashboard with Traffic-Light Risk Flags

## Objective

Build the Coach Cohort Dashboard interface for TradeLens. This interface empowers trading coaches, prop firm risk managers, and mentor organizations to oversee an assigned cohort of student traders through traffic-light risk flags, cohort aggregate health analytics, granular read-only student drill-down, private coaching feedback notes, and direct rulebook rule assignment.

Building upon the consent and permission foundation implemented in Task 24, Task 25 transforms raw coach authorization into an institutional supervisory terminal:
1. **Cohort Aggregate Intelligence**: Displays macro cohort statistics—overall win rate, combined gross/net P&L, average rule adherence, and cohort-wide top behavioral leaks (e.g., revenge trading spirals, sizing spikes, weekend holds).
2. **Traffic-Light Risk Grid**: Classifies mentee performance via automated traffic-light indicators (Green: Disciplined, Yellow: Moderate Risk, Red: High Tilt / Drawdown Risk) derived from objective behavioral metrics.
3. **Read-Only Trader Analytics Drill-Down**: Provides coaches with a deep, non-destructive inspection modal showing a student's equity curve, win/loss distribution, recent executions, and tilt autopsy cascades—strictly sandboxed by database-level Row-Level Security.
4. **Coaching Interventions**: Enables coaches to record private, timestamped feedback notes and directly recommend or assign risk guardrail rules into the student's active rulebook.

---

## Assumptions

1. **Role Access**: The coach dashboard is accessible to users with role `coach`, `client_admin`, or `platform_admin`. In local offline environments without active auth, it falls back to a sample coach cohort state.
2. **Trader Sovereignty & RLS**: All student data displayed to a coach is strictly gated by an `active` consent record in `coach_access` (established in Task 24). If consent is `revoked`, student performance figures are masked ("Hidden") and drill-down is blocked.
3. **Non-Destructive Drill-Down**: Coaches have strictly read-only visibility into a trader's journal. They cannot edit, import, reconcile, or delete a student's trades.
4. **Coaching Feedback Privacy**: Private coaching notes left by a coach are visible to the authoring coach and optionally the mentee, but never exposed across other students in the cohort or third parties.
5. **Assigned Rules Flow**: When a coach assigns a rule, it is created in the student's `rules` table with metadata indicating coach authorship (`suggested_by_coach_id`), pending or active based on coach permissions.

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, Lucide React icons
- **State & Data Fetching**: Next.js Server Actions (`apps/web/lib/coach/coach-actions.ts`), Supabase Client (`@supabase/ssr`), React local/optimistic state
- **Backend & Database**: PostgreSQL 15 (Supabase), Row-Level Security (RLS) policies, Supabase Auth
- **Testing**: Vitest (`apps/web/tests/coach.test.ts`), Pytest (`services/analytics/tests/test_coach_access.py`)

---

## Commands

```bash
# Web Frontend Testing & Verification
Test: npm test --prefix apps/web -- --run
Build: npm run build --prefix apps/web
Lint: npm run lint --prefix apps/web
Typecheck: npm run typecheck --prefix apps/web

# Backend Analytics Verification
Pytest: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/test_coach_access.py
```

---

## Project Structure

```
specs/
  SPEC-task25-coach-cohort-dashboard.md           # This specification

supabase/
  migrations/
    20261022000002_coach_notes_and_rules.sql      # Schema for coach notes and rule suggestions

apps/web/
  app/(dashboard)/
    coach/
      page.tsx                                    # Redirect / alias to /coach/traders
      traders/
        page.tsx                                  # Coach Cohort Dashboard root page
        [traderId]/
          page.tsx                                # (Optional direct deep-link or modal route)
  components/
    coach/
      cohort-stats.tsx                            # Aggregate metric cards (Win Rate, Top Leak, Risk Dist)
      trader-risk-table.tsx                       # Filterable grid with traffic-light risk flags & drill-down trigger
      trader-detail-modal.tsx                     # Read-only student inspection modal (Equity, Trades, Tilt)
      coach-note-composer.tsx                     # Form & history for private mentor feedback notes
      assign-rule-modal.tsx                       # Dialog to recommend/assign a rule to student rulebook
      invite-modal.tsx                            # (From Task 24) Student invitation generator
  lib/
    coach/
      coach-actions.ts                            # Server actions for cohort stats, drill-down, notes, rule assignment
      coach-defaults.ts                           # Default mock cohort data, notes, and drill-down samples
      coach-types.ts                              # Extended types for notes, cohort stats, and drill-down data
  tests/
    coach.test.ts                                 # Unit & integration tests for cohort metrics & interventions
```

---

## Data Contract & Database Schema

### 1. `coach_notes` Table
```sql
CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_private_to_coach BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notes_trader ON coach_notes(trader_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_created ON coach_notes(created_at DESC);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Coach can read and write notes for traders who have granted active consent
CREATE POLICY "coach_manage_notes" ON coach_notes
    FOR ALL
    USING (
        auth.uid() = coach_id 
        AND EXISTS (
            SELECT 1 FROM coach_access ca 
            WHERE ca.coach_id = auth.uid() 
              AND ca.trader_id = coach_notes.trader_id 
              AND ca.status = 'active'
        )
    )
    WITH CHECK (
        auth.uid() = coach_id 
        AND EXISTS (
            SELECT 1 FROM coach_access ca 
            WHERE ca.coach_id = auth.uid() 
              AND ca.trader_id = coach_notes.trader_id 
              AND ca.status = 'active'
        )
    );

-- Trader can read non-private notes addressed to them
CREATE POLICY "trader_read_own_notes" ON coach_notes
    FOR SELECT
    USING (
        auth.uid() = trader_id 
        AND is_private_to_coach = FALSE
    );
```

### 2. Coach Assigned Rules Integration
Coaches with `suggest_rules: true` in `coach_access.permissions` can insert recommended rules directly into the `rules` table or a dedicated queue:
```sql
ALTER TABLE rules ADD COLUMN IF NOT EXISTS suggested_by_coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS coach_recommendation_status TEXT DEFAULT 'active' CHECK (coach_recommendation_status IN ('pending_trader_review', 'active', 'rejected'));
```

---

## Component Specifications

### 1. `CohortStats` (`apps/web/components/coach/cohort-stats.tsx`)
Four institutional KPI metric cards with luminous visual elevation:
- **Active Cohort Size & Win Rate**: Total active students and weighted cohort win rate (e.g. 54.8%).
- **Cohort Net P&L**: Cumulative net profit/loss across all authorized mentee accounts.
- **Top Behavioral Leak**: Most prevalent leak detected across the cohort (e.g., *Revenge Trading Cascades*, *Oversized Lot Spikes*, *Weekend Gamma Exposure*).
- **Traffic-Light Risk Distribution**: Interactive horizontal segmented pill or progress bar:
  - 🟢 **Disciplined**: Win rate > 50%, 0 recent tilt cascades, high adherence (> 80%).
  - 🟡 **Moderate**: 1-2 rule violations, drawdown between 5-15%, adherence 60-80%.
  - 🔴 **High Risk**: Drawdown > 15%, revenge trading spiral detected, adherence < 60%.

### 2. `TraderRiskTable` (`apps/web/components/coach/trader-risk-table.tsx`)
Replaces/elevates the basic roster table:
- Filter pills: `All (N)`, `High Risk (🔴)`, `Moderate (🟡)`, `Disciplined (🟢)`, `Revoked (✕)`.
- Search query by student name or email with instant debounce.
- Table Columns:
  1. **Student Trader**: Name, email, active badges.
  2. **Risk Flag**: Traffic-light pill with specific violation tag (e.g., `🔴 Tilt Cascade`, `🟡 Sizing Spike`, `🟢 Disciplined`).
  3. **Win Rate & P&L**: Net P&L formatted in INR (`₹`), Win Rate %.
  4. **Rule Adherence**: Adherence percentage bar.
  5. **Top Identified Leak**: Specific behavioral tag.
  6. **Last Active**: Timestamp of latest recorded trade.
  7. **Actions**: "Inspect Dashboard" button & "Quick Note" trigger.

### 3. `TraderDetailModal` (`apps/web/components/coach/trader-detail-modal.tsx`)
A full-featured, read-only analytics inspection slide-over or modal:
- **Trader Banner**: Display name, email, risk badge, consent timestamp.
- **Read-Only Notice**: Banner stating *"Read-Only Supervision Mode • RLS Enforced"*.
- **Tabs**:
  1. **Overview & Equity Curve**: Mini equity curve chart, profit factor, max drawdown, average holding duration.
  2. **Recent Executions**: Latest 20 trades with instrument, buy/sell price, gross/net P&L, and holding time.
  3. **Tilt & Behavior**: Recent autopsy cascade timeline (trigger trade, loss spiral, revenge trades).
  4. **Coaching Notes**: Timeline of notes left by the coach with composer to add a new note.
  5. **Assign Rule**: Preset selector to assign a guardrail (e.g., "Max Daily Drawdown: ₹15,000", "Max Lots per NIFTY trade: 4").

### 4. `CoachNoteComposer` (`apps/web/components/coach/coach-note-composer.tsx`)
- Textarea with markdown support and tag pills (`#sizing`, `#discipline`, `#tilt`, `#stoploss`).
- "Send Note" action calling `addCoachNoteAction`.
- Timeline of historical notes with timestamps and delete/edit capabilities for the authoring coach.

### 5. `AssignRuleModal` (`apps/web/components/coach/assign-rule-modal.tsx`)
- Form to select rule type: `max_daily_loss`, `max_position_size`, `trading_stop_after_consecutive_losses`, `restricted_time_window`.
- Sets threshold values, natural language description, and enforce mode (`restrict` vs `flag_only`).
- Dispatches `assignCoachRuleAction`.

---

## Code Style & Conventions

- Follow TypeScript strict typing; avoid `any`.
- Keep server actions in `apps/web/lib/coach/coach-actions.ts` marked with `"use server"`.
- Keep default mock datasets and constants in `apps/web/lib/coach/coach-defaults.ts` without `"use server"`.
- Use standard TradeLens UI design tokens (`card-luminous`, `kiro-btn-cta`, `kiro-btn-outline`, Tailwind color tokens `emerald`, `amber`, `rose`, `#2b7fff`).
- Example Server Action Implementation:

```tsx
export async function addCoachNoteAction(input: {
  traderId: string;
  note: string;
  tags?: string[];
  isPrivate?: boolean;
}): Promise<{ success: boolean; note?: CoachNote; error?: string | null }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // In offline mode, append to memory notes store
      const newNote = createMemoryNote(user?.id || "coach-current", input);
      return { success: true, note: newNote };
    }

    const { data, error } = await supabase
      .from("coach_notes")
      .insert({
        coach_id: user.id,
        trader_id: input.traderId,
        note: input.note,
        tags: input.tags || [],
        is_private_to_coach: input.isPrivate ?? false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, note: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
```

---

## Testing Strategy

- **Test Suite**: `apps/web/tests/coach.test.ts`
- **Coverage Requirements**:
  1. **Cohort Aggregate Metrics**: Computes average win rate, total P&L, and identifies the most frequent behavioral leak across sample student records.
  2. **Traffic-Light Classification**: Verifies that traders with drawdown > 15% or active tilt cascades receive a Red flag, traders with 1-2 violations receive Yellow, and traders adhering to rules receive Green.
  3. **Read-Only Authorization Gate**: Verifies that when a trader's consent is `revoked`, drill-down returns `error: "Trader access has been revoked"` and hides performance numbers.
  4. **Coaching Notes**: Verifies creating, fetching, and filtering notes by trader ID.
  5. **Rule Assignment**: Verifies that assigning a rule to a trader creates a rule payload associated with that trader's ID and coach reference.
- **Run Command**:
  ```bash
  npm test --prefix apps/web -- --run tests/coach.test.ts
  ```

---

## Boundaries

- **Always Do**:
  - Enforce read-only semantics on all student data presented to coaches.
  - Check consent status before returning student drill-down analytics.
  - Provide immediate visual feedback (optimistic updates or loading spinners) for coaching note submission and rule assignment.
  - Maintain offline fallback stores so the dashboard functions seamlessly without an active Supabase cloud instance.
- **Ask First**:
  - Automatically converting coach rule recommendations into hard execution blocks on the trader's broker fills without student confirmation.
  - Exposing student contact information beyond display name and email.
- **Never Do**:
  - Never allow coaches to modify, backfill, or delete student trade log entries.
  - Never expose student data to coaches when consent is `revoked` or `pending`.
  - Never store plaintext API keys or credentials in notes or feedback.

---

## Success Criteria

1. **Dashboard Route**: Loading `/coach` or `/coach/traders` displays the elevated Coach Cohort Dashboard with `CohortStats` and `TraderRiskTable`.
2. **Traffic-Light Flags**: Every student in the roster is assigned an explicit Green, Yellow, or Red risk status tag with an explanation tooltip.
3. **Cohort Aggregate Cards**: Four cards displaying total cohort active students, weighted win rate, net P&L, and top cohort leak.
4. **Drill-Down Inspection**: Clicking "Inspect Dashboard" on an authorized student opens the read-only inspection modal showing equity curve, recent trades, and tilt diagnostics.
5. **Coaching Notes**: Coach can write and submit a private note that immediately appears in the student's note history.
6. **Rule Assignment**: Coach can assign a rule recommendation to a mentee's rulebook.
7. **Passing Verification**: All tests in `apps/web/tests/coach.test.ts` pass, Next.js production build succeeds with 0 errors, and no layout shifts or accessibility violations exist.

---

## Resolved Design Decisions

1. **Trader Review of Assigned Rules**:
   - **Resolution**: Rules assigned by a coach enter the student's rulebook with status `pending_trader_review` and a badge `Assigned by Coach`. This preserves trader data sovereignty while making the coach's recommendation clear. The student can click "Activate Rule" in their rulebook with a single click.

2. **Note Visibility**:
   - **Resolution**: Coaching notes include an explicit privacy toggle: `Private (Coach Only)` (default) vs. `Shared with Student`. Private notes are strictly isolated to the coach's view, while shared notes are visible to the student in their mentorship panel.

