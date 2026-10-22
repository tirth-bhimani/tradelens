"use client";

import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";
import { SplitMetrics } from "@/lib/rules/types";
import { formatCurrencyINR, formatPercentage } from "@/lib/utils/format";

export interface SplitMetricsCardProps {
  train: SplitMetrics;
  test: SplitMetrics;
  isOverfit: boolean;
  overfitReason?: string | null;
  smallSampleWarning: boolean;
  smallSampleReason?: string | null;
}

export function SplitMetricsCard({
  train,
  test,
  isOverfit,
  overfitReason,
  smallSampleWarning,
  smallSampleReason,
}: SplitMetricsCardProps) {
  const trainPnlDelta = Number(train.delta.pnl_delta_inr);
  const testPnlDelta = Number(test.delta.pnl_delta_inr);

  return (
    <div
      data-testid="split-metrics-card"
      className="p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.08] rounded-[6px] bg-white dark:bg-[#090e1a] space-y-4 shadow-sm transition-all duration-200"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#2b7fff]" />
            <span>70/30 Train / Test Validation & Overfitting Check</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Guards against curve-fitting by validating in-sample rule optimizations against untouched out-of-sample data.
          </p>
        </div>

        {/* Quant Health Status Badge */}
        <div>
          {isOverfit ? (
            <span
              data-testid="overfit-badge"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overfit Risk Detected</span>
            </span>
          ) : (
            <span
              data-testid="generalization-badge"
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Robust Generalization</span>
            </span>
          )}
        </div>
      </div>

      {/* Overfitting Alert Banner */}
      {isOverfit && (
        <div
          data-testid="overfit-alert-banner"
          className="p-3.5 rounded-[4px] border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 space-y-1 text-xs"
        >
          <div className="font-bold flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Quantitative Warning: Overfitting Alert</span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed pl-5">
            {overfitReason ||
              "This rule improves performance on training data but degrades significantly on out-of-sample test trades. The observed edge may be curve-fitted rather than statistically sound."}
          </p>
        </div>
      )}

      {/* Small Sample Warning Banner */}
      {smallSampleWarning && (
        <div
          data-testid="small-sample-banner"
          className="p-3 rounded-[4px] border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 space-y-0.5 text-xs"
        >
          <div className="font-bold flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Low Sample Size Warning</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 pl-5">
            {smallSampleReason ||
              "Dataset contains fewer than 30 trades or fewer than 10 test trades. Statistical variance is elevated; test split results should be interpreted with caution."}
          </p>
        </div>
      )}

      {/* 70/30 Partition Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-4 font-semibold font-sans">Partition</th>
              <th className="py-2 px-3 font-semibold">Trades Count</th>
              <th className="py-2 px-3 font-semibold">Win Rate</th>
              <th className="py-2 px-3 font-semibold">Net P&L (Before)</th>
              <th className="py-2 px-3 font-semibold">Net P&L (Simulated)</th>
              <th className="py-2 pl-3 font-semibold text-right">P&L Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* Row 1: Train Partition */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
              <td className="py-2.5 pr-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#387ed1]" />
                <span>In-Sample (Train 70%)</span>
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {train.before.total_trades} → {train.after.total_trades}
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {formatPercentage(Number(train.before.win_rate))} →{" "}
                <strong className="text-slate-900 dark:text-white">
                  {formatPercentage(Number(train.after.win_rate))}
                </strong>
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {formatCurrencyINR(Number(train.before.total_net_pnl))}
              </td>
              <td className="py-2.5 px-3 text-slate-900 dark:text-white font-bold">
                {formatCurrencyINR(Number(train.after.total_net_pnl))}
              </td>
              <td className="py-2.5 pl-3 text-right">
                <span
                  className={`inline-flex items-center space-x-1 font-bold ${
                    trainPnlDelta >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trainPnlDelta >= 0 ? "+" : ""}
                  {formatCurrencyINR(trainPnlDelta)}
                </span>
              </td>
            </tr>

            {/* Row 2: Test Partition */}
            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
              <td className="py-2.5 pr-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Out-of-Sample (Test 30%)</span>
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {test.before.total_trades} → {test.after.total_trades}
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {formatPercentage(Number(test.before.win_rate))} →{" "}
                <strong className="text-slate-900 dark:text-white">
                  {formatPercentage(Number(test.after.win_rate))}
                </strong>
              </td>
              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                {formatCurrencyINR(Number(test.before.total_net_pnl))}
              </td>
              <td className="py-2.5 px-3 text-slate-900 dark:text-white font-bold">
                {formatCurrencyINR(Number(test.after.total_net_pnl))}
              </td>
              <td className="py-2.5 pl-3 text-right">
                <span
                  className={`inline-flex items-center space-x-1 font-bold ${
                    testPnlDelta >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {testPnlDelta >= 0 ? "+" : ""}
                  {formatCurrencyINR(testPnlDelta)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
