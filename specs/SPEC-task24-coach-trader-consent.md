# Spec: Task 24 - Coach-Trader Organization & Permission Consent Model

## Objective

Build the organization, coach-trader invitation pipeline, and revocable consent authorization model for TradeLens.

While TradeLens currently provides individual traders with automated journaling, behavioral leak analysis, and rule backtesting, coaching programs, proprietary trading firms, and mentoring communities require a formal mechanism to review student traders while strictly upholding trader data sovereignty.

This feature enables:
1. **Coach Invitation Generator**: Coaches can create time-limited, cryptographic invitation links/codes for student traders with optional organization grouping.
2. **Trader Explicit Consent Screen**: Student traders opening an invite link are presented with an un-obscured, granular consent screen detailing exact permissions requested (read-only closed trades, behavioral metrics, rule suggestions), explicit negative assurances (no broker order execution, no password or credential access, no account modifications), and an explicit one-click revocation guarantee.
3. **Revocable Access Control in Settings**: Traders retain 100% control over their data, maintaining an audit list of active and historical coaches at `/settings/coach` (or within Settings) with a single-click "Revoke Access" trigger that instantly severs coach data access.
4. **Strict PostgreSQL Row-Level Security (RLS) Enforcement**: Deep database-level enforcement guaranteeing that coaches can execute read-only queries against authorized trader tables (`trades`, `raw_fills`, `imports`, `stats_snapshots`, `rules`) if and only if an `active` consent record exists in `coach_access`. When revoked or pending, coach queries evaluate to zero rows, preventing unauthorized cross-tenant data leakage.

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, Lucide React icons
- **State & Data Fetching**: Next.js Server Actions, Supabase Client (`@supabase/ssr`), React state with optimistic UI
- **Backend & Database**: PostgreSQL 15 (Supabase), Supabase Auth, Row-Level Security (RLS) policies
- **Testing**: Vitest (`apps/web/tests/coach-consent.test.tsx`), Pytest (`services/analytics/tests/test_coach_access.py`)

---

## Commands

```bash
# Web Frontend Testing & Verification
Test: npm test --prefix apps/web -- --run
Build: npm run build --prefix apps/web
Lint: npm run lint --prefix apps/web

# Database & Analytics Service Verification
Test: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/test_coach_access.py
Typecheck: npm run typecheck --prefix apps/web
```

---

## Project Structure

```
specs/
  SPEC-task24-coach-trader-consent.md         # This specification

supabase/
  migrations/
    20261022000001_coach_invitations_and_access.sql # Invitation table & enhanced RLS policies

apps/web/
  app/(dashboard)/
    coach/
      traders/
        page.tsx                              # Coach student roster & invitation generation page
      consent/
        page.tsx                              # Trader explicit consent review screen (/coach/consent?token=...)
    settings/
      coach/
        page.tsx                              # Trader consent manager & coach access revocation view
  components/
    coach/
      invite-modal.tsx                        # Dialog to generate & copy student invite links
      roster-table.tsx                        # List of connected traders with consent status & risk flags
      consent-screen.tsx                      # Explicit permission agreement component
    settings/
      coach-consent-manager.tsx               # Active coaches list with one-click revocation
  lib/
    coach/
      coach-actions.ts                        # Server actions ("use server" - async functions ONLY): createInvite, acceptConsent, revokeConsent, getRoster
      coach-defaults.ts                       # Default mock store, fallback sample rosters and coaches (NO "use server")
      coach-types.ts                          # TypeScript types for invitations, roster, and consent audit logs

services/analytics/
  tests/
    test_coach_access.py                      # Integration tests verifying RLS policy boundaries & status gates
```

---

## Data Contract & Database Schema

### 1. `coach_invitations` Table
```sql
CREATE TABLE IF NOT EXISTS coach_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    invite_token TEXT NOT NULL UNIQUE,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_coach_invitations_token ON coach_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_coach_access_lookup ON coach_access(coach_id, trader_id, status);
```

### 2. `coach_access` Table (Schema refinement)
Existing table in `20261012000001_initial_schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS coach_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    invitation_id UUID REFERENCES coach_invitations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    permissions JSONB NOT NULL DEFAULT '{"read_trades": true, "read_analytics": true, "suggest_rules": true}'::jsonb,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT uq_coach_trader UNIQUE (trader_id, coach_id)
);
```

### 3. Strict Row-Level Security Policies

```sql
-- Enable RLS on coach_invitations
ALTER TABLE coach_invitations ENABLE ROW LEVEL SECURITY;

-- Coach can manage invitations they created
CREATE POLICY "coach_manage_own_invitations" ON coach_invitations
    FOR ALL
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

-- Authenticated traders can inspect an invitation by token
CREATE POLICY "traders_read_valid_invitations" ON coach_invitations
    FOR SELECT
    USING (status = 'pending' AND expires_at > NOW());

-- Refined Coach Access RLS:
-- 1. Traders can view their coaches; coaches can view their traders
CREATE POLICY "view_coach_access_parties" ON coach_access
    FOR SELECT
    USING (auth.uid() = trader_id OR auth.uid() = coach_id);

-- 2. Trader can insert/accept access for themselves
CREATE POLICY "trader_accept_coach_access" ON coach_access
    FOR INSERT
    WITH CHECK (auth.uid() = trader_id);

-- 3. Trader can revoke coach access at any time
CREATE POLICY "trader_revoke_coach_access" ON coach_access
    FOR UPDATE
    USING (auth.uid() = trader_id)
    WITH CHECK (auth.uid() = trader_id);

-- Read access to trader data by coach:
-- ONLY rows where coach_access has status = 'active'
-- If status is 'revoked' or 'pending', EXISTS returns FALSE and 0 rows are returned.
```

