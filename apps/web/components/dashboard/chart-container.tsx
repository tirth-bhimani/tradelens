"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { UploadCloud, Layers, Eye } from "lucide-react";
import {
  type ChartPoint,
  type TimeframeFilter,
  filterDataByTimeframe,
  downsampleData,
} from "@/lib/charts/chart-options";
import { EquityChart } from "./equity-chart";
import { DrawdownChart } from "./drawdown-chart";
import { ChartSkeleton } from "./chart-skeleton";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface ChartContainerProps {
  data?: ChartPoint[];
  isLoading?: boolean;
  defaultTimeframe?: TimeframeFilter;
}

export type ChartViewTab = "equity" | "drawdown" | "split";

// Default sample dataset representing 24 trades matching the task11/13 baseline
export const DEFAULT_CHART_DATA: ChartPoint[] = [
  { date: "2024-03-01", timestamp: 1709251200000, label: "RELIANCE", netPnl: 3400, cumulativePnl: 3400, peakPnl: 3400, drawdownInr: 0, drawdownPct: 0, symbol: "RELIANCE" },
  { date: "2024-03-04", timestamp: 1709510400000, label: "TCS", netPnl: 5200, cumulativePnl: 8600, peakPnl: 8600, drawdownInr: 0, drawdownPct: 0, symbol: "TCS" },
  { date: "2024-03-06", timestamp: 1709683200000, label: "INFY", netPnl: -2100, cumulativePnl: 6500, peakPnl: 8600, drawdownInr: 2100, drawdownPct: 24.4, symbol: "INFY" },
  { date: "2024-03-08", timestamp: 1709856000000, label: "HDFCBANK", netPnl: 4800, cumulativePnl: 11300, peakPnl: 11300, drawdownInr: 0, drawdownPct: 0, symbol: "HDFCBANK" },
  { date: "2024-03-11", timestamp: 1710115200000, label: "ICICIBANK", netPnl: 6100, cumulativePnl: 17400, peakPnl: 17400, drawdownInr: 0, drawdownPct: 0, symbol: "ICICIBANK" },
  { date: "2024-03-13", timestamp: 1710288000000, label: "SBIN", netPnl: -4200, cumulativePnl: 13200, peakPnl: 17400, drawdownInr: 4200, drawdownPct: 24.1, symbol: "SBIN" },
  { date: "2024-03-15", timestamp: 1710460800000, label: "KOTAKBANK", netPnl: -4200, cumulativePnl: 9000, peakPnl: 17400, drawdownInr: 8400, drawdownPct: 48.3, symbol: "KOTAKBANK" },
  { date: "2024-03-18", timestamp: 1710720000000, label: "BAJFINANCE", netPnl: 7500, cumulativePnl: 16500, peakPnl: 17400, drawdownInr: 900, drawdownPct: 5.2, symbol: "BAJFINANCE" },
  { date: "2024-03-20", timestamp: 1710892800000, label: "TATAMOTORS", netPnl: 8900, cumulativePnl: 25400, peakPnl: 25400, drawdownInr: 0, drawdownPct: 0, symbol: "TATAMOTORS" },
  { date: "2024-03-22", timestamp: 1711065600000, label: "LT", netPnl: 5400, cumulativePnl: 30800, peakPnl: 30800, drawdownInr: 0, drawdownPct: 0, symbol: "LT" },
  { date: "2024-03-25", timestamp: 1711324800000, label: "BHARTIARTL", netPnl: -2600, cumulativePnl: 28200, peakPnl: 30800, drawdownInr: 2600, drawdownPct: 8.4, symbol: "BHARTIARTL" },
  { date: "2024-03-27", timestamp: 1711497600000, label: "ITC", netPnl: 6800, cumulativePnl: 35000, peakPnl: 35000, drawdownInr: 0, drawdownPct: 0, symbol: "ITC" },
  { date: "2024-04-01", timestamp: 1711929600000, label: "AXISBANK", netPnl: 4200, cumulativePnl: 39200, peakPnl: 39200, drawdownInr: 0, drawdownPct: 0, symbol: "AXISBANK" },
  { date: "2024-04-03", timestamp: 1712102400000, label: "MARUTI", netPnl: -3100, cumulativePnl: 36100, peakPnl: 39200, drawdownInr: 3100, drawdownPct: 7.9, symbol: "MARUTI" },
  { date: "2024-04-05", timestamp: 1712275200000, label: "SUNPHARMA", netPnl: 5900, cumulativePnl: 42000, peakPnl: 42000, drawdownInr: 0, drawdownPct: 0, symbol: "SUNPHARMA" },
  { date: "2024-04-08", timestamp: 1712534400000, label: "TITAN", netPnl: 6520.50, cumulativePnl: 48520.50, peakPnl: 48520.50, drawdownInr: 0, drawdownPct: 0, symbol: "TITAN" },
];

