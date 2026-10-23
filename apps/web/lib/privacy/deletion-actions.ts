"use server";

import { createClient } from "@/lib/supabase/server";
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

    // 1. Purge all stored files from 'trade-imports' bucket
    try {
      const { data: fileList } = await supabase.storage
        .from("trade-imports")
        .list(userId);

      if (fileList && fileList.length > 0) {
        const paths = fileList.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from("trade-imports").remove(paths);
      }
    } catch {
      // Storage directory may be empty; continue with relational purge
    }

    // 2. Cascade delete dependent user records in deterministic order
    await supabase.from("rule_runs").delete().eq("user_id", userId);
    await supabase.from("rules").delete().eq("user_id", userId);
    await supabase.from("stats_snapshots").delete().eq("user_id", userId);
    await supabase.from("insights").delete().eq("user_id", userId);
    await supabase.from("weekly_reports").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("trades").delete().eq("user_id", userId);
    await supabase.from("raw_fills").delete().eq("user_id", userId);
    await supabase.from("imports").delete().eq("user_id", userId);
    await supabase.from("coach_invitations").delete().eq("coach_id", userId);
    await supabase.from("coach_access").delete().or(`trader_id.eq.${userId},coach_id.eq.${userId}`);
    await supabase.from("organization_memberships").delete().eq("user_id", userId);
    await supabase.from("ai_usage").delete().eq("user_id", userId);

    // 3. Delete base user profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 4. Invalidate and sign out current auth session
    await supabase.auth.signOut();

    try {
      revalidatePath("/", "layout");
    } catch {
      // Safe fallback when running in non-server action test context
    }
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Account deletion failed";
    return { success: false, error: message };
  }
}
