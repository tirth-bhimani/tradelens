"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ImportRecord {
  id: string;
  user_id: string;
  broker: string;
  file_name: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_report: Array<{ warning?: string; error?: string; row?: number }>;
  created_at: string;
}

/**
 * Retrieves the recent import records for the authenticated user.
 */
export async function getRecentImports(): Promise<{
  imports: ImportRecord[];
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { imports: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("imports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { imports: [], error: error.message };
    }

    return { imports: (data as ImportRecord[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load imports";
    return { imports: [], error: message };
  }
}

/**
 * Deletes an import and its corresponding storage file.
 */
export async function deleteImport(importId: string): Promise<{
  success: boolean;
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // 1. Remove from storage bucket
    const storagePath = `${user.id}/${importId}.csv`;
    await supabase.storage.from("trade-imports").remove([storagePath]);

    // 2. Remove from database (cascades raw_fills and unpairs trades)
    const { error: dbError } = await supabase
      .from("imports")
      .delete()
      .eq("id", importId)
      .eq("user_id", user.id);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath("/imports");
    revalidatePath("/dashboard");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete import";
    return { success: false, error: message };
  }
}