export function ChartContainer({
  data = DEFAULT_CHART_DATA,
  isLoading = false,
  defaultTimeframe = "ALL",
}: ChartContainerProps) {
  const [activeTab, setActiveTab] = useState<ChartViewTab>("equity");
  const [timeframe, setTimeframe] = useState<TimeframeFilter>(defaultTimeframe);

  // Timeframe filtered & downsampled data
  const filteredData = useMemo(() => {
    const sliced = filterDataByTimeframe(data, timeframe);
    return downsampleData(sliced, 300);
  }, [data, timeframe]);

  if (isLoading) {
    return <ChartSkeleton height={280} />;
  }

  // Handle empty state gracefully
  if (!data || data.length === 0) {
    return (
      <div className="p-8 rounded-[6px] border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] text-center space-y-4">
        <div className="w-10 h-10 rounded-[4px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center">
          <UploadCloud className="w-5 h-5 text-[#387ed1]" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No Equity Data Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload your broker tradebook to plot cumulative Net P&L curves and track peak-to-trough drawdowns.
          </p>
        </div>
        <Link
          href="/imports"
          className="btn-zerodha-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import Trades</span>
        </Link>
      </div>
    );
  }

  // Summary figures in current selected window
  const endingPoint = filteredData[filteredData.length - 1] ?? data[data.length - 1];
  const peakPnl = Math.max(...filteredData.map((p) => p.peakPnl), 0);
  const maxDDInr = Math.max(...filteredData.map((p) => p.drawdownInr), 0);
  const maxDDPct = Math.max(...filteredData.map((p) => p.drawdownPct), 0);

  const timeframes: TimeframeFilter[] = ["1W", "1M", "3M", "1Y", "ALL"];

  return (
    <div
      data-testid="chart-container"
      className="p-5 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-4 transition-colors"
    >
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Performance Trajectory
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Tab Selector */}
          <div className="flex items-center rounded-[4px] p-0.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("equity")}
              className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                activeTab === "equity"
                  ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Equity Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("drawdown")}
              className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                activeTab === "drawdown"
                  ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Drawdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("split")}
              className={`px-2 py-1 rounded-[3px] font-medium transition-colors ${
                activeTab === "split"
                  ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Split Stacked View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center space-x-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-[4px] text-xs font-medium tabular-nums transition-colors ${
                  timeframe === tf
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Period Summary Figures */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs tabular-nums pt-0.5">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Net Period P&L: </span>
          <span
            className={`font-semibold ${
              endingPoint.cumulativePnl >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatSignedCurrency(endingPoint.cumulativePnl)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">All-Time Peak: </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrencyINR(peakPnl)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Period Max DD: </span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            -{formatCurrencyINR(maxDDInr)} ({formatPercentage(maxDDPct)})
          </span>
        </div>
        <div className="text-slate-400 dark:text-slate-500 text-[11px] ml-auto">
          {filteredData.length} points plotted
        </div>
      </div>

      {/* Charts Display */}
      {activeTab === "equity" && (
        <EquityChart data={filteredData} height={280} />
      )}

      {activeTab === "drawdown" && (
        <DrawdownChart data={filteredData} height={240} />
      )}

      {activeTab === "split" && (
        <div className="space-y-6 pt-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Cumulative Net P&L (Equity Trajectory)
            </span>
            <EquityChart data={filteredData} height={220} />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              Peak-to-Trough Underwater Drawdown
            </span>
            <DrawdownChart data={filteredData} height={160} />
          </div>
        </div>
      )}
    </div>
  );
}
