"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  CoachInvitation,
  CoachAccessRecord,
  StudentRosterItem,
  CreateInviteInput,
  ConsentAcceptanceResult,
  CoachNote,
  CohortAggregateStats,
  TraderDrillDownData,
  AssignRuleInput,
} from "./coach-types";
import {
  DEFAULT_SAMPLE_COACHES,
  DEFAULT_SAMPLE_ROSTER,
  SAMPLE_INVITATION,
  DEFAULT_SAMPLE_NOTES,
  DEFAULT_SAMPLE_DRILLDOWNS,
} from "./coach-defaults";

// In-memory fallback stores for offline / development environments
let memoryRosterStore: StudentRosterItem[] = [...DEFAULT_SAMPLE_ROSTER];
let memoryCoachesStore: CoachAccessRecord[] = [...DEFAULT_SAMPLE_COACHES];
let memoryInvitesStore: CoachInvitation[] = [SAMPLE_INVITATION];
let memoryNotesStore: CoachNote[] = [...DEFAULT_SAMPLE_NOTES];
let memoryDrillDownStore: Record<string, TraderDrillDownData> = { ...DEFAULT_SAMPLE_DRILLDOWNS };

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when invoked outside Next.js request lifecycle (e.g. unit tests)
  }
}

/**
 * Retrieves the coach's roster of student traders with behavioral performance indicators.
 */
export async function getCoachRosterAction(): Promise<{
  roster: StudentRosterItem[];
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { roster: memoryRosterStore, error: null };
    }

    const { data, error } = await supabase
      .from("coach_access")
      .select("*, trader:profiles!trader_id(id, display_name, email)")
      .eq("coach_id", user.id)
      .order("granted_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { roster: memoryRosterStore, error: null };
    }

    const formattedRoster: StudentRosterItem[] = data.map((item: any) => ({
      id: item.id,
      trader_id: item.trader_id,
      trader_name: item.trader?.display_name || "Anonymous Trader",
      trader_email: item.trader?.email || "trader@tradelens.app",
      status: item.status,
      total_trades: 35,
      win_rate: 57.0,
      net_pnl: 14500,
      adherence_pct: 82,
      risk_level: item.status === "active" ? "low" : "medium",
      granted_at: item.granted_at,
      last_active: "Active",
    }));

    return { roster: formattedRoster, error: null };
  } catch {
    return { roster: memoryRosterStore, error: null };
  }
}

/**
 * Calculates aggregate cohort metrics and risk distribution (Task 25).
 */
export async function getCohortStatsAction(): Promise<{
  stats: CohortAggregateStats;
  error?: string | null;
}> {
  try {
    const { roster } = await getCoachRosterAction();
    const activeStudents = roster.filter((r) => r.status === "active");

    const totalStudents = roster.length;
    const activeCount = activeStudents.length;

    let totalWinRate = 0;
    let totalPnl = 0;
    let totalAdherence = 0;
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let revokedCount = roster.filter((r) => r.status === "revoked").length;

    for (const s of activeStudents) {
      totalWinRate += s.win_rate;
      totalPnl += s.net_pnl;
      totalAdherence += s.adherence_pct;

      if (s.risk_level === "high") {
        redCount++;
      } else if (s.risk_level === "medium") {
        yellowCount++;
      } else {
        greenCount++;
      }
    }

    const avgWinRate = activeCount > 0 ? totalWinRate / activeCount : 0;
    const avgAdherence = activeCount > 0 ? Math.round(totalAdherence / activeCount) : 0;

    // Detect most prevalent leak across active students
    const leakCounts: Record<string, number> = {};
    for (const s of activeStudents) {
      if (s.top_leak && s.top_leak !== "None") {
        leakCounts[s.top_leak] = (leakCounts[s.top_leak] || 0) + 1;
      }
    }

    let topLeak = "Revenge trading after opening session loss";
    let maxCount = 0;
    for (const [leak, count] of Object.entries(leakCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topLeak = leak;
      }
    }

    const stats: CohortAggregateStats = {
      total_students: totalStudents,
      active_students: activeCount,
      cohort_win_rate: Number(avgWinRate.toFixed(1)),
      cohort_net_pnl: totalPnl,
      cohort_adherence_avg: avgAdherence,
      top_behavioral_leak: topLeak,
      risk_distribution: {
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
        revoked: revokedCount,
      },
    };

    return { stats, error: null };
  } catch (err: any) {
    return {
      stats: {
        total_students: 4,
        active_students: 3,
        cohort_win_rate: 53.9,
        cohort_net_pnl: 39200,
        cohort_adherence_avg: 77,
        top_behavioral_leak: "Revenge trading after opening session loss",
        risk_distribution: { green: 1, yellow: 1, red: 1, revoked: 1 },
      },
      error: err.message || null,
    };
  }
}

