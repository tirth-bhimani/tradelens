# Spec: Task 27 - Privacy, Data Export & Account/Import Deletion (Indian DPDP Act 2023 Compliance)

## Objective

Build the comprehensive privacy, data export, granular import deletion, and permanent account erasure system for TradeLens, conforming strictly to the statutory requirements of India's **Digital Personal Data Protection Act, 2023 (DPDP Act 2023)** and SEBI regulatory disclosure norms.

In financial trading journals, tradebooks contain highly sensitive personal and commercial data (account identifiers, order timestamps, trade sizing, profit and loss figures, broker notes, and behavioral patterns). Traders must possess complete sovereignty over their data, including:
1. **Right to Access & Data Portability (DPDP Act Sec 11 & 12)**: One-click "Export My Data" generating a downloadable, tamper-evident ZIP archive containing clean, formula-injection-sanitized CSVs of all raw fills (`raw_fills.csv`), paired round-trip trades (`trades.csv`), rulebook configurations (`rules.csv`), and weekly reports (`weekly_reports.csv`), accompanied by an export manifest (`manifest.json`) with cryptographic checksums.
2. **Right to Granular Erasure ("Delete Import")**: Clean cascade removal of an individual uploaded batch from `imports`, permanently deleting its associated `raw_fills`, paired `trades`, stored broker CSV file from Supabase Storage (`trade-imports/{user_id}/{import_id}.csv`), and invalidating dependent cached `stats_snapshots` and rule replays without affecting other independent imports.
3. **Right to Complete Erasure / "Right to be Forgotten" (DPDP Act Sec 12(3))**: A zero-residue "Delete Account" flow that permanently scrubs all records across `profiles`, `trades`, `raw_fills`, `imports`, `rules`, `rule_runs`, `stats_snapshots`, `insights`, `weekly_reports`, `coach_access`, `coach_invitations`, and `ai_usage`, deletes all user objects in Supabase Storage, purges the user from Supabase Auth (`auth.users`), terminates active sessions, and redirects the trader with a clear confirmation notice.
4. **Legal & Compliance Infrastructure**:
   - Public **Privacy Policy (`/privacy`)**: Detailing data categories collected, processing purposes (deterministic pairing, behavioral leak detection, rulebook adherence), zero credential collection guarantee, storage residency (AWS Mumbai `ap-south-1`), retention schedules, and grievance redressal contact under DPDP Act 2023.
   - Public **Terms of Service (`/terms`)**: Platform usage terms, strict financial educational disclaimers clarifying that TradeLens is NOT a SEBI-registered Investment Adviser or Research Analyst, and prominent display of SEBI's mandatory study disclosure regarding retail derivative losses (9 out of 10 individual traders incurring net losses in F&O).
5. **Data & Privacy Management Hub (`/settings/data`)**: A dedicated settings tab providing an institutional, dark-themed control center for exporting data archives, inspecting import storage usage, viewing privacy rights, and accessing the high-security confirmation modal for account termination.

---

## Assumptions

1. **DPDP Act 2023 Scope**: TradeLens acts as a "Data Fiduciary" for individual traders ("Data Principals"). All personal and trade data processing is grounded in consent provided upon account creation.
2. **Formula Injection (CWE-1236) Defense**: All exported CSV files must sanitize string cells against spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote (`'`), while leaving legitimate negative numeric figures (e.g. `-1500.50` P&L) unmodified.
3. **ZIP Archive Generation**: ZIP generation executes with zero external npm dependencies via Node's native `zlib` / lightweight binary PKZIP encoder in `apps/web/app/api/user/export/route.ts`, and supported on the backend via Python's standard `zipfile` module in `services/analytics/app/security/export_cleaner.py`. This ensures fast, memory-safe, streamable downloads without requiring bloated native dependencies.
4. **Data Residency**: The primary database and storage cluster is located in India (AWS Mumbai region `ap-south-1` / Supabase India).
5. **Cascading Deletion Guarantee**: In the database schema, foreign keys are configured with `ON DELETE CASCADE` where applicable, but trades currently use `import_id REFERENCES imports(id) ON DELETE SET NULL`. Therefore, import deletion MUST explicitly purge trades linked to the target import before or during the deletion transaction.
6. **Administrative Account Purge**: Hard account deletion utilizes Supabase Service Role privileges (`supabase.auth.admin.deleteUser`) where configured. In environments without service role credentials, the application executes a comprehensive multi-table database purge and logs the user out immediately.
7. **SEBI Compliance**: TradeLens is strictly an educational behavioral analytics and trade journaling software. It provides zero financial advice, portfolio management, or trade execution capabilities.

---

## Tech Stack

- **Web Frontend**: Next.js 14.2.15 App Router, React 18, TypeScript 5, Tailwind CSS, Lucide React icons
- **Data Export & Compression**: Native Node.js `zlib` / PKZIP streaming encoder, Python `zipfile` & `csv` modules
- **Security & Sanitization**: CWE-1236 CSV Formula Neutralizer (`export_cleaner.py` and `export-sanitizer.ts`)
- **Database & Storage**: PostgreSQL 15 (Supabase), Supabase Storage (`trade-imports` bucket), Supabase Admin Auth
- **Testing**:
  - Python: `pytest` (`services/analytics/tests/test_data_deletion.py`)
  - Web: `vitest` (`apps/web/tests/data-privacy.test.ts`)

