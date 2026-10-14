# Spec: Task 4 - Secure CSV Upload API & Storage Handler

## Assumptions
1. **Storage Backend**: Supabase Storage using a private bucket named `trade-imports`. Public read access is strictly forbidden; files are only accessible by the owner user via signed URLs or authenticated service role operations.
2. **File Size & Type Constraints**: Maximum file size is 25MB (ample for multi-year retail broker tradebooks with >50,000 fills). Accepted MIME types: `text/csv`, `text/plain`, `application/vnd.ms-excel`, and file extension `.csv`.
3. **Storage Object Key Convention**: `<user_id>/<import_id>.csv` where `user_id` is the authenticated trader's UUID (`auth.uid()`) and `import_id` is a newly generated UUID v4. This partition structure prevents namespace collision and integrates with Supabase Storage RLS policies.
4. **CSV Formula Injection Mitigation (CWE-1236)**: Cells beginning with formula execution trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are sanitized by prepending a tab or single quote (`'`), neutralizing spreadsheet formula execution when downloaded or inspected in Excel/Google Sheets.
5. **Database Tracking**: Every successful upload atomically writes a record to the PostgreSQL `public.imports` table with `status = 'uploaded'`, `file_name`, `broker = 'UNKNOWN'` (to be auto-detected in Task 5), and initial counters (`total_rows = 0`, `imported_rows = 0`, `skipped_rows = 0`).
6. **Bilingual Validation**: Sanitization and validation logic is implemented in both TypeScript (`apps/web`) for fast client-side/edge rejection and Python (`services/analytics`) for the backend pipeline, ensuring defense-in-depth.

---

## Objective
Build a robust, secure, and user-friendly file upload pipeline for retail traders to ingest tradebook CSVs into TradeLens. The goal is to:
- Provide an intuitive drag-and-drop file dropzone with progress visualization, file size/type validation, and instant feedback at `/imports`.
- Shield the platform and users against CSV Formula Injection (DDE attacks) and oversized payloads.
- Securely store raw trade files in a private, multi-tenant Supabase Storage bucket partitioned by user ID.
- Create an audit trail in the `imports` table with `status: 'uploaded'`, unlocking Task 5 (Broker CSV parsing and symbol normalization).

---

## Tech Stack
- **Frontend**: Next.js 14+ (App Router, Server Actions, Route Handlers), React, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Storage & Database**: Supabase Storage (`@supabase/ssr`, `@supabase/supabase-js`), PostgreSQL 16
- **Backend Validation**: Python 3.11+, FastAPI, Pydantic v2
- **Testing**: Vitest (`apps/web/tests/upload.test.ts`), Pytest (`services/analytics/tests/test_upload.py`)

---

## Commands

### Dependencies Installation
```powershell
# Dependencies are already present in monorepo, but if needed:
npm install --prefix apps/web
pip install -e services/analytics
```

### Development & Execution
```powershell
# Start Next.js development server
npm run dev --prefix apps/web

# Start FastAPI analytics service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir services/analytics
```

### Testing & Verification
```powershell
# Run frontend upload & sanitization unit tests
npm test --prefix apps/web

# Run backend sanitization & storage tests
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_upload.py -v

# Type check and lint
npm run lint --prefix apps/web
.\services\analytics\.venv\Scripts\mypy services/analytics/app
```

---

## Project Structure

```
D:\resume\sdd/
├── supabase/
│   └── migrations/
│       └── 20261014000001_storage_bucket.sql    # Storage bucket creation & RLS policies
├── apps/web/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── imports/
│   │   │       └── page.tsx                      # Trade import dashboard page
│   │   └── api/
│   │       └── trades/
│   │           └── upload/
│   │               └── route.ts                  # Secure upload API route handler
│   ├── components/
│   │   └── trades/
│   │       └── file-dropzone.tsx                 # Drag-and-drop upload component
│   ├── lib/
│   │   └── trades/
│   │       └── csv-sanitizer.ts                  # TypeScript formula injection sanitizer
│   └── tests/
│       └── upload.test.ts                        # Frontend upload & sanitizer unit tests
└── services/analytics/
    ├── app/
    │   ├── routers/
    │   │   └── upload.py                         # FastAPI upload & verification endpoint
    │   └── security/
    │       └── sanitizer.py                      # Python formula injection & CSV sanitizer
    └── tests/
        └── test_upload.py                        # Python sanitizer & validation tests
```

---

## Code Style & Implementation Details

### 1. CSV Formula Injection Defense Pattern (`apps/web/lib/trades/csv-sanitizer.ts`)
```typescript
/**
 * Sanitizes CSV cell content to prevent CSV Formula Injection (CWE-1236).
 * Prepends a single quote to cells beginning with dangerous characters: =, +, -, @, \t, \r
 */
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCsvCell(cell: string): string {
  if (!cell || typeof cell !== 'string') return cell;
  const trimmed = cell.trim();
  if (DANGEROUS_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    // If it's a numeric negative/positive value (e.g. -200.50 or +10), allow if strictly numeric
    if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
      return cell;
    }
    // Neutralize formula trigger
    return `'${cell}`;
  }
  return cell;
}

