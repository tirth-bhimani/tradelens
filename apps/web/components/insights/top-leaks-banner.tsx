import React from "react";
import { CheckCircle2, ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { FrontendInsightReport } from "@/lib/insights/types";
import { formatIndianCurrency } from "@/lib/utils/format";

interface TopLeaksBannerProps {
  report: FrontendInsightReport;
}

export function TopLeaksBanner({ report }: TopLeaksBannerProps) {
  const primaryLeak = report.top_leaks[0];

  return (
    <div data-testid="top-leaks-banner" className="space-y-4">
      {/* 3-Column Institutional Metric Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[4px] overflow-hidden">
        {/* Metric 1: Discipline Rating */}
        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              Execution Rating
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums flex items-baseline gap-2">
            <span>Grade {report.discipline_grade}</span>
            <span className="text-xs text-slate-500 font-mono">
              ({report.discipline_score}/100)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Computed from execution consistency and behavioral leaks.
          </p>
        </div>

        {/* Metric 2: Primary Capital Drag */}
        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              Primary Capital Drag
            </span>
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {primaryLeak && primaryLeak.pnl_impact_inr !== undefined
              ? `-${formatIndianCurrency(Math.abs(primaryLeak.pnl_impact_inr))}`
              : "Compounded Drawdown"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {primaryLeak ? primaryLeak.title : "No major leak detected"}
          </p>
        </div>

        {/* Metric 3: Verification Standard */}
        <div className="p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">
              Audit Standard
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            {report.grounding_verified && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span data-testid="grounding-verified-badge" className="text-sm">
              Grounding Verified
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {report.provider_used} • ±2% error tolerance
          </p>
        </div>
      </div>

      {/* Brief Contextual Summary Strip */}
      <div className="p-3.5 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Summary: </span>
        {report.overall_summary}
      </div>
    </div>
  );
}