---

## Commands

```bash
# Web Frontend Verification & Testing
Test: npm test --prefix apps/web -- --run
Build: npm run build --prefix apps/web
Lint: npm run lint --prefix apps/web
Typecheck: npm run typecheck --prefix apps/web

# Backend Analytics Verification & Testing
Pytest: services\analytics\.venv\Scripts\pytest.exe services/analytics/tests/test_data_deletion.py

# Monorepo Full Verification
Full Test: npm run test:all
```

---

## Project Structure

```
specs/
  SPEC-task27-privacy-data-export-and-deletion.md   # This specification

services/analytics/
  app/
    security/
      __init__.py
      sanitizer.py                                 # Existing import CSV formula sanitizer
      export_cleaner.py                            # NEW: Export sanitizer, PII scrubber & ZIP generator
    routers/
      privacy.py                                   # NEW: FastAPI privacy and data sanitization endpoints
  tests/
    test_data_deletion.py                          # NEW: Pytest suite for export cleaner & cascade deletion

apps/web/
  app/
    (dashboard)/
      settings/
        data/
          page.tsx                                 # NEW: Data & Privacy management dashboard tab
        layout.tsx                                 # Updated: Settings sub-navigation tabs (Coach, Notifications, Data)
    api/
      user/
        export/
          route.ts                                 # NEW: Streaming ZIP export endpoint
        delete/
          route.ts                                 # NEW: Cascading user account deletion endpoint
    (marketing)/
      privacy/
        page.tsx                                   # NEW: Statutory DPDP Act 2023 Privacy Policy page
      terms/
        page.tsx                                   # NEW: SEBI-compliant Terms of Service & risk disclosures
  components/
    landing/
      Footer.tsx                                   # Updated: Links to /privacy and /terms
    dashboard/
      DashboardNav.tsx                             # Updated: Navigation link to /settings/data
    settings/
      data-export-card.tsx                         # NEW: Export data trigger with progress indicator
      delete-account-dialog.tsx                    # NEW: High-security confirmation modal ("DELETE MY ACCOUNT")
      import-retention-card.tsx                    # NEW: Overview of uploaded batches with direct purge
  lib/
    privacy/
      export-generator.ts                          # NEW: Zero-dependency ZIP builder and CSV generator
      export-sanitizer.ts                          # NEW: Formula injection sanitizer and PII cleaner
      deletion-actions.ts                          # NEW: Server actions for account deletion & import purge
    trades/
      actions.ts                                   # Updated: deleteImport cascading trades & snapshots purge
  tests/
    data-privacy.test.ts                           # NEW: Vitest unit & integration tests
```

---

## Code Style & Implementation Patterns

### 1. CWE-1236 CSV Injection Sanitizer (TypeScript & Python)
```typescript
// apps/web/lib/privacy/export-sanitizer.ts
const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
const NUMERIC_REGEX = /^[-+]?\d+(\.\d+)?$/;

export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const trimmed = str.trim();

  // Tab or CR at start is an immediate DDE trigger
  if (str.startsWith("\t") || str.startsWith("\r")) {
    return `'${str}`;
  }

  // Prepend single quote if starts with formula operator and is not purely numeric
  if (DANGEROUS_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    if (NUMERIC_REGEX.test(trimmed)) {
      return str; // Valid numbers like -1250.50 preserved
    }
    return `'${str}`;
  }

  // Escape standard CSV quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

### 2. Cascading Import Deletion
```typescript
// apps/web/lib/trades/actions.ts
export async function deleteImport(importId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // 1. Delete associated trades paired from this import
  await supabase
    .from("trades")
    .delete()
    .eq("import_id", importId)
    .eq("user_id", user.id);

  // 2. Delete raw fills (FK ON DELETE CASCADE handles this if imports is deleted,
  //    but explicit delete ensures immediate deterministic cleanup)
  await supabase
    .from("raw_fills")
    .delete()
    .eq("import_id", importId)
    .eq("user_id", user.id);

  // 3. Invalidate/clear cached stats snapshots to prevent stale metric lookups
  await supabase
    .from("stats_snapshots")
    .delete()
    .eq("user_id", user.id);

  // 4. Remove CSV file from Supabase Storage
  await supabase.storage.from("trade-imports").remove([`${user.id}/${importId}.csv`]);

  // 5. Delete import batch record
  const { error } = await supabase
    .from("imports")
    .delete()
    .eq("id", importId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/imports");
  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true, error: null };
}
```

---

## Testing Strategy

### 1. Backend Pytest (`services/analytics/tests/test_data_deletion.py`)
- **Sanitizer Unit Tests**:
  - Assert cells with `=cmd|'/c calc'!A0`, `@SUM(A1:A10)`, `+12345` (with text), and `\tDDE` have `'` prepended.
  - Assert valid negative numbers like `-540.25` and positive floats `+100.00` are preserved without quote mangling.
  - Assert PII fields (`password`, `token`, `session_id`, `secret_key`) are stripped from exported dicts.
