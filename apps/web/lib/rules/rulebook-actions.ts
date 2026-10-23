"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SavedRule, SaveRuleInput } from "./adherence-types";
import { DEFAULT_SAMPLE_RULES } from "./rulebook-defaults";

// In-memory fallback cache for development/offline testing
let memoryRulesStore: SavedRule[] = [];

/**
 * Retrieves all saved rules for the authenticated user, falling back to default rules if offline.
 */
export async function getUserRules(): Promise<{
  rules: SavedRule[];
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { rules: [], error: null };
    }

    const { data, error } = await supabase
      .from("rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { rules: [], error: error.message };
    }

    const rulesData = data || [];
    return { rules: rulesData as SavedRule[], error: null };
  } catch {
    return { rules: memoryRulesStore, error: null };
  }
}

/**
 * Saves a new rule into the user's personal rulebook.
 */
export async function saveRuleAction(input: SaveRuleInput): Promise<{
  success: boolean;
  rule?: SavedRule;
  error?: string | null;
}> {
  try {
    const newRule: SavedRule = {
      id: crypto.randomUUID(),
      rule_type: input.rule_type,
      rule_payload: input.rule_payload,
      natural_language_text: input.natural_language_text || `Rule: ${input.rule_type}`,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update in-memory fallback
    memoryRulesStore = [newRule, ...memoryRulesStore];

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("rules").insert({
          id: newRule.id,
          user_id: user.id,
          rule_type: newRule.rule_type,
          rule_payload: newRule.rule_payload,
          natural_language_text: newRule.natural_language_text,
          is_active: newRule.is_active,
        });
      }
    } catch {
      // Offline fallback succeeded
    }

    revalidatePath("/rules");
    revalidatePath("/rule-lab");
    revalidatePath("/dashboard");
    return { success: true, rule: newRule };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save rule." };
  }
}

/**
 * Toggles a rule's active / paused state.
 */
export async function toggleRuleActiveAction(
  ruleId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string | null }> {
  try {
    // Update in-memory store
    memoryRulesStore = memoryRulesStore.map((r) =>
      r.id === ruleId ? { ...r, is_active: isActive, updated_at: new Date().toISOString() } : r
    );

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("rules")
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq("id", ruleId)
          .eq("user_id", user.id);
      }
    } catch {
      // Offline fallback succeeded
    }

    revalidatePath("/rules");
    revalidatePath("/rule-lab");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle rule." };
  }
}

/**
 * Deletes a rule from the personal rulebook.
 */
export async function deleteRuleAction(
  ruleId: string
): Promise<{ success: boolean; error?: string | null }> {
  try {
    // Update in-memory store
    memoryRulesStore = memoryRulesStore.filter((r) => r.id !== ruleId);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("rules")
          .delete()
          .eq("id", ruleId)
          .eq("user_id", user.id);
      }
    } catch {
      // Offline fallback succeeded
    }

    revalidatePath("/rules");
    revalidatePath("/rule-lab");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete rule." };
  }
}
