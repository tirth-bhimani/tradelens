import React from "react";
import { MetricCardSkeleton } from "./metrics-skeleton";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  trend?: "positive" | "negative" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  tooltip?: string;
  isLoading?: boolean;
  className?: string;
  dataTestId?: string;
}

/**
 * MetricCard
 *
 * Institutional trading KPI card with clean hairline borders,
 * tabular numerals, optional trend coloring, and integrated skeleton loading.
 */
export function MetricCard({
  label,
  value,
  subValue,
  trend = "neutral",
  icon: Icon,
  badge,
  tooltip,
  isLoading = false,
  className = "",
  dataTestId,
}: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton />;
  }

  const valueColorClass =
    trend === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "negative"
      ? "text-rose-600 dark:text-rose-400"
      : "text-slate-900 dark:text-white";

  return (
    <div
      data-testid={dataTestId || "metric-card"}
      title={tooltip}
      className={`p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1.5 transition-colors duration-200 hover:border-[#2b7fff]/40 dark:hover:border-[#2b7fff]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(43,127,255,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_4px_24px_rgba(43,127,255,0.15)] relative overflow-hidden group before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#2b7fff] before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300 ${className}`}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
        <span className="truncate pr-1 tracking-tight">{label}</span>
        <div className="flex items-center space-x-1.5 shrink-0">
          {badge}
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#2b7fff] transition-colors" />}
        </div>
      </div>

      <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums truncate transition-colors ${valueColorClass}`}>
        {value}
      </div>

      {subValue && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
          {subValue}
        </div>
      )}
    </div>
  );
}
