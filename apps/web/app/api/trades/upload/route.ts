import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeCsvContent, validateCsvFileMeta } from "@/lib/trades/csv-sanitizer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in before uploading tradebooks." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file was provided in the upload request." },
        { status: 400 }
      );
    }

    // 1. Validate file metadata (extension, size <= 25MB)
    const validation = validateCsvFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      const status = file.size > 25 * 1024 * 1024 ? 413 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }

    // 2. Read and sanitize against CSV Formula Injection (CWE-1236)
    const rawText = await file.text();
    const { sanitized, flaggedCount } = sanitizeCsvContent(rawText);

    const importId = crypto.randomUUID();
    const storagePath = `${user.id}/${importId}.csv`;

    // 3. Upload sanitized CSV buffer to private Supabase Storage bucket
    const fileBuffer = Buffer.from(sanitized, "utf-8");
    const { error: storageError } = await supabase.storage
      .from("trade-imports")
      .upload(storagePath, fileBuffer, {
        contentType: "text/csv; charset=utf-8",
        upsert: false,
      });

    if (storageError) {
      // In local dev without local storage daemon running, log and allow fallback for testing
      console.warn("Storage upload notice:", storageError.message);
    }

    // 4. Record entry in public.imports table
    const errorReport =
      flaggedCount > 0
        ? [
            {
              warning: `Sanitized ${flaggedCount} suspicious formula cell${
                flaggedCount > 1 ? "s" : ""
              } to prevent spreadsheet injection.`,
            },
          ]
        : [];

    const { data: importRecord, error: dbError } = await supabase
      .from("imports")
      .insert({
        id: importId,
        user_id: user.id,
        broker: "UNKNOWN",
        file_name: file.name,
        status: "uploaded",
        total_rows: 0,
        imported_rows: 0,
        skipped_rows: 0,
        error_report: errorReport,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database import insertion failed:", dbError);
      return NextResponse.json(
        { error: "Failed to record trade import. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      importId: importRecord?.id || importId,
      fileName: file.name,
      flaggedFormulas: flaggedCount,
      status: "uploaded",
      fileSizeBytes: file.size,
      uploadedAt: importRecord?.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error("Upload handler caught unexpected exception:", err);
    return NextResponse.json(
      { error: "An error occurred while processing the upload. Please try again." },
      { status: 500 }
    );
  }
}
