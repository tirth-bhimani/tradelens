import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateUserExportZip } from "@/lib/privacy/export-generator";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/export
 * Generates and streams a downloadable ZIP containing sanitized CSVs
 * of all user trading records and manifest per DPDP Act 2023 Sec 11 & 12.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user datasets concurrently
    const [fillsRes, tradesRes, rulesRes, reportsRes] = await Promise.all([
      supabase.from("raw_fills").select("*").eq("user_id", userId).order("fill_time", { ascending: true }),
      supabase.from("trades").select("*").eq("user_id", userId).order("entry_time", { ascending: true }),
      supabase.from("rules").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("weekly_reports").select("*").eq("user_id", userId).order("week_start_date", { ascending: false }),
    ]);

    const rawFills = fillsRes.data || [];
    const trades = tradesRes.data || [];
    const rules = rulesRes.data || [];
    const weeklyReports = reportsRes.data || [];

    // Compile into sanitized ZIP archive
    const zipBuffer = generateUserExportZip({
      userId,
      userEmail: user.email || "trader@tradelens.app",
      rawFills,
      trades,
      rules,
      weeklyReports,
    });

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
    const filename = `tradelens_data_export_${dateStamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate export archive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