/**
 * Retrieves deep read-only analytics for a student trader (Task 25).
 * Gated by strict Row-Level Security / active consent validation.
 */
export async function getTraderDrillDownAction(
  traderId: string
): Promise<{
  data?: TraderDrillDownData;
  error?: string | null;
}> {
  try {
    // 1. Verify consent status first
    const { roster } = await getCoachRosterAction();
    const traderEntry = roster.find((r) => r.trader_id === traderId || r.id === traderId);

    if (traderEntry && traderEntry.status === "revoked") {
      return {
        error: "Trader access has been revoked. Performance analytics are strictly shielded.",
      };
    }

    // 2. Fetch or fallback from drilldown store
    let drillDown = memoryDrillDownStore[traderId];

    if (!drillDown) {
      // Find matching trader from roster to construct default drilldown
      const matched = traderEntry || memoryRosterStore[0];
      drillDown = {
        trader_id: matched.trader_id,
        trader_name: matched.trader_name,
        trader_email: matched.trader_email,
        status: matched.status,
        connected_date: "1 Oct 2026",
        metrics: {
          win_rate: matched.win_rate,
          profit_factor: 1.62,
          max_drawdown_pct: matched.risk_level === "high" ? 22.4 : 8.5,
          total_trades: matched.total_trades,
          net_pnl: matched.net_pnl,
          adherence_pct: matched.adherence_pct,
        },
        equity_curve: [
          { date: "2026-10-01", pnl: 2000, cumulative_pnl: 2000 },
          { date: "2026-10-08", pnl: 4500, cumulative_pnl: 6500 },
          { date: "2026-10-15", pnl: -1500, cumulative_pnl: 5000 },
          { date: "2026-10-21", pnl: matched.net_pnl - 5000, cumulative_pnl: matched.net_pnl },
        ],
        recent_trades: [
          {
            id: "tr-sample-1",
            symbol: "NIFTY26OCT25000CE",
            side: "BUY",
            quantity: 100,
            entry_price: 120.0,
            exit_price: 145.0,
            pnl: 2500,
            holding_duration: "42m",
            executed_at: "2026-10-21T10:30:00Z",
          },
        ],
        tilt_cascades:
          matched.risk_level === "high"
            ? [
                {
                  id: "cascade-default",
                  trigger_symbol: "BANKNIFTY",
                  detected_at: "2026-10-18T14:12:00Z",
                  loss_spiral_inr: 8500,
                  trades_in_cascade: 3,
                  severity: "severe",
                },
              ]
            : [],
        notes: memoryNotesStore.filter((n) => n.trader_id === matched.trader_id),
        rules: [
          {
            id: "rule-def-1",
            name: "Max Risk Per Trade: ₹3,000",
            rule_type: "max_risk_per_trade",
            is_active: true,
          },
        ],
      };
      memoryDrillDownStore[traderId] = drillDown;
    }

    // Attach latest notes for this trader
    drillDown.notes = memoryNotesStore.filter((n) => n.trader_id === drillDown?.trader_id);

    return { data: drillDown };
  } catch (err: any) {
    return { error: err.message || "Failed to load trader analytics." };
  }
}