---

## Code Style & Architectural Conventions

```typescript
// Example: Strict server action handling consent acceptance with offline fallback support
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ConsentAcceptanceResult } from "./coach-types";

export async function acceptCoachConsentAction(inviteToken: string): Promise<ConsentAcceptanceResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to accept coach invitation." };
  }

  // 1. Fetch and validate invitation
  const { data: invite, error: inviteErr } = await supabase
    .from("coach_invitations")
    .select("*, coach:profiles!coach_id(id, display_name, email)")
    .eq("invite_token", inviteToken)
    .single();

  if (inviteErr || !invite) {
    return { success: false, error: "Invalid or expired invitation token." };
  }

  if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return { success: false, error: "This invitation link has expired or already been accepted." };
  }

  if (invite.coach_id === user.id) {
    return { success: false, error: "A coach cannot accept their own invitation link." };
  }

  // 2. Upsert coach_access record with status = 'active'
  const { error: accessErr } = await supabase
    .from("coach_access")
    .upsert({
      trader_id: user.id,
      coach_id: invite.coach_id,
      organization_id: invite.organization_id || null,
      invitation_id: invite.id,
      status: "active",
      granted_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: "trader_id,coach_id" });

  if (accessErr) {
    return { success: false, error: "Failed to establish coach consent record." };
  }

  // 3. Mark invite as accepted
  await supabase
    .from("coach_invitations")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  revalidatePath("/settings/coach");
  revalidatePath("/coach/traders");
  return { success: true, coachName: invite.coach?.display_name || "Assigned Coach" };
}
```

---

## Testing Strategy

### 1. Database & RLS Integration Tests (`services/analytics/tests/test_coach_access.py`)
- **Isolation Test 1: Active Consent**: When `coach_access.status == 'active'`, coach query to `trades` returns the trader's trades.
- **Isolation Test 2: Revoked Consent**: Immediately upon setting `coach_access.status = 'revoked'`, coach query to `trades` returns 0 rows.
- **Isolation Test 3: Cross-Tenant Isolation**: Coach B (not authorized for Trader A) querying Trader A's records receives 0 rows.
- **Isolation Test 4: Write Protection**: Coach attempting an `INSERT`, `UPDATE`, or `DELETE` on a trader's `trades` or `imports` table is strictly rejected by RLS (0 rows affected or permission denied).

### 2. Frontend Unit & Component Tests (`apps/web/tests/coach-consent.test.tsx`)
- Renders `InviteModal`, tests link generation, link copying to clipboard, and code display.
- Renders `ConsentScreen`, verifying clear presentation of coach credentials, explicit permitted disclosures, negative security assurances (no broker order placement, no password visibility), and interactive Accept / Decline actions.
- Renders `CoachConsentManager`, verifying roster of connected coaches, "Active" status pills, and the instantaneous "Revoke Access" trigger flow with confirmation dialog.

---

## Boundaries

- **Always**:
  - Require explicit affirmative trader action before `coach_access.status` transitions to `active`.
  - Display clear, non-technical plain language in the consent screen stating what the coach can and cannot see.
  - Provide an immediate, single-click "Revoke Access" action accessible directly from the trader's Settings.
  - Maintain offline mock store support in `coach-actions.ts` so all UI flows and unit tests function seamlessly in offline environments.
- **Ask First**:
  - Modifying existing RLS policies on tables other than `coach_access` or `coach_invitations`.
  - Adding external email delivery providers for coach invite notifications (handled in Phase 10 / Task 26).
- **Never**:
  - Permit coach write or execution access to trader trades, fills, or broker accounts.
  - Expose trader passwords, API keys, or raw bank details to coaches.
  - Allow a coach to bypass revocation or view data after `revoked_at` is populated.

---

## Success Criteria

1. **Invitation Generation**: A coach can click "Invite Student", generating a unique URL (`/coach/consent?token=...`) and alphanumeric code with a 7-day expiration.
2. **Transparent Consent Interface**: Navigating to the invitation link renders the consent screen with coach identity, permissions list, negative assurances, and Accept/Decline controls.
3. **Revocation Control**: Navigating to `/settings/coach` lists active coaches with an instant "Revoke Access" action that changes status to `revoked`.
4. **RLS Authorization**: Database tests prove coaches can only read trades when consent is `active`, and receive 0 rows once revoked.
5. **Quality Gate**: All Vitest tests (`npm test --prefix apps/web -- --run`), Pytest suite (`pytest services/analytics/tests/test_coach_access.py`), and Next.js production build (`npm run build --prefix apps/web`) pass with 0 errors.

---

## Open Questions

1. **Role Access Control**: Should navigation to `/coach/traders` be restricted exclusively to users whose `profiles.role` is `'coach'`, `'client_admin'`, or `'platform_admin'`, with a banner for regular traders to apply/switch to coach mode?
2. **Organization Context**: If a coach belongs to an organization, should the organization name be prominently displayed on the student invitation banner?
3. **Invitation Expiry**: Default is set to 7 days. Is this duration appropriate, or should coaches be able to select 24 hours, 7 days, or 30 days?