- **Export Package Verification**:
  - Assert `ExportCleaner.generate_export_zip()` produces a valid zip archive containing `raw_fills.csv`, `trades.csv`, `rules.csv`, `weekly_reports.csv`, and `manifest.json`.
  - Assert ZIP file can be extracted and parsed with Python's standard `zipfile` module.

### 2. Frontend Vitest (`apps/web/tests/data-privacy.test.ts`)
- **Formula Neutralizer Tests**:
  - Verify `sanitizeCsvField` handles null, undefined, strings, quotes, and malicious prefixes.
- **ZIP Builder Tests**:
  - Test zero-dependency PKZIP generator compiles multiple files into a valid uncorrupted ZIP buffer.
- **Route Handler Tests**:
  - `GET /api/user/export`: Asserts 401 when unauthenticated; asserts 200 with `application/zip` and `Content-Disposition: attachment; filename=...` when authenticated.
  - `DELETE /api/user/delete`: Asserts 400 when confirmation phrase is missing/incorrect; asserts 200 and successful cascade cleanup when confirmed.
- **Page Component Tests**:
  - Verify `/privacy` renders statutory DPDP Act 2023 section headings and grievance redressal contact.
  - Verify `/terms` renders SEBI educational disclaimer and 9-out-of-10 F&O loss warning.
  - Verify `/settings/data` renders data export button and account deletion trigger.

---

## Boundaries

- **Always**:
  - Neutralize potential spreadsheet formulas on all CSV exports (CWE-1236).
  - Verify the user is authenticated before executing export or deletion routes.
  - Require explicit typed confirmation (`DELETE MY ACCOUNT`) before deleting an account.
  - Invalidate cached performance snapshots and revalidate Next.js cache paths on import deletion.
  - Maintain 100% test pass rate (all 150+ existing tests + new privacy tests).
  - Ensure zero Next.js production build errors.
- **Ask First**:
  - Adding external npm packages for compression (prefer native `zlib` / zero-dependency PKZIP).
  - Modifying existing database foreign-key constraints in `supabase/migrations/`.
  - Changing legal grievance officer contact details.
- **Never**:
  - Leave orphan trade records or storage files when an import or account is deleted.
  - Include passwords, session cookies, auth tokens, or private coach notes in data exports.
  - Bypass confirmation dialogs for destructive actions.
  - Silently swallow errors during account purge operations.

---

## Success Criteria

1. **"Export My Data" Works**:
   - Authenticated trader can navigate to `/settings/data` and click "Export My Data".
   - Browser downloads a valid ZIP archive containing `raw_fills.csv`, `trades.csv`, `rules.csv`, `weekly_reports.csv`, and `manifest.json`.
   - All exported CSVs pass formula-injection inspection.
2. **"Delete Import" Cascades Cleanly**:
   - Deleting an import from `/imports` or `/settings/data` deletes the import record, all associated raw fills, all paired trades created from that import, cached stats snapshots, and the stored CSV file.
   - Other imports and unrelated trades remain intact.
3. **"Delete Account" Hard Purge**:
   - Trader cannot trigger deletion without typing `DELETE MY ACCOUNT`.
   - On confirmation, all records across `profiles`, `trades`, `imports`, `raw_fills`, `rules`, `weekly_reports`, `coach_access`, and storage are permanently deleted.
   - User is logged out immediately and redirected to the home page.
4. **Legal Pages Render**:
   - `/privacy` renders complete DPDP Act 2023 disclosures and grievance officer information.
   - `/terms` renders SEBI educational disclaimer and 9/10 F&O trader loss disclosure.
   - Footer on landing page includes working links to `/privacy` and `/terms`.
5. **Verification**:
   - `pytest services/analytics/tests/test_data_deletion.py` passes.
   - `npm test --prefix apps/web` passes all tests.
   - `npm run build --prefix apps/web` passes with zero errors across all 24+ routes.

---

## Resolved Architectural Decisions

1. **Zero-Dependency ZIP Generation**: The web application uses a pure TypeScript PKWare-compliant ZIP encoder leveraging Node.js native `zlib` for compression, avoiding heavy third-party dependencies (`archiver`/`jszip`). The Python analytics service utilizes Python's standard `zipfile` module.
2. **Instant Permanent Hard Deletion**: "Delete Account" executes an immediate hard wipe across all relational database rows (`profiles`, `trades`, `raw_fills`, `imports`, `rules`, `weekly_reports`, etc.) and object storage buckets (`trade-imports/{user_id}/*`), followed by administrative user deletion in Supabase Auth.
3. **DPDP Act 2023 Statutory Details**: Grievance redressal is assigned to the TradeLens Data Protection & Grievance Officer (`grievance@tradelens.in`), with formal acknowledgments within 48 hours and resolution within 30 days pursuant to the Indian DPDP Act 2023 rules. Data residency is anchored at AWS ap-south-1 (Mumbai).