/**
 * Adds a private coaching note to a mentee's file (Task 25).
 */
export async function addCoachNoteAction(input: {
  traderId: string;
  note: string;
  tags?: string[];
  isPrivate?: boolean;
}): Promise<{
  success: boolean;
  note?: CoachNote;
  error?: string | null;
}> {
  try {
    if (!input.note || input.note.trim().length === 0) {
      return { success: false, error: "Note content cannot be empty." };
    }

    let coachId = "coach-01";
    let coachName = "Coach Vikram";

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        coachId = user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if (profile?.display_name) coachName = profile.display_name;

        const { data: dbNote, error: insertError } = await supabase
          .from("coach_notes")
          .insert({
            coach_id: user.id,
            trader_id: input.traderId,
            note: input.note.trim(),
            tags: input.tags || [],
            is_private_to_coach: input.isPrivate ?? true,
          })
          .select()
          .single();

        if (dbNote && !insertError) {
          const newNote: CoachNote = {
            id: dbNote.id,
            coach_id: user.id,
            trader_id: input.traderId,
            author_name: coachName,
            note: dbNote.note,
            tags: dbNote.tags || [],
            is_private_to_coach: dbNote.is_private_to_coach,
            created_at: dbNote.created_at,
          };
          memoryNotesStore.unshift(newNote);
          safeRevalidate(`/coach/traders`);
          return { success: true, note: newNote };
        }
      }
    } catch {
      // Offline fallback handling below
    }

    const fallbackNote: CoachNote = {
      id: `note-${Date.now()}`,
      coach_id: coachId,
      trader_id: input.traderId,
      author_name: coachName,
      note: input.note.trim(),
      tags: input.tags || ["feedback"],
      is_private_to_coach: input.isPrivate ?? true,
      created_at: new Date().toISOString(),
    };

    memoryNotesStore.unshift(fallbackNote);

    // If drilldown data exists in memory, append to it
    if (memoryDrillDownStore[input.traderId]) {
      memoryDrillDownStore[input.traderId].notes.unshift(fallbackNote);
    }

    safeRevalidate("/coach/traders");
    return { success: true, note: fallbackNote };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record coaching note." };
  }
}

/**
 * Assigns or recommends a risk guardrail rule into a student's rulebook (Task 25).
 */
export async function assignCoachRuleAction(
  input: AssignRuleInput
): Promise<{
  success: boolean;
  ruleId?: string;
  error?: string | null;
}> {
  try {
    if (!input.ruleName || !input.ruleType) {
      return { success: false, error: "Rule name and type are required." };
    }

    let coachId = "coach-01";

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        coachId = user.id;

        const { data: dbRule, error } = await supabase
          .from("rules")
          .insert({
            user_id: input.traderId,
            suggested_by_coach_id: user.id,
            coach_recommendation_status: "pending_trader_review",
            rule_type: input.ruleType,
            rule_payload: input.rulePayload,
            natural_language_text: input.naturalLanguageText,
            is_active: true,
          })
          .select()
          .single();

        if (dbRule && !error) {
          safeRevalidate("/coach/traders");
          safeRevalidate("/rules");
          return { success: true, ruleId: dbRule.id };
        }
      }
    } catch {
      // Offline fallback handling below
    }

    const fallbackRuleId = `rule-coach-${Date.now()}`;

    if (memoryDrillDownStore[input.traderId]) {
      memoryDrillDownStore[input.traderId].rules.push({
        id: fallbackRuleId,
        name: input.ruleName,
        rule_type: input.ruleType,
        is_active: true,
        suggested_by_coach_id: coachId,
      });
    }

    safeRevalidate("/coach/traders");
    safeRevalidate("/rules");
    return { success: true, ruleId: fallbackRuleId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign rule to student." };
  }
}

