"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileSpreadsheet, ShieldCheck, Check } from "lucide-react";
import { FileDropzone } from "./file-dropzone";
import { ImportHistoryTable } from "./import-history-table";
import type { ImportRecord, IngestionSummary } from "@/lib/trades/types";

interface ImportsManagerProps {
  initialImports: ImportRecord[];
  importsError?: string | null;
}

export function ImportsManager({ initialImports, importsError }: ImportsManagerProps) {
  const router = useRouter();
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);

  useEffect(() => {
    setImports(initialImports);
  }, [initialImports]);

  const handleImportProcessed = (newRecord: ImportRecord, _summary: IngestionSummary) => {
    setImports((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === newRecord.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newRecord;
        return updated;
      }
      return [newRecord, ...prev];
    });

    // Refresh server data in the background
    router.refresh();
  };

  const handleDeleteImport = (id: string) => {
    setImports((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Main Upload Dropzone & Instructions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzone */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 card-luminous space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#387ed1]" />
              <span>Upload Tradebook CSV</span>
            </h2>

            <FileDropzone onImportProcessed={handleImportProcessed} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start space-x-2">
                <span className="tabular-nums text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">01.</span>
                <span>Export Tradebook (.csv) from your broker console</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="tabular-nums text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">02.</span>
                <span>Drop file here; formula attacks are automatically neutralized</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="tabular-nums text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">03.</span>
                <span>Fills are parsed and paired into FIFO round-trip trades</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security Guarantees & Help */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 card-luminous space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Multi-Tenant Security</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span><strong>Row-Level Security:</strong> Your files are partitioned under your personal user ID and inaccessible to any other user.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span><strong>Zero Injection Risk:</strong> Spreadsheet formula attacks (=, +, -, @) are automatically neutralized before write.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span><strong>No Password Needed:</strong> TradeLens never asks for your trading or Demat account credentials.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 card-luminous space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-300">Supported Formats</h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-2.5 rounded-[4px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Universal Broker CSVs</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Zerodha, Groww, Upstox, Angel One, Dhan, ICICI Direct</div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Custom &amp; Journal CSVs</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Standard columns: Date, Symbol, Buy/Sell, Qty, Price</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import History Table Section */}
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

        <ImportHistoryTable imports={imports} onDeleteImport={handleDeleteImport} />
      </div>
    </div>
  );
}
