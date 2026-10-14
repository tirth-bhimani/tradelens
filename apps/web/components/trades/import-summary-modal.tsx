"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, AlertCircle, X, ChevronDown, ChevronUp, ArrowRight, Layers, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IngestionSummary, RowIssue } from "@/lib/trades/types";

interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: IngestionSummary | null;
}

export function ImportSummaryModal({ isOpen, onClose, summary }: ImportSummaryModalProps) {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !summary || !mounted) return null;

  const isAllDuplicates =
    summary.total_rows > 0 && summary.imported_rows === 0 && summary.status === "completed";

  const issues = summary.error_report || [];
  const filteredIssues =
    filterType === "ALL"
      ? issues
      : issues.filter((iss: RowIssue) => iss.issue_type === filterType);

  const duplicateCount = issues.filter((i: RowIssue) => i.issue_type === "DUPLICATE_FILL").length;
  const formatErrorCount = issues.filter((i: RowIssue) => i.issue_type !== "DUPLICATE_FILL").length;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-summary-title"
          className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-[#0f172a] rounded-[8px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-[6px] flex items-center justify-center ${
                  summary.status === "completed"
                    ? isAllDuplicates
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600"
                      : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-600"
                }`}
              >
                {summary.status === "completed" ? (
                  isAllDuplicates ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3
                  id="import-summary-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {summary.status === "completed"
                    ? isAllDuplicates
                      ? "Import Processed (Existing Records)"
                      : "Tradebook Import Completed"
                    : "Import Ingestion Failed"}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium truncate max-w-[200px]">{summary.file_name}</span>
                  <span>•</span>
                  <span className="uppercase font-semibold tracking-wider text-[11px] px-1.5 py-0.2 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {summary.broker}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[4px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            {/* Informational Banner for 100% duplicate */}
            {isAllDuplicates && (
              <div className="p-3.5 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">All Fills Already Imported</strong>
                  All trade records in this file already exist in your journal. 0 new fills were added and no double-counting occurred.
                </div>
              </div>
            )}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Total Rows */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total Rows
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {summary.total_rows}
                </span>
              </div>

              {/* Successfully Imported */}
              <div className="p-3.5 rounded-[6px] bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-center space-y-1">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Imported
                </span>
                <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {summary.imported_rows}
                </span>
              </div>

              {/* Skipped / Duplicate */}
              <div className="p-3.5 rounded-[6px] bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-center space-y-1">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  Skipped
                </span>
                <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
                  {summary.skipped_rows}
                </span>
              </div>
            </div>

            {/* Expandable Issues Accordion */}
            {issues.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-[6px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                  className="w-full px-4 py-3 bg-slate-50/80 dark:bg-slate-850 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition select-none"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Line-by-Line Audit Report</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      {issues.length} {issues.length === 1 ? "notice" : "notices"}
                    </span>
                  </div>
                  {isAccordionOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isAccordionOpen && (
                  <div className="p-3 space-y-2.5 bg-white dark:bg-[#0b101b] border-t border-slate-200 dark:border-slate-800">
                    {/* Filter Pills */}
                    <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFilterType("ALL")}
                        className={`px-2 py-0.5 rounded-[3px] font-medium transition ${
                          filterType === "ALL"
                            ? "bg-[#387ed1] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        All ({issues.length})
                      </button>
                      {duplicateCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterType("DUPLICATE_FILL")}
                          className={`px-2 py-0.5 rounded-[3px] font-medium transition ${
                            filterType === "DUPLICATE_FILL"
                              ? "bg-amber-600 text-white"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          Duplicates ({duplicateCount})
                        </button>
                      )}
                      {formatErrorCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterType("CORRUPT_DATA")}
                          className={`px-2 py-0.5 rounded-[3px] font-medium transition ${
                            filterType === "CORRUPT_DATA"
                              ? "bg-rose-600 text-white"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                          }`}
                        >
                          Errors ({formatErrorCount})
                        </button>
                      )}
                    </div>

                    {/* Issue List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {filteredIssues.map((issue: RowIssue, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-[4px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between text-xs space-x-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              {issue.row_index && (
                                <span className="font-mono text-[10px] font-bold text-slate-400">
                                  Row #{issue.row_index}
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase ${
                                  issue.issue_type === "DUPLICATE_FILL"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                }`}
                              >
                                {issue.issue_type === "DUPLICATE_FILL" ? "Duplicate" : "Invalid"}
                              </span>
                              {issue.trade_id && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  ID: {issue.trade_id}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                              {issue.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-zerodha-primary text-xs py-2 px-4 flex items-center space-x-1.5"
            >
              <span>Done</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
