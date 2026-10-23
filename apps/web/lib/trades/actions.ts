"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ImportRecord, IngestionSummary, RowIssue } from "./types";
import type { RoundTripTradeView, PsychologicalTag } from "./trade-filters";

export type { ImportRecord, IngestionSummary, RowIssue };

/**
 * Retrieves round-trip trades for the authenticated user from Supabase.
 * If user is offline or has no saved trades, falls back to DEFAULT_TRADE_LOG.
 */
export async function getUserTradesAction(): Promise<{
  trades: RoundTripTradeView[];
  isFromDb: boolean;
  error?: string | null;
}> {
  try {
    let supabase: any = null;
    let user: any = null;
    try {
      supabase = createClient();
      const userRes = await supabase.auth.getUser();
      user = userRes.data?.user;
    } catch {
      // Non-request lifecycle / unit testing environment
    }

    if (!user) {
      return { trades: [], isFromDb: false, error: null };
    }

    // Auto-purge any legacy mock-seeded trades that were inserted into the database without an import_id
    try {
      await supabase
        .from("trades")
        .delete()
        .eq("user_id", user.id)
        .is("import_id", null);
    } catch {
      // Best-effort cleanup
    }

    // Strictly query real trades originating from an actual broker tradebook import
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .not("import_id", "is", null)
      .order("entry_time", { ascending: false });

    if (error) {
      return { trades: [], isFromDb: false, error: error.message };
    }

    const tradeRows = data || [];

    if (tradeRows.length === 0) {
      return { trades: [], isFromDb: true, error: null };
    }

    const trades: RoundTripTradeView[] = tradeRows.map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      segment: (t.segment && t.segment.includes("EQUITY") ? "EQUITY" : "FNO") as any,
      entryTime: t.entry_time,
      exitTime: t.exit_time,
      quantity: Number(t.quantity),
      entryPrice: Number(t.entry_price),
      exitPrice: Number(t.exit_price),
      grossPnl: Number(t.gross_pnl),
      charges: Number(t.charges),
      netPnl: Number(t.net_pnl),
      returnPct: Number(
        (((Number(t.exit_price) - Number(t.entry_price)) / Number(t.entry_price)) * 100).toFixed(2)
      ),
      tags: (t.tags || []) as PsychologicalTag[],
      notes: t.notes || undefined,
    }));

    return { trades, isFromDb: true, error: null };
  } catch {
    return { trades: [], isFromDb: false, error: null };
  }
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
 * Deletes an import and its corresponding storage file and cascaded raw_fills.
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

    // 1. Remove associated paired trades for this import batch
    await supabase
      .from("trades")
      .delete()
      .eq("import_id", importId)
      .eq("user_id", user.id);

    // 2. Invalidate computed stats snapshots for the user
    await supabase
      .from("stats_snapshots")
      .delete()
      .eq("user_id", user.id);

    // 3. Remove raw file from storage bucket
    const storagePath = `${user.id}/${importId}.csv`;
    await supabase.storage.from("trade-imports").remove([storagePath]);

    // 4. Remove from imports table (foreign key cascades raw_fills)
    const { error: dbError } = await supabase
      .from("imports")
      .delete()
      .eq("id", importId)
      .eq("user_id", user.id);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath("/imports");
    revalidatePath("/trades");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/reconciliation");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete import";
    return { success: false, error: message };
  }
}

/**
 * Validates, deduplicates, and commits fills into raw_fills, updating imports record.
 */
