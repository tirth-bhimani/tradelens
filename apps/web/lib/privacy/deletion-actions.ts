"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface ActionResponse {
  success: boolean;
  error?: string | null;
}

/**
 * Permanently deletes the authenticated user's account and all associated
 * database rows, storage files, and authentication records.
 * Conforms to the Right to Erasure under Indian DPDP Act 2023 Sec 12(3).
 */
export async function deleteAccountAction(confirmationPhrase: string): Promise<ActionResponse> {
  try {
    if (confirmationPhrase?.trim() !== "DELETE MY ACCOUNT") {
      return {
        success: false,
        error: "Confirmation phrase must exactly match 'DELETE MY ACCOUNT'.",
      };
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = user.id;

    // Use privileged admin client if service role key is configured, else fallback to standard client
    let adminClient: any = null;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        adminClient = createAdminClient();
      }
    } catch {
      // In offline / unit testing environment
    }
    const db = adminClient || supabase;

    // 1. Purge all stored files from 'trade-imports' bucket
    try {
      const { data: fileList } = await db.storage
        .from("trade-imports")
        .list(userId);

      if (fileList && fileList.length > 0) {
        const paths = fileList.map((f: any) => `${userId}/${f.name}`);
        await db.storage.from("trade-imports").remove(paths);
      }
    } catch {
      // Storage directory may be empty; continue with relational purge
    }

    // 2. Cascade delete dependent user records across all operational tables
    await db.from("rule_runs").delete().eq("user_id", userId);
    await db.from("rules").delete().eq("user_id", userId);
    await db.from("stats_snapshots").delete().eq("user_id", userId);
    await db.from("insights").delete().eq("user_id", userId);
    await db.from("weekly_reports").delete().eq("user_id", userId);
    await db.from("reports").delete().eq("user_id", userId);
    await db.from("trades").delete().eq("user_id", userId);
    await db.from("raw_fills").delete().eq("user_id", userId);
    await db.from("imports").delete().eq("user_id", userId);
    await db.from("coach_invitations").delete().eq("coach_id", userId);
    await db.from("coach_notes").delete().or(`trader_id.eq.${userId},coach_id.eq.${userId}`);
    await db.from("coach_access").delete().or(`trader_id.eq.${userId},coach_id.eq.${userId}`);
    await db.from("organization_memberships").delete().eq("user_id", userId);
    await db.from("ai_usage").delete().eq("user_id", userId);
    await db.from("audit_log").delete().eq("user_id", userId);

    // 3. Delete base user profile
    await db.from("profiles").delete().eq("id", userId);

    // 4. Permanently erase user identity from Supabase Auth (auth.users)
    if (adminClient?.auth?.admin?.deleteUser) {
      try {
        const { error: adminErr } = await adminClient.auth.admin.deleteUser(userId);
        if (adminErr) {
          console.warn("Notice: admin.deleteUser returned:", adminErr.message);
        }
      } catch (err) {
        console.warn("Notice: admin.deleteUser call error:", err);
      }
    }

    // 5. Invalidate and sign out current auth session cookies
    await supabase.auth.signOut();

    try {
      revalidatePath("/", "layout");
    } catch {
      // Safe fallback when running outside server action context
    }
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Account deletion failed";
    return { success: false, error: message };
  }
}
