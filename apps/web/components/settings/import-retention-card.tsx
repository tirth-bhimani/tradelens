"use client";

import { useState } from "react";
import { Trash2, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { deleteImport } from "@/lib/trades/actions";
import type { ImportRecord } from "@/lib/trades/types";

interface ImportRetentionCardProps {
  initialImports: ImportRecord[];
}

export function ImportRetentionCard({ initialImports }: ImportRetentionCardProps) {
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (importId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will cascade remove its raw fills and paired trades.`)) {
      return;
    }

    setDeletingId(importId);
    setActionError(null);

    try {
      const res = await deleteImport(importId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete import");
      }
      setImports((prev) => prev.filter((i) => i.id !== importId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card-luminous p-6 space-y-5">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Granular Erasure</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Uploaded Tradebooks ({imports.length})
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
          Manage your uploaded tradebooks. Deleting an import executes a cascading purge
          of all raw fills, paired trades, and computed performance snapshots associated with that batch.
        </p>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {imports.length === 0 ? (
        <div className="p-8 text-center rounded-[8px] bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08]">
          <p className="text-xs text-slate-500">No tradebook imports found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-slate-200/60 dark:border-white/[0.08]">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">File Name</th>
                <th className="px-4 py-2.5">Broker</th>
                <th className="px-4 py-2.5">Fills</th>
                <th className="px-4 py-2.5">Uploaded</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {imports.map((item) => {
                const isItemDeleting = deletingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[200px]">{item.file_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">{item.broker || "MANUAL"}</td>
                    <td className="px-4 py-3 font-mono">{item.imported_rows}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id, item.file_name)}
                        disabled={isItemDeleting}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition disabled:opacity-50"
                      >
                        {isItemDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