export async function processImportBatch(
  importId: string,
  customMapping?: Record<string, string>
): Promise<{
  summary?: IngestionSummary;
  importRecord?: ImportRecord;
  error?: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // 1. Fetch import record to get file_name
    const { data: importRec, error: fetchErr } = await supabase
      .from("imports")
      .select("*")
      .eq("id", importId)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !importRec) {
      return { error: "Import record not found." };
    }

    // 2. Download sanitized CSV from storage
    const storagePath = `${user.id}/${importId}.csv`;
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from("trade-imports")
      .download(storagePath);

    if (downloadErr || !fileBlob) {
      return { error: `Could not retrieve file from storage: ${downloadErr?.message || "Not found"}` };
    }

    const csvContent = await fileBlob.text();

    // 3. Call Analytics Service Parser Endpoint (with fallback)
    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || "http://127.0.0.1:8000";
    let parseResult: any;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${analyticsUrl}/api/v1/trades/parse-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: importRec.file_name,
          content: csvContent,
          custom_mapping: customMapping || null,
          import_id: importId,
          user_id: user.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Analytics service returned HTTP ${response.status}`);
      }

      parseResult = await response.json();
    } catch (parseErr) {
      console.warn("Analytics service unavailable, falling back to TypeScript universal parser:", parseErr);
      const { parseTradeCsvFallback } = await import("./trade-parser");
      parseResult = parseTradeCsvFallback(csvContent, importRec.file_name, customMapping);
    }

    const fills = parseResult.fills || [];
    const parseErrors = parseResult.error_report || [];

    // 4. Query existing trade IDs for this user to perform deduplication
    const tradeIds = fills.map((f: any) => f.trade_id).filter(Boolean);
    let existingTradeIds = new Set<string>();

    if (tradeIds.length > 0) {
      const { data: existingRows } = await supabase
        .from("raw_fills")
        .select("trade_id")
        .eq("user_id", user.id)
        .in("trade_id", tradeIds);

      if (existingRows) {
        existingTradeIds = new Set(existingRows.map((r: any) => r.trade_id));
      }
    }

    // 5. Separate duplicates (database + intra-file) from unique fills
    const seenInBatch = new Set<string>();
    const uniqueFills: any[] = [];
    const issues: RowIssue[] = [];

    // Map parsing errors
    for (const err of parseErrors) {
      issues.push({
        row_index: err.row_index,
        issue_type: "CORRUPT_DATA",
        message: err.error || "Failed to parse trade row",
        raw_snippet: err.raw_row,
      });
    }

    // Deduplicate fills
    for (let i = 0; i < fills.length; i++) {
      const fill = fills[i];
      const rowIdx = i + 1;

      if (existingTradeIds.has(fill.trade_id)) {
        issues.push({
          row_index: rowIdx,
          issue_type: "DUPLICATE_FILL",
          message: `Fill with trade_id '${fill.trade_id}' already exists in your journal. Skipped.`,
          trade_id: fill.trade_id,
        });
      } else if (seenInBatch.has(fill.trade_id)) {
        issues.push({
          row_index: rowIdx,
          issue_type: "DUPLICATE_FILL",
          message: `Duplicate trade_id '${fill.trade_id}' found multiple times in the same CSV file. Skipped.`,
          trade_id: fill.trade_id,
        });
      } else {
        seenInBatch.add(fill.trade_id);
        uniqueFills.push({
          import_id: importId,
          user_id: user.id,
          trade_date: fill.trade_date,
          fill_time: fill.fill_time,
          symbol: fill.symbol,
          trade_type: fill.trade_type,
          quantity: fill.quantity,
          price: fill.price,
          order_id: fill.order_id || null,
          trade_id: fill.trade_id,
          raw_data: fill.raw_data || {},
        });
      }
    }

    // 6. Bulk insert unique fills into PostgreSQL
    if (uniqueFills.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < uniqueFills.length; i += batchSize) {
        const batch = uniqueFills.slice(i, i + batchSize);
        const { error: insertErr } = await supabase.from("raw_fills").insert(batch);
        if (insertErr) {
          console.error("Batch insert raw_fills error:", insertErr.message);
          throw new Error(`Failed to insert raw fills: ${insertErr.message}`);
        }
      }
    }

    const totalRows = fills.length + parseErrors.length;
    const importedRows = uniqueFills.length;
    const skippedRows = totalRows - importedRows;

    const status: "completed" | "failed" =
      importedRows > 0 || (fills.length > 0 && parseErrors.length === 0)
        ? "completed"
        : "failed";

    // 7. Finalize imports table metadata
    const summary: IngestionSummary = {
      import_id: importId,
      user_id: user.id,
      broker: parseResult.broker || "GENERAL",
      file_name: importRec.file_name,
      status,
      total_rows: totalRows,
      imported_rows: importedRows,
      skipped_rows: skippedRows,
      error_report: issues,
    };

    const { data: updatedRecord } = await supabase
      .from("imports")
      .update({
        broker: summary.broker,
        status: summary.status,
        total_rows: summary.total_rows,
        imported_rows: summary.imported_rows,
        skipped_rows: summary.skipped_rows,
        error_report: summary.error_report,
      })
      .eq("id", importId)
      .eq("user_id", user.id)
      .select()
      .single();

    revalidatePath("/imports");
    revalidatePath("/dashboard");

    const finalRecord: ImportRecord = (updatedRecord || {
      id: importId,
      user_id: user.id,
      broker: summary.broker,
      file_name: importRec.file_name,
      status: summary.status,
      total_rows: summary.total_rows,
      imported_rows: summary.imported_rows,
      skipped_rows: summary.skipped_rows,
      error_report: summary.error_report,
      created_at: importRec.created_at || new Date().toISOString(),
    }) as ImportRecord;

    return { summary, importRecord: finalRecord };
  } catch (err) {
    console.error("processImportBatch exception:", err);
    const message = err instanceof Error ? err.message : "Failed to process import batch";
    return { error: message };
  }
}

/**
 * Resets the authenticated user's trade journal by purging all trades, fills, and imports.
 */
export async function resetAllTradesAction(): Promise<{ success: boolean; error?: string | null }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    await supabase.from("trades").delete().eq("user_id", user.id);
    await supabase.from("raw_fills").delete().eq("user_id", user.id);
    await supabase.from("imports").delete().eq("user_id", user.id);

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reset trades" };
  }
}
