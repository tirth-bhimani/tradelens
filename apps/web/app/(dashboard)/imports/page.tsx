import { FileDropzone } from "@/components/trades/file-dropzone";
import { getRecentImports } from "@/lib/trades/actions";
import { getCurrentProfile } from "@/lib/auth/actions";
import { UploadCloud, ShieldCheck, FileSpreadsheet, Clock, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

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

      {/* Main Upload Dropzone & Instructions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dropzone */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 card-zerodha-glass space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#387ed1]" />
              <span>Upload Tradebook CSV</span>
            </h2>

            <FileDropzone />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                <span>Export Tradebook (.csv) from your broker console</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                <span>Drop the file here. Formulas are automatically sanitized</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                <span>Fills are parsed and paired into round-trip trades</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security Guarantees & Help */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 card-zerodha-glass space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tenant Security</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong>Row-Level Security:</strong> Your files are partitioned under your personal user ID and inaccessible to any other user.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong>Zero Injection Risk:</strong> Spreadsheet formula attacks (=, +, -, @) are automatically neutralized before write.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong>No Password Needed:</strong> TradeLens never asks for your trading or Demat account password.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 card-zerodha-glass space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Supported Formats</h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-[4px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Universal Broker CSVs</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Auto-detected exports from Zerodha, Groww, Upstox, Angel One, Dhan, ICICI, and more</div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Custom &amp; Journal CSVs</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Any trading spreadsheet: Date, Symbol, Buy/Sell, Qty, Price</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import History Table */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Upload History</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {imports.length} {imports.length === 1 ? "tradebook" : "tradebooks"} recorded
          </span>
        </div>

        {importsError && (
          <div className="p-3 rounded-[4px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {importsError}
          </div>
        )}

        {imports.length === 0 ? (
          <div className="p-8 text-center rounded-[8px] bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No files uploaded yet. Drag and drop your first CSV above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[8px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Broker</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Security Warnings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {imports.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.file_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="tag-zerodha bg-blue-50 text-[#387ed1] border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 capitalize font-bold">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{item.broker}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {Array.isArray(item.error_report) && item.error_report.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Sanitized Formula</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Clean</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard?import=${item.id}`}
                        className="text-[#387ed1] hover:underline font-semibold mr-3"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
