"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { TimeBreakdownChart } from "@/components/dashboard/time-breakdown-chart";
import { TradeTable } from "@/components/trades/trade-table";
import { evaluateClientAdherence } from "@/lib/rules/adherence-evaluator";
import { getUserRules } from "@/lib/rules/rulebook-actions";
import type { SavedRule } from "@/lib/rules/adherence-types";
import { getUserTradesAction } from "@/lib/trades/actions";
import type { RoundTripTradeView } from "@/lib/trades/trade-filters";

export default function TradesPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [trades, setTrades] = useState<RoundTripTradeView[]>([]);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserTradesAction(), getUserRules()]).then(([tradeRes, ruleRes]) => {
      setTrades(tradeRes.trades || []);
      setRules(ruleRes.rules || []);
      setIsLoading(false);
    });
  }, []);

  const adherenceReport = evaluateClientAdherence(trades, rules);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>FIFO MATCHED TRADES LEDGER</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trade Journal &amp; Log
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Inspect round-trip trades, analyze execution timing breakdowns, and tag psychological behaviors (FOMO, Revenge, Planned).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/imports"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Diagnostics Row: Calendar Heatmap + Timing Breakdown or Clean Empty State */}
      {!isLoading && trades.length === 0 ? (
        <div className="card-luminous p-10 text-center space-y-4 border border-dashed border-slate-300 dark:border-white/[0.12] rounded-[8px] bg-slate-50/50 dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-[6px] bg-blue-50 dark:bg-blue-950/30 text-[#2b7fff] border border-blue-200 dark:border-blue-800/40 mx-auto flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Trades in Your Journal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Your tradebook is completely clean and empty. Upload your CSV from Zerodha, Groww, AngelOne, or Dhan to automatically match executions into FIFO round-trips.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/imports"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CalendarHeatmap
              trades={trades}
              selectedDate={selectedDate}
              onSelectDate={(d) => setSelectedDate(d || undefined)}
            />
            <TimeBreakdownChart trades={trades} />
          </div>

          <TradeTable
            trades={trades}
            violations={adherenceReport.violations}
            selectedDate={selectedDate}
            onClearDateFilter={() => setSelectedDate(undefined)}
          />
        </>
      )}
    </div>
  );
}