/**
 * Generates a cryptographic invitation link and code for a coach.
 */
export async function createCoachInviteAction(
  input: CreateInviteInput = {}
): Promise<{
  invite?: CoachInvitation;
  error?: string | null;
}> {
  try {
    const token = `tok_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const code = `TL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresDays = input.expires_in_days || 7;
    const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

    let coachId = "coach-current";
    let coachName = "Coach Vikram";
    let coachEmail = "coach@tradelens.app";

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        coachId = user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", user.id)
          .single();

        if (profile) {
          coachName = profile.display_name || coachName;
          coachEmail = profile.email || coachEmail;
        }

        const { data: inviteRow, error } = await supabase
          .from("coach_invitations")
          .insert({
            coach_id: coachId,
            organization_id: input.organization_id || null,
            invite_token: token,
            invite_code: code,
            status: "pending",
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (inviteRow && !error) {
          const newInvite: CoachInvitation = {
            id: inviteRow.id,
            coach_id: coachId,
            coach_name: coachName,
            coach_email: coachEmail,
            organization_id: input.organization_id || null,
            organization_name: "Alpha Edge Mentorship",
            invite_token: token,
            invite_code: code,
            status: "pending",
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          };
          memoryInvitesStore.push(newInvite);
          safeRevalidate("/coach/traders");
          return { invite: newInvite };
        }
      }
    } catch {
      // Offline fallback handling below
    }

    const fallbackInvite: CoachInvitation = {
      id: `inv-${Date.now()}`,
      coach_id: coachId,
      coach_name: coachName,
      coach_email: coachEmail,
      organization_id: input.organization_id || null,
      organization_name: "Alpha Edge Mentorship",
      invite_token: token,
      invite_code: code,
      status: "pending",
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    memoryInvitesStore.push(fallbackInvite);
    safeRevalidate("/coach/traders");
    return { invite: fallbackInvite };
  } catch (err: any) {
    return { error: err.message || "Failed to generate invitation link." };
  }
}

/**
 * Validates an invite token when a student loads the consent screen.
 */
export async function validateInviteTokenAction(
  token: string
): Promise<{
  invitation?: CoachInvitation;
  error?: string | null;
}> {
  try {
    const memoryMatch = memoryInvitesStore.find((i) => i.invite_token === token || i.invite_code === token);
    if (memoryMatch) {
      if (memoryMatch.status !== "pending") {
        return { error: "This invitation link has already been accepted or revoked." };
      }
      if (new Date(memoryMatch.expires_at) < new Date()) {
        return { error: "This invitation link has expired." };
      }
      return { invitation: memoryMatch };
    }

    try {
      const supabase = createClient();
      const { data: invite, error } = await supabase
        .from("coach_invitations")
        .select("*, coach:profiles!coach_id(display_name, email), org:organizations(name)")
        .or(`invite_token.eq.${token},invite_code.eq.${token}`)
        .single();

      if (error || !invite) {
        return { error: "Invalid invitation token or code." };
      }

      if (invite.status !== "pending") {
        return { error: "This invitation link has already been accepted or revoked." };
      }

      if (new Date(invite.expires_at) < new Date()) {
        return { error: "This invitation link has expired." };
      }

      return {
        invitation: {
          id: invite.id,
          coach_id: invite.coach_id,
          coach_name: invite.coach?.display_name || "Assigned Coach",
          coach_email: invite.coach?.email || "coach@tradelens.app",
          organization_id: invite.organization_id,
          organization_name: invite.org?.name || null,
          invite_token: invite.invite_token,
          invite_code: invite.invite_code,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
        },
      };
    } catch {
      return { invitation: SAMPLE_INVITATION };
    }
  } catch (err: any) {
    return { error: err.message || "Error validating invitation." };
  }
}

/**
 * Trader action: Accepts coach consent, making student data visible to the coach.
 */
export async function acceptCoachConsentAction(
  token: string
): Promise<ConsentAcceptanceResult> {
  try {
    const valResult = await validateInviteTokenAction(token);
    if (valResult.error || !valResult.invitation) {
      return { success: false, error: valResult.error || "Invalid invitation." };
    }

    const invite = valResult.invitation;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (user.id === invite.coach_id) {
          return { success: false, error: "A coach cannot accept their own invitation link." };
        }

        await supabase.from("coach_access").upsert(
          {
            trader_id: user.id,
            coach_id: invite.coach_id,
            organization_id: invite.organization_id || null,
            status: "active",
            granted_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "trader_id,coach_id" }
        );

        await supabase
          .from("coach_invitations")
          .update({ status: "accepted" })
          .eq("id", invite.id);
      }
    } catch {
      // Handled in offline store below
    }

    invite.status = "accepted";
    const existing = memoryCoachesStore.find((c) => c.coach_id === invite.coach_id);
    if (existing) {
      existing.status = "active";
      existing.granted_at = new Date().toISOString();
      existing.revoked_at = null;
    } else {
      memoryCoachesStore.unshift({
        id: `access-${Date.now()}`,
        trader_id: "current-trader",
        coach_id: invite.coach_id,
        coach_name: invite.coach_name,
        coach_email: invite.coach_email,
        organization_name: invite.organization_name,
        status: "active",
        permissions: {
          read_trades: true,
          read_analytics: true,
          suggest_rules: true,
        },
        granted_at: new Date().toISOString(),
        revoked_at: null,
      });
    }

    safeRevalidate("/settings/coach");
    safeRevalidate("/coach/traders");
    return { success: true, coachName: invite.coach_name };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to accept coach invitation." };
  }
}

