"use client";

import React, { useState, useMemo } from "react";
import { Clock, Calendar, BarChart3 } from "lucide-react";
import {
  computeHourlyBreakdown,
  computeWeekdayBreakdown,
} from "@/lib/trades/breakdown-math";
import { type RoundTripTradeView } from "@/lib/trades/trade-filters";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface TimeBreakdownChartProps {
  trades?: RoundTripTradeView[];
  className?: string;
}

export type BreakdownTab = "hourly" | "weekday";

export function TimeBreakdownChart({
  trades = [],
  className = "",
}: TimeBreakdownChartProps) {
  const [activeTab, setActiveTab] = useState<BreakdownTab>("hourly");

  const hourlyData = useMemo(() => computeHourlyBreakdown(trades), [trades]);
  const weekdayData = useMemo(() => computeWeekdayBreakdown(trades), [trades]);

  // Find max magnitude for relative bar width
  const maxHourlyPnl = Math.max(...hourlyData.map((b) => Math.abs(b.netPnl)), 100);
  const maxWeekdayPnl = Math.max(...weekdayData.map((b) => Math.abs(b.netPnl)), 100);

  return (
    <div
      data-testid="time-breakdown-chart"
      className={`p-5 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-4 transition-colors ${className}`}
    >
      {/* Header with Title and Mode Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Execution Timing Diagnostics
          </h3>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center rounded-[4px] p-0.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("hourly")}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
              activeTab === "hourly"
                ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Hour of Day (IST)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("weekday")}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
              activeTab === "weekday"
                ? "bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Day of Week
          </button>
        </div>
      </div>

      {/* Hourly Session View */}
      {activeTab === "hourly" && (
        <div className="space-y-3 pt-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            P&L distribution mapped across regular NSE / BSE session windows (09:15 – 15:30 IST):
          </p>

          <div className="space-y-2.5">
            {hourlyData.map((bucket) => {
              const isProfit = bucket.netPnl >= 0;
              const barWidthPct = Math.min(100, Math.max(4, (Math.abs(bucket.netPnl) / maxHourlyPnl) * 100));

              return (
                <div key={bucket.window} className="space-y-1">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {bucket.window} • <span className="text-slate-400">{bucket.label}</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">
                        {bucket.tradesCount}t ({bucket.winRate.toFixed(0)}% WR)
                      </span>
                      <span
                        className={`font-bold ${
                          isProfit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatSignedCurrency(bucket.netPnl)}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${barWidthPct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isProfit
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : "bg-rose-500 dark:bg-rose-400"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekday Distribution View */}
      {activeTab === "weekday" && (
        <div className="space-y-3 pt-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Net P&L distribution across active trading days of the week:
          </p>

          <div className="space-y-2.5">
            {weekdayData.map((day) => {
              const isProfit = day.netPnl >= 0;
              const barWidthPct = Math.min(100, Math.max(4, (Math.abs(day.netPnl) / maxWeekdayPnl) * 100));

              return (
                <div key={day.dayName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {day.dayName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">
                        {day.tradesCount} trades ({day.winRate.toFixed(0)}% WR)
                      </span>
                      <span
                        className={`font-bold ${
                          isProfit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatSignedCurrency(day.netPnl)}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${barWidthPct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isProfit
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : "bg-rose-500 dark:bg-rose-400"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
