"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UploadCloud, ArrowLeft, BookOpen } from "lucide-react";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { TimeBreakdownChart } from "@/components/dashboard/time-breakdown-chart";
import { TradeTable, DEFAULT_TRADE_LOG } from "@/components/trades/trade-table";

export default function TradesPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-zerodha-glass p-6 sm:p-7 relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>FIFO Matched Trades Ledger</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trade Journal & Log
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Inspect round-trip trades, analyze execution timing breakdowns, and tag psychological behaviors (FOMO, Revenge, Planned).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/imports"
              className="btn-zerodha-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Diagnostics Row: Calendar Heatmap + Timing Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CalendarHeatmap
          trades={DEFAULT_TRADE_LOG}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d || undefined)}
        />
        <TimeBreakdownChart trades={DEFAULT_TRADE_LOG} />
      </div>

      {/* Main Trade Table Ledger (Filtered by Date if day was clicked) */}
      <TradeTable
        trades={DEFAULT_TRADE_LOG}
        selectedDate={selectedDate}
        onClearDateFilter={() => setSelectedDate(undefined)}
      />
    </div>
  );
}
