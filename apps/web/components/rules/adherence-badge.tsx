import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TradeViolation } from "@/lib/rules/adherence-types";

export interface AdherenceBadgeProps {
  violation?: TradeViolation | null;
  className?: string;
}

export function AdherenceBadge({ violation, className = "" }: AdherenceBadgeProps) {
  if (!violation) {
    return (
      <span
        title="Executed in compliance with active rules"
        className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
      >
        <CheckCircle2 className="w-2.5 h-2.5" />
        <span>Rule Compliant</span>
      </span>
    );
  }

  return (
    <span
      title={violation.explanation}
      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-help ${className}`}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      <span>{violation.violation_code.replace(/_/g, " ")}</span>
    </span>
  );
}
