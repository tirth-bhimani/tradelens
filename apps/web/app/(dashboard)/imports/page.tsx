import { ImportsManager } from "@/components/trades/imports-manager";
import { getRecentImports } from "@/lib/trades/actions";
import { getCurrentProfile } from "@/lib/auth/actions";
import { UploadCloud } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const { user } = await getCurrentProfile();
  const { imports, error: importsError } = await getRecentImports();

  return (
    <div className="space-y-8">
      {/* Page Title & Context Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#387ed1] dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Ingestion Pipeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Tradebook Imports
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Upload your raw broker trade executions. TradeLens sanitizes the data against formula injection, stores it in private tenant-isolated storage, and prepares it for deterministic FIFO pairing.
        </p>
      </div>

      {/* Reactive Imports Manager (Upload + Live History Table) */}
      <ImportsManager initialImports={imports} importsError={importsError} />
    </div>
  );
}
