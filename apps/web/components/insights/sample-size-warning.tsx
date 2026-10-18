import React from "react";
import { Info } from "lucide-react";

interface SampleSizeWarningProps {
  tradeCount: number;
  threshold?: number;
  className?: string;
}

export function SampleSizeWarning({
  tradeCount,
  threshold = 30,
  className = "",
}: SampleSizeWarningProps) {
  if (tradeCount >= threshold) {
    return null;
  }

  return (
    <div
      data-testid="sample-size-warning"
      className={`inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium ${className}`}
    >
      <Info className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
      <span>
        Small Sample ({tradeCount} trades) • Confidence requires ≥{threshold} trades
      </span>
    </div>
  );
}
