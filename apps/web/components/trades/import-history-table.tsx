"use client";

import { useEffect, useState } from "react";
import { Clock, Trash2, FileText, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { ImportSummaryModal } from "./import-summary-modal";
import { DeleteImportDialog } from "./delete-import-dialog";
import { deleteImport } from "@/lib/trades/actions";
import type { ImportRecord, IngestionSummary, RowIssue } from "@/lib/trades/types";

interface ImportHistoryTableProps {
  initialImports?: ImportRecord[];
  imports?: ImportRecord[];
  onDeleteImport?: (id: string) => void;
}

export function ImportHistoryTable({
  initialImports = [],
  imports: controlledImports,
  onDeleteImport,
}: ImportHistoryTableProps) {
  const [internalImports, setInternalImports] = useState<ImportRecord[]>(
    controlledImports ?? initialImports
  );

  useEffect(() => {
    if (controlledImports !== undefined) {
      setInternalImports(controlledImports);
    }
  }, [controlledImports]);

  const imports = controlledImports ?? internalImports;
  const [selectedSummary, setSelectedSummary] = useState<IngestionSummary | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const [deletingImport, setDeletingImport] = useState<ImportRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenSummary = (item: ImportRecord) => {
    // Construct IngestionSummary from stored ImportRecord
    const summary: IngestionSummary = {
      import_id: item.id,
      user_id: item.user_id,
      broker: item.broker || "GENERAL",
      file_name: item.file_name,
      status: item.status === "failed" ? "failed" : "completed",
      total_rows: item.total_rows || 0,
      imported_rows: item.imported_rows || 0,
      skipped_rows: item.skipped_rows || 0,
      error_report: (item.error_report as RowIssue[]) || [],
    };
    setSelectedSummary(summary);
    setIsSummaryOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingImport) return;
    setIsDeleting(true);
    setActionError(null);

    try {
      const res = await deleteImport(deletingImport.id);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete import");
      }
      setInternalImports((prev) => prev.filter((i) => i.id !== deletingImport.id));
      if (onDeleteImport) {
        onDeleteImport(deletingImport.id);
      }
      setDeletingImport(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (imports.length === 0) {
    return (
      <div className="p-8 text-center rounded-[8px] bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No files uploaded yet. Drag and drop your first CSV above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="p-3 rounded-[4px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {actionError}
        </div>
      )}

      <div className="overflow-x-auto rounded-[8px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">File Name</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Broker</th>
              <th className="py-3 px-4">Imported Fills</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {imports.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center space-x-2">
                    <span className="truncate max-w-[180px] sm:max-w-xs">{item.file_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800"
                        : item.status === "failed"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800"
                        : "bg-blue-50 text-[#387ed1] dark:bg-blue-950/60 dark:text-sky-300 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium uppercase text-slate-700 dark:text-slate-300">
                  {item.broker}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {item.imported_rows ?? 0}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500">{item.total_rows ?? 0}</span>
                    {(item.skipped_rows ?? 0) > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                        ({item.skipped_rows} skipped)
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  {new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSummary(item)}
                      className="px-2.5 py-1 rounded-[3px] text-xs font-semibold text-[#387ed1] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition flex items-center space-x-1"
                      title="View Line-by-Line Summary"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingImport(item)}
                      className="p-1 rounded-[3px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title="Delete Import Run"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Modal */}
      <ImportSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        summary={selectedSummary}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteImportDialog
        isOpen={Boolean(deletingImport)}
        onClose={() => setDeletingImport(null)}
        onConfirm={handleConfirmDelete}
        fileName={deletingImport?.file_name || "this file"}
        isDeleting={isDeleting}
      />
    </div>
  );
}
