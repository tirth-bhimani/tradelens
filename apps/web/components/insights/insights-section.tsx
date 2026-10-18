"use client";

import React from "react";
import { FrontendInsightReport, DEFAULT_INSIGHT_REPORT } from "@/lib/insights/types";
import { TopLeaksBanner } from "./top-leaks-banner";
import { InsightCard } from "./insight-card";
import { ShieldAlert } from "lucide-react";

interface InsightsSectionProps {
  report?: FrontendInsightReport;
  totalTradesAnalyzed?: number;
}

export function InsightsSection({
  report = DEFAULT_INSIGHT_REPORT,
  totalTradesAnalyzed = 24,
}: InsightsSectionProps) {
  const leaks = report.top_leaks.slice(0, 3);

  return (
    <section data-testid="insights-section" className="space-y-4">
      {/* 1. Executive Top Leaks Banner */}
      <TopLeaksBanner report={report} />

      {/* 2. Top 3 Behavioral Leaks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaks.map((leak, idx) => {
          const matchingRule = report.suggested_rules[idx];
          return (
            <InsightCard
              key={leak.leak_type || idx}
              leak={leak}
              rule={matchingRule}
              totalTradesAnalyzed={totalTradesAnalyzed}
            />
          );
        })}
      </div>

      {/* 3. Mandatory Educational Disclaimer */}
      <div className="p-3 rounded-[4px] bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" />
        <p className="leading-relaxed">
          {report.educational_disclaimer}
        </p>
      </div>
    </section>
  );
}
