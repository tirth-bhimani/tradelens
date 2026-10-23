"use client";

import { useState } from "react";
import { Download, FileArchive, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export function DataExportCard() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to generate export archive");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tradelens_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export download failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="card-luminous p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#387ed1]">
            <FileArchive className="w-4 h-4" />
            <span>Right to Portability (DPDP Act Sec 11)</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Export My Data
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Download a complete, machine-readable ZIP archive containing all your raw fills,
            paired round-trip trades, rule configurations, and weekly performance reports.
            All CSV exports are sanitized against spreadsheet formula injection (CWE-1236).
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#387ed1] hover:bg-[#387ed1]/90 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 shrink-0"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating ZIP...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Archive (.zip)</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Data archive downloaded successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-xs">
        <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
          <div className="font-semibold text-slate-900 dark:text-slate-200">raw_fills.csv</div>
          <div className="text-[11px] text-slate-500">Every ingested broker fill &amp; timestamp</div>
        </div>
        <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
          <div className="font-semibold text-slate-900 dark:text-slate-200">trades.csv</div>
          <div className="text-[11px] text-slate-500">Paired round-trips with P&amp;L &amp; charges</div>
        </div>
        <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
          <div className="font-semibold text-slate-900 dark:text-slate-200">rules.csv</div>
          <div className="text-[11px] text-slate-500">Configured rulebook &amp; parameters</div>
        </div>
        <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
          <div className="font-semibold text-slate-900 dark:text-slate-200">weekly_reports.csv</div>
          <div className="text-[11px] text-slate-500">Historical performance summaries</div>
        </div>
      </div>
    </div>
  );
}
