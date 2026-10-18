"use client";

import { TrendingUp, ShieldAlert, Award, Activity, Percent, ArrowUpRight } from "lucide-react";
import { formatIndianCurrency } from "@/lib/utils/format";

export interface PerformanceMetricsData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalNetPnl: number;
  totalCharges: number;
  profitFactor: number | null;
  isInfiniteProfitFactor: boolean;
  expectancyInr: number;
  maxDrawdownInr: number;
  maxDrawdownPct: number | null;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

interface PerformanceMetricsGridProps {
  metrics?: PerformanceMetricsData;
}

const DEFAULT_METRICS: PerformanceMetricsData = {
  totalTrades: 24,
  winningTrades: 16,
  losingTrades: 8,
  winRate: 66.67,
  totalNetPnl: 48520.50,
  totalCharges: 1479.50,
  profitFactor: 2.85,
  isInfiniteProfitFactor: false,
  expectancyInr: 2021.69,
  maxDrawdownInr: 8400.00,
  maxDrawdownPct: 4.20,
  maxConsecutiveWins: 6,
  maxConsecutiveLosses: 2,
};

export function PerformanceMetricsGrid({ metrics = DEFAULT_METRICS }: PerformanceMetricsGridProps) {
  const isNetPositive = metrics.totalNetPnl >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Core Performance Metrics
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Based on {metrics.totalTrades} closed round-trip trades
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Net P&L */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Realized Net P&L</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div
            className={`text-xl font-bold tracking-tight tabular-nums ${
              isNetPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isNetPositive ? "+" : ""}
            {formatIndianCurrency(metrics.totalNetPnl)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Charges: {formatIndianCurrency(metrics.totalCharges)} debited
          </p>
        </div>

        {/* Card 2: Win Rate */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Win Rate</span>
            <Percent className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white flex items-center justify-between">
            <span>{metrics.winRate.toFixed(1)}%</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {metrics.winningTrades}W / {metrics.losingTrades}L
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Expectancy: +{formatIndianCurrency(metrics.expectancyInr)} / trade
          </p>
        </div>

        {/* Card 3: Profit Factor */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Profit Factor</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {metrics.isInfiniteProfitFactor
              ? "∞ (Clean)"
              : metrics.profitFactor !== null
              ? metrics.profitFactor.toFixed(2)
              : "0.00"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Consecutive streaks: {metrics.maxConsecutiveWins}W / {metrics.maxConsecutiveLosses}L
          </p>
        </div>

        {/* Card 4: Max Drawdown */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {formatIndianCurrency(metrics.maxDrawdownInr)}
            {metrics.maxDrawdownPct !== null && (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                ({metrics.maxDrawdownPct.toFixed(1)}%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Peak-to-trough capital risk
          </p>
        </div>
      </div>
    </div>
  );
}