export function sanitizeCsvContent(content: string): { sanitized: string; flaggedCount: number } {
  let flaggedCount = 0;
  const lines = content.split(/\r?\n/);
  const sanitizedLines = lines.map(line => {
    // Basic CSV token parser handling quotes
    const cells = line.split(',');
    const sanitizedCells = cells.map(cell => {
      const sanitized = sanitizeCsvCell(cell);
      if (sanitized !== cell) flaggedCount++;
      return sanitized;
    });
    return sanitizedCells.join(',');
  });

  return {
    sanitized: sanitizedLines.join('\n'),
    flaggedCount,
  };
}
```

### 2. Next.js Upload Route Handler (`apps/web/app/api/trades/upload/route.ts`)
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeCsvContent } from "@/lib/trades/csv-sanitizer";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 413 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 415 });
  }

  const rawText = await file.text();
  const { sanitized, flaggedCount } = sanitizeCsvContent(rawText);

  const importId = crypto.randomUUID();
  const storagePath = `${user.id}/${importId}.csv`;

  // 1. Upload sanitized CSV to private storage bucket
  const { error: uploadError } = await supabase.storage
    .from("trade-imports")
    .upload(storagePath, Buffer.from(sanitized, "utf-8"), {
      contentType: "text/csv",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // 2. Insert record into public.imports table
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
      error_report: flaggedCount > 0 ? [{ warning: `Sanitized ${flaggedCount} suspicious formula cells` }] : [],
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: `Database insert failed: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    importId: importRecord.id,
    fileName: file.name,
    flaggedFormulas: flaggedCount,
    status: "uploaded",
  });
}
```

### 3. Storage Bucket Migration (`supabase/migrations/20261014000001_storage_bucket.sql`)
```sql
-- Create private storage bucket for trade imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trade-imports',
    'trade-imports',
    false,
    26214400, -- 25 MB
    ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only authenticated users can access their own folder
CREATE POLICY "Users can upload their own trade CSVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own trade CSVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own trade CSVs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'trade-imports' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Testing Strategy
- **Frontend Unit Tests (`apps/web/tests/upload.test.ts`)**:
  - Test file dropzone drag-and-drop state transitions (drag over, drop, reject non-CSV).
  - Test file size limitation (> 25MB rejected with user-friendly alert).
  - Test CSV Formula Injection regex: ensures `=1+1`, `@SUM`, `-cmd|' /C calc'!A0`, `+exec` are escaped with `'` while legitimate trade prices (`-45.50`, `+200`) remain untouched.
- **Backend Analytics Tests (`services/analytics/tests/test_upload.py`)**:
  - Verify Python `sanitizer.py` parses and sanitizes CSV strings correctly.
  - Verify invalid UTF-8 bytes and corrupted encodings are rejected cleanly with a standard 400 error.
- **Database & Storage Policy Tests**:
  - Assert that an unauthorized user or unauthenticated request cannot read another user's CSV from the `trade-imports` bucket.

---

## Boundaries
- **Always do**:
  - Validate file size (< 25MB) and file extension (`.csv`) both client-side and server-side.
  - Neutralize formula trigger characters (`=`, `+`, `-`, `@`) in non-numeric text columns.
  - Isolate storage files by user ID prefix: `<user_id>/<import_id>.csv`.
  - Maintain FinTech visual design: `rounded-[4px]` buttons, `rounded-[8px]` frosted glass dropzone, dark mode support.
- **Ask first**:
  - Adding direct cloud broker API syncing (e.g. Zerodha Kite Connect, Upstox API) instead of manual CSV upload.
  - Increasing the upload size limit beyond 25MB.
- **Never do**:
  - Store unencrypted broker credentials or password-protected files without decryption consent.
  - Allow public, unauthenticated access to the `trade-imports` storage bucket.
  - Omit CSV sanitization before storing or processing uploaded files.

---

## Success Criteria
- [ ] Migration `20261014000001_storage_bucket.sql` created with private `trade-imports` bucket and user-scoped RLS policies.
- [ ] `apps/web/lib/trades/csv-sanitizer.ts` and `services/analytics/app/security/sanitizer.py` implemented and unit tested.
- [ ] API endpoint `/api/trades/upload` securely streams, sanitizes, uploads to Supabase Storage, and records row in `public.imports`.
- [ ] Drag-and-drop component `file-dropzone.tsx` with progress bar, file size validation, error alerts, and dark mode support rendered at `/imports`.
- [ ] Automated tests in `apps/web/tests/upload.test.ts` and `services/analytics/tests/test_upload.py` pass with 100% green status.
- [ ] Compiles with zero TypeScript, lint, or build errors (`npm run build --prefix apps/web`).

---

## Open Questions
1. **Direct Parsing vs. Background Queue**: Should files under 5MB be parsed synchronously in-request for instant feedback, or should all uploads unconditionally be queued as background jobs? (Recommendation: Synchronous parsing for small files < 2MB, asynchronous processing with progress polling for larger files).
2. **Sanitization Strategy**: When formula injection triggers are detected (e.g. `=cmd|...`), should TradeLens automatically escape them with `'` and proceed, or block the entire file upload and ask the user to confirm? (Recommendation: Auto-escape non-numeric formula cells and record a warning in `error_report`).
