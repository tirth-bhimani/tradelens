"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Percent,
  Activity,
  Award,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { SummaryMetricsGridSkeleton } from "./metrics-skeleton";
import {
  formatIndianDenomination,
  formatSignedCurrency,
  formatCurrencyINR,
  formatPercentage,
} from "@/lib/utils/format";

export interface SummaryMetricsData {
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
  grossProfit?: number;
  grossLoss?: number;
}

export interface SummaryMetricsGridProps {
  metrics?: SummaryMetricsData;
  startingCapital?: number;
  isLoading?: boolean;
  defaultCompact?: boolean;
}

export const DEFAULT_SUMMARY_METRICS: SummaryMetricsData = {
  totalTrades: 24,
  winningTrades: 16,
  losingTrades: 8,
  winRate: 66.67,
  totalNetPnl: 48520.5,
  totalCharges: 1479.5,
  profitFactor: 2.85,
  isInfiniteProfitFactor: false,
  expectancyInr: 2021.69,
  maxDrawdownInr: 8400.0,
  maxDrawdownPct: 4.2,
  maxConsecutiveWins: 6,
  maxConsecutiveLosses: 2,
  grossProfit: 74500,
  grossLoss: 24500,
};

export function SummaryMetricsGrid({
  metrics = DEFAULT_SUMMARY_METRICS,
  startingCapital = 0,
  isLoading = false,
  defaultCompact = false,
}: SummaryMetricsGridProps) {
  const [compact, setCompact] = useState(defaultCompact);

  if (isLoading) {
    return <SummaryMetricsGridSkeleton count={6} />;
  }

  const {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalNetPnl,
    totalCharges,
    profitFactor,
    isInfiniteProfitFactor,
    expectancyInr,
    maxDrawdownInr,
    maxDrawdownPct,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  } = metrics;

  const isNetPositive = totalNetPnl >= 0;
  const rocPct =
    startingCapital > 0 ? (totalNetPnl / startingCapital) * 100 : null;

  return (
    <div className="space-y-3">
      {/* Header ribbon with subtle indicator and compact toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Summary Performance Metrics
          </h2>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setCompact(!compact)}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/[0.16] transition-colors"
          >
            Format: {compact ? "Compact (L/Cr)" : "Full (₹)"}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {totalTrades} closed trades
          </span>
        </div>
      </div>

      {/* 6-Card Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Realized Net P&L */}
        <MetricCard
          dataTestId="card-net-pnl"
          label="Realized Net P&L"
          value={formatSignedCurrency(totalNetPnl, { compact })}
          tooltip={`Net: ${formatSignedCurrency(totalNetPnl)} | Charges: ${formatCurrencyINR(totalCharges)}`}
          trend={isNetPositive ? "positive" : "negative"}
          icon={TrendingUp}
          subValue={
            rocPct !== null
              ? `${formatPercentage(rocPct, { includeSign: true })} RoC • ${formatCurrencyINR(totalCharges, { showDecimals: false })} fees`
              : `Fees: ${formatCurrencyINR(totalCharges)} debited`
          }
        />

        {/* Card 2: Win Rate */}
        <MetricCard
          dataTestId="card-win-rate"
          label="Win Rate"
          value={formatPercentage(winRate, { precision: 1 })}
          tooltip={`${winningTrades} wins out of ${totalTrades} total closed trades`}
          trend={winRate >= 50 ? "positive" : "negative"}
          icon={Percent}
          subValue={`${winningTrades}W / ${losingTrades}L (${((winningTrades / (losingTrades || 1))).toFixed(2)} W/L)`}
        />

        {/* Card 3: Profit Factor */}
        <MetricCard
          dataTestId="card-profit-factor"
          label="Profit Factor"
          value={
            isInfiniteProfitFactor
              ? "∞ (Clean)"
              : profitFactor !== null
              ? profitFactor.toFixed(2)
              : "0.00"
          }
          tooltip={
            isInfiniteProfitFactor
              ? "Zero losing trades recorded"
              : `Profit Factor: ${profitFactor !== null ? profitFactor.toFixed(2) : "0.00"}`
          }
          trend={
            isInfiniteProfitFactor || (profitFactor !== null && profitFactor >= 1.5)
              ? "positive"
              : profitFactor !== null && profitFactor < 1.0
              ? "negative"
              : "neutral"
          }
          icon={Activity}
          subValue={
            isInfiniteProfitFactor
              ? "Zero losses recorded"
              : profitFactor !== null && profitFactor >= 1.5
              ? "Strong positive edge"
              : "Edge requires review"
          }
        />

        {/* Card 4: Trade Expectancy */}
        <MetricCard
          dataTestId="card-expectancy"
          label="Trade Expectancy"
          value={formatSignedCurrency(expectancyInr, { compact })}
          tooltip={`Expectancy: ${formatSignedCurrency(expectancyInr)} per trade`}
          trend={expectancyInr >= 0 ? "positive" : "negative"}
          icon={Award}
          subValue="Avg net return / trade"
        />

        {/* Card 5: Maximum Drawdown */}
        <MetricCard
          dataTestId="card-drawdown"
          label="Max Drawdown"
          value={
            compact
              ? `-${formatIndianDenomination(maxDrawdownInr)}`
              : `-${formatCurrencyINR(maxDrawdownInr)}`
          }
          tooltip={`Max Drawdown: -${formatCurrencyINR(maxDrawdownInr)} (${maxDrawdownPct !== null ? maxDrawdownPct.toFixed(1) : 0}%)`}
          trend={maxDrawdownInr > 0 ? "negative" : "neutral"}
          icon={ShieldAlert}
          subValue={
            maxDrawdownPct !== null
              ? `${maxDrawdownPct.toFixed(1)}% peak drop`
              : "Peak-to-trough risk"
          }
        />

        {/* Card 6: Streaks */}
        <MetricCard
          dataTestId="card-streaks"
          label="Max Streaks"
          value={`${maxConsecutiveWins}W / ${maxConsecutiveLosses}L`}
          tooltip={`Longest win streak: ${maxConsecutiveWins} | Longest loss streak: ${maxConsecutiveLosses}`}
          trend={maxConsecutiveWins >= maxConsecutiveLosses ? "positive" : "neutral"}
          icon={Zap}
          subValue="Consecutive run limit"
        />
      </div>
    </div>
  );
}
