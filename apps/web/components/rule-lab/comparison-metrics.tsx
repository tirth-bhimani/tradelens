"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Percent,
  Activity,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PerformanceSummary, MetricDelta } from "@/lib/rules/types";
import { formatCurrencyINR, formatPercentage } from "@/lib/utils/format";

export interface ComparisonMetricsProps {
  before: PerformanceSummary;
  after: PerformanceSummary;
  delta: MetricDelta;
}

export function ComparisonMetrics({ before, after, delta }: ComparisonMetricsProps) {
  const pnlDeltaNum = Number(delta.pnl_delta_inr);
  const isPnlPositive = pnlDeltaNum > 0;
  const isPnlNegative = pnlDeltaNum < 0;

  const winRateDeltaNum = Number(delta.win_rate_delta);
  const isWinRatePositive = winRateDeltaNum > 0;

  const ddDeltaNum = Number(delta.max_drawdown_delta_inr);
  // A negative drawdown delta means max drawdown was reduced (improvement!)
  const isDdImproved = ddDeltaNum < 0;

  const pfDeltaNum = delta.profit_factor_delta !== null ? Number(delta.profit_factor_delta) : null;

  return (
    <div className="space-y-3" data-testid="comparison-metrics-container">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Before vs. After Comparative Edge
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Historical Baseline vs. Rule Overlay Simulation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Net Realized P&L */}
        <div className="p-4 sm:p-5 rounded-[6px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-2.5 shadow-sm hover:border-slate-300 dark:hover:border-white/[0.16] transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Net Realized P&L</span>
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isPnlPositive
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : isPnlNegative
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isPnlPositive ? <TrendingUp className="w-3 h-3" /> : isPnlNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>
                {isPnlPositive ? "+" : ""}
                {formatCurrencyINR(pnlDeltaNum)}
              </span>
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-[11px] text-slate-400">Before</div>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400 line-through">
                {formatCurrencyINR(Number(before.total_net_pnl))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Simulated</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrencyINR(Number(after.total_net_pnl))}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Win Rate */}
        <div className="p-4 sm:p-5 rounded-[6px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-2.5 shadow-sm hover:border-slate-300 dark:hover:border-white/[0.16] transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Win Rate</span>
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isWinRatePositive
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isWinRatePositive ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>
                {isWinRatePositive ? "+" : ""}
                {winRateDeltaNum.toFixed(1)}%
              </span>
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-[11px] text-slate-400">Before</div>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {formatPercentage(Number(before.win_rate))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-[#387ed1]">Simulated</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {formatPercentage(Number(after.win_rate))}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Max Drawdown */}
        <div className="p-4 sm:p-5 rounded-[6px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-2.5 shadow-sm hover:border-slate-300 dark:hover:border-white/[0.16] transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Peak Drawdown</span>
            <span
              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isDdImproved
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>
                {isDdImproved ? "Protected" : "Neutral"}
              </span>
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-[11px] text-slate-400">Drawdown Delta</div>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {formatCurrencyINR(ddDeltaNum)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Capital Saved</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrencyINR(Math.abs(ddDeltaNum))}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Trade Volume & Skipped Trades */}
        <div className="p-4 sm:p-5 rounded-[6px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-2.5 shadow-sm hover:border-slate-300 dark:hover:border-white/[0.16] transition-all duration-150">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Executed Trades</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {Math.abs(delta.trades_delta)} Skipped
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-[11px] text-slate-400">Before</div>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400">
                {before.total_trades} trades
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Simulated</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {after.total_trades} trades
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
