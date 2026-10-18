"use client";

import { HelpCircle } from "lucide-react";
import { formatIndianCurrency } from "@/lib/utils/format";

export type ReconciliationStatus = "MATCHED" | "DISCREPANCY" | "MISSING_IN_APP" | "MISSING_IN_BROKER";
export type DiscrepancyReason =
  | "DP_CHARGES_UNACCOUNTED"
  | "OPEN_POSITION_RESIDUAL"
  | "MISSING_TRADE_FILLS"
  | "CORPORATE_ACTION_UNADJUSTED"
  | "STAMP_DUTY_STATE_VARIATION"
  | "ROUNDING_VARIANCE"
  | "UNCLASSIFIED_DELTA";

export interface SymbolReconciliationItem {
  symbol: str;
  status: ReconciliationStatus;
  app_gross_pnl: number;
  broker_gross_pnl: number;
  gross_delta: number;
  app_charges: number;
  broker_charges: number;
  charges_delta: number;
  app_net_pnl: number;
  broker_net_pnl: number;
  net_delta: number;
  paired_trades_count: number;
  has_open_positions: boolean;
  discrepancy_reasons: DiscrepancyReason[];
  explanation?: string;
}

// Temporary type fix: str -> string
type str = string;

interface DiscrepancyCardProps {
  item: SymbolReconciliationItem;
}

const REASON_LABELS: Record<DiscrepancyReason, { label: string; color: string }> = {
  DP_CHARGES_UNACCOUNTED: { label: "CDSL/NSDL DP Charges", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  OPEN_POSITION_RESIDUAL: { label: "Residual Open Lot", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  MISSING_TRADE_FILLS: { label: "Missing Fills", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  CORPORATE_ACTION_UNADJUSTED: { label: "Corporate Action", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  STAMP_DUTY_STATE_VARIATION: { label: "Stamp Duty Variance", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  ROUNDING_VARIANCE: { label: "Statutory Rounding (≤₹1)", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  UNCLASSIFIED_DELTA: { label: "Unclassified Variance", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
};

export function DiscrepancyCard({ item }: DiscrepancyCardProps) {
  const isMatched = item.status === "MATCHED";
  const isMissing = item.status.startsWith("MISSING");

  return (
    <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              {item.symbol}
            </span>
            {item.paired_trades_count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium">
                {item.paired_trades_count} trade{item.paired_trades_count > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {item.has_open_positions && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              • Has open inventory carrying unrealized P&L
            </span>
          )}
        </div>

        {/* Status Indicator (Minimalist Dot + Clean Text, Zero Yellow AI Box) */}
        <div className="shrink-0">
          {isMatched ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Matched</span>
            </span>
          ) : isMissing ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{item.status === "MISSING_IN_APP" ? "Missing in App" : "Missing in Broker"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>Audit Variance</span>
            </span>
          )}
        </div>
      </div>

      {/* Flat Financial Comparison Row */}
      <div className="grid grid-cols-3 gap-2 py-2 my-2 border-y border-slate-100 dark:border-slate-800/80 text-xs">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">TradeLens Net</span>
          <span className={`tabular-nums text-xs font-semibold ${item.app_net_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatIndianCurrency(item.app_net_pnl)}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Broker Net</span>
          <span className={`tabular-nums text-xs font-semibold ${item.broker_net_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatIndianCurrency(item.broker_net_pnl)}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Variance</span>
          <span className={`tabular-nums text-xs font-semibold ${
            Math.abs(item.net_delta) <= 1.00
              ? "text-slate-500 dark:text-slate-400"
              : item.net_delta > 0
              ? "text-slate-900 dark:text-white"
              : "text-slate-700 dark:text-slate-300"
          }`}>
            {item.net_delta > 0 ? "+" : ""}{formatIndianCurrency(item.net_delta)}
          </span>
        </div>
      </div>

      {/* Discrepancy Reasons Tags */}
      {item.discrepancy_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-2">
          {item.discrepancy_reasons.map((reason) => {
            const config = REASON_LABELS[reason] || { label: reason, color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
            return (
              <span
                key={reason}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-[3px] border ${config.color}`}
              >
                {config.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Diagnostic Explanation (Clean text, no inner gray box) */}
      {item.explanation && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 flex items-start gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>{item.explanation}</span>
        </p>
      )}
    </div>
  );
}
