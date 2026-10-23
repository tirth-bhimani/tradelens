"use client";

import React from "react";
import { WeeklyReportSummary } from "@/lib/reports/report-types";
import { Calendar, ChevronRight, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle } from "lucide-react";

interface ReportCardProps {
  report: WeeklyReportSummary;
  isSelected: boolean;
  onSelect: (report: WeeklyReportSummary) => void;
}

export function ReportCard({ report, isSelected, onSelect }: ReportCardProps) {
  const isProfit = report.net_pnl >= 0;
  const pnlSign = isProfit ? "+" : "";
  const formattedNetPnl = `${pnlSign}₹${Math.abs(report.net_pnl).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <button
      onClick={() => onSelect(report)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative ${
        isSelected
          ? "bg-slate-50 dark:bg-slate-800/80 border-emerald-500/50 dark:border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30"
          : "bg-white dark:bg-[#0c1222] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
              {report.week_start_date} → {report.week_end_date}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span
              className={`text-lg font-bold font-mono ${
                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formattedNetPnl}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ({report.total_trades} trades)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              Win {report.win_rate}%
            </span>

            <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Adherence {report.adherence_score}%</span>
            </span>

            {report.top_behavioral_leak && (
              <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate max-w-[150px]">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate">Leak detected</span>
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          className={`w-4 h-4 shrink-0 transition-transform ${
            isSelected
              ? "text-emerald-500 translate-x-0.5"
              : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
          }`}
        />
      </div>
    </button>
  );
}