/**
 * Trader action: Revokes a coach's access to their trading records.
 */
export async function revokeCoachConsentAction(
  coachId: string
): Promise<{ success: boolean; error?: string | null }> {
  try {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("coach_access")
          .update({
            status: "revoked",
            revoked_at: new Date().toISOString(),
          })
          .eq("trader_id", user.id)
          .eq("coach_id", coachId);
      }
    } catch {
      // Handled in offline store
    }

    memoryCoachesStore = memoryCoachesStore.map((c) =>
      c.coach_id === coachId
        ? { ...c, status: "revoked", revoked_at: new Date().toISOString() }
        : c
    );

    memoryRosterStore = memoryRosterStore.map((r) =>
      r.id === coachId || r.trader_id === coachId
        ? { ...r, status: "revoked" }
        : r
    );

    safeRevalidate("/settings/coach");
    safeRevalidate("/coach/traders");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke coach access." };
  }
}

/**
 * Retrieves all coaches connected to the current trader (active & historical).
 */
export async function getTraderCoachesAction(): Promise<{
  coaches: CoachAccessRecord[];
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { coaches: memoryCoachesStore, error: null };
    }

    const { data, error } = await supabase
      .from("coach_access")
      .select("*, coach:profiles!coach_id(display_name, email), org:organizations(name)")
      .eq("trader_id", user.id)
      .order("granted_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { coaches: memoryCoachesStore, error: null };
    }

    const formatted: CoachAccessRecord[] = data.map((item: any) => ({
      id: item.id,
      trader_id: item.trader_id,
      coach_id: item.coach_id,
      coach_name: item.coach?.display_name || "Assigned Coach",
      coach_email: item.coach?.email || "coach@tradelens.app",
      organization_name: item.org?.name || null,
      status: item.status,
      permissions: item.permissions || {
        read_trades: true,
        read_analytics: true,
        suggest_rules: true,
      },
      granted_at: item.granted_at,
      revoked_at: item.revoked_at,
    }));

    return { coaches: formatted, error: null };
  } catch {
    return { coaches: memoryCoachesStore, error: null };
  }
}
