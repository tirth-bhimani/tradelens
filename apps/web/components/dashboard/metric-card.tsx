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
      className={`p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
        <span className="truncate pr-1">{label}</span>
        <div className="flex items-center space-x-1.5 shrink-0">
          {badge}
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
        </div>
      </div>

      <div className={`text-xl font-bold tracking-tight tabular-nums truncate ${valueColorClass}`}>
        {value}
      </div>

      {subValue && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {subValue}
        </div>
      )}
    </div>
  );
}
