import React from "react";
import Link from "next/link";
import { Activity, Beaker, BookOpen } from "lucide-react";
import { InsightsSection } from "@/components/insights/insights-section";
import { DEFAULT_INSIGHT_REPORT } from "@/lib/insights/types";

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-zerodha-glass p-6 sm:p-7 relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-[#387ed1]" />
              <span>Execution Diagnostics • Quantitative Audit</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Behavioral Execution Audit
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Objective diagnostic analysis cross-referencing your trading execution against standard risk guardrails to identify capital leaks and recommend rule parameters.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/rule-lab"
              className="px-3 py-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition inline-flex items-center space-x-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Rule Lab</span>
            </Link>
            <Link
              href="/trades"
              className="btn-zerodha-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Trade Journal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Insights Section */}
      <InsightsSection report={DEFAULT_INSIGHT_REPORT} totalTradesAnalyzed={24} />
    </div>
  );
}
