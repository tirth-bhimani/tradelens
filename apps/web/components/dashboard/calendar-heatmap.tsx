"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Info } from "lucide-react";
import {
  type CalendarHeatmapDay,
  computeCalendarMonth,
} from "@/lib/trades/breakdown-math";
import { type RoundTripTradeView } from "@/lib/trades/trade-filters";
import { DEFAULT_TRADE_LOG } from "@/lib/trades/trade-defaults";
import {
  formatCurrencyINR,
  formatSignedCurrency,
  formatPercentage,
} from "@/lib/utils/format";

export interface CalendarHeatmapProps {
  trades?: RoundTripTradeView[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  className?: string;
}

export function CalendarHeatmap({
  trades = [],
  selectedDate,
  onSelectDate,
  className = "",
}: CalendarHeatmapProps) {
  // Determine default year/month from latest trade in dataset, or current date
  const latestDate = trades[0]?.exitTime ? new Date(trades[0].exitTime) : new Date();
  const [currentYear, setCurrentYear] = useState(latestDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(latestDate.getMonth() + 1); // 1-indexed

  const days = useMemo(() => {
    return computeCalendarMonth(trades, currentYear, currentMonth);
  }, [trades, currentYear, currentMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Monthly aggregated totals
  const monthlyTotals = useMemo(() => {
    const currentMonthDays = days.filter((d) => d.isCurrentMonth && d.isTradingDay);
    const netPnl = currentMonthDays.reduce((acc, d) => acc + d.netPnl, 0);
    const winDays = currentMonthDays.filter((d) => d.netPnl > 0).length;
    const lossDays = currentMonthDays.filter((d) => d.netPnl < 0).length;
    const totalTradingDays = currentMonthDays.length;
    const dayWinRate = totalTradingDays > 0 ? (winDays / totalTradingDays) * 100 : 0;
    return { netPnl, winDays, lossDays, totalTradingDays, dayWinRate };
  }, [days]);

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getIntensityClass = (tier: number, isTradingDay: boolean) => {
    if (!isTradingDay || tier === 0) {
      return "bg-slate-50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800/40";
    }
    switch (tier) {
      case 3:
        return "bg-emerald-600 dark:bg-emerald-600/90 text-white border-emerald-500 shadow-sm";
      case 2:
        return "bg-emerald-400/40 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/60";
      case 1:
        return "bg-emerald-200/40 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40";
      case -1:
        return "bg-rose-200/40 dark:bg-rose-500/15 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800/40";
      case -2:
        return "bg-rose-400/40 dark:bg-rose-500/30 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-700/60";
      case -3:
        return "bg-rose-600 dark:bg-rose-600/90 text-white border-rose-500 shadow-sm";
      default:
        return "bg-slate-50 dark:bg-slate-900/30 text-slate-400";
    }
  };

  return (
    <div
      data-testid="calendar-heatmap"
      className={`p-5 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-4 transition-colors ${className}`}
    >
      {/* Header with Month switcher & Monthly Net P&L Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Monthly P&L Heatmap
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          {/* Month Navigator */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-900 dark:text-white">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[110px] text-center">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Summary Strip */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs tabular-nums">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Month P&L: </span>
          <span
            className={`font-bold ${
              monthlyTotals.netPnl >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatSignedCurrency(monthlyTotals.netPnl)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Day Win Rate: </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {monthlyTotals.dayWinRate.toFixed(1)}% ({monthlyTotals.winDays}W / {monthlyTotals.lossDays}L)
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Trading Days: </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {monthlyTotals.totalTradingDays} active
          </span>
        </div>
      </div>

      {/* 7-Column Calendar Grid */}
      <div className="space-y-1">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 pb-1">
          {weekDayLabels.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, idx) => {
            const isSelected = selectedDate === day.date;
            const intensityClass = getIntensityClass(day.intensityTier, day.isTradingDay);

            return (
              <div
                key={idx}
                onClick={() => {
                  if (day.isCurrentMonth && onSelectDate) {
                    onSelectDate(isSelected ? "" : day.date);
                  }
                }}
                title={
                  day.isTradingDay
                    ? `${day.date}: ${formatSignedCurrency(day.netPnl)} (${day.tradesCount} trades, ${day.winningTrades}W/${day.losingTrades}L)`
                    : `${day.date} (No trades)`
                }
                className={`min-h-[58px] p-1.5 rounded-[4px] border flex flex-col justify-between transition-all select-none ${
                  day.isCurrentMonth ? intensityClass : "opacity-25 pointer-events-none"
                } ${
                  isSelected
                    ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-[#0d131f] scale-[1.02]"
                    : day.isTradingDay
                    ? "cursor-pointer hover:scale-[1.02]"
                    : "cursor-default"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-medium">{day.dayOfMonth}</span>
                  {day.tradesCount > 0 && (
                    <span className="text-[9px] opacity-75">{day.tradesCount}t</span>
                  )}
                </div>

                {day.isTradingDay && (
                  <div className="text-[10px] font-bold tracking-tight tabular-nums truncate">
                    {formatSignedCurrency(day.netPnl, { compact: true, showDecimals: false })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
        <span>Click any day to filter trade log ledger</span>
        <div className="flex items-center space-x-1.5">
          <span>Max Loss</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-600" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-400/40" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400/40" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600" />
          <span>Max Profit</span>
        </div>
      </div>
    </div>
  );
}
