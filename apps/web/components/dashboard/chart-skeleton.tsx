import React from "react";

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      data-testid="chart-skeleton"
      className="p-5 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-4 animate-pulse"
    >
      {/* Header controls skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded-[4px]" />
          <div className="h-7 w-36 bg-slate-100 dark:bg-slate-800 rounded-[4px]" />
        </div>
      </div>

      {/* Metric badges placeholder */}
      <div className="flex items-center space-x-4">
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800/80 rounded" />
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800/80 rounded" />
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800/80 rounded" />
      </div>

      {/* Main chart canvas placeholder */}
      <div
        style={{ height }}
        className="w-full rounded bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800/60 flex flex-col justify-between p-4"
      >
        <div className="w-full border-b border-slate-200/50 dark:border-slate-800/40" />
        <div className="w-full border-b border-slate-200/50 dark:border-slate-800/40" />
        <div className="w-full border-b border-slate-200/50 dark:border-slate-800/40" />
        <div className="w-full border-b border-slate-200/50 dark:border-slate-800/40" />
      </div>
    </div>
  );
}
