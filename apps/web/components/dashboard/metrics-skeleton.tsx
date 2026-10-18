import React from "react";

export function MetricCardSkeleton() {
  return (
    <div
      data-testid="metric-card-skeleton"
      className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-2 animate-pulse min-h-[92px]"
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3.5 w-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-2.5 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
    </div>
  );
}

export function SummaryMetricsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between animate-pulse">
        <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
