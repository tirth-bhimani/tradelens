import Link from "next/link";
import { UploadCloud, TrendingUp, Clock, Layers, ArrowRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/actions";
import { formatIndianDenomination } from "@/lib/utils/format";
import { PerformanceMetricsGrid } from "@/components/dashboard/performance-metrics-grid";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { BehavioralLeaksCard } from "@/components/dashboard/behavioral-leaks-card";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { TimeBreakdownChart } from "@/components/dashboard/time-breakdown-chart";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Trader";
  const capital = profile?.starting_capital ? Number(profile.starting_capital) : 0;
  const timezone = profile?.timezone || "Asia/Kolkata";
  const segments = profile?.trading_segments || ["EQUITY", "FNO"];

  return (
    <div className="space-y-6">
      {/* Welcome Banner: Clean institutional header */}
      <div className="card-zerodha-glass p-6 sm:p-7 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Terminal Active • Ready for Ingestion</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Upload your tradebook to uncover behavioral leaks (overtrading, revenge entries, holding losers) and test rule guardrails on your historical trades.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3">
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

      {/* Account Overview: Unified Institutional Terminal Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        {/* Starting Capital */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Configured Capital</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {capital > 0 ? formatIndianDenomination(capital) : "Not Set"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Baseline for return on capital and drawdown limits.
          </p>
        </div>

        {/* Timezone & Market */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Market Session</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-between">
            <span>NSE / BSE</span>
            <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              09:15 - 15:30 IST
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Timezone: {timezone} (Indian Standard Time)
          </p>
        </div>

        {/* Segments */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Active Segments</span>
            <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {segments.map((seg: string) => (
              <span
                key={seg}
                className="px-2.5 py-0.5 rounded-[4px] text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                {seg}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Statutory STT, GST, and turnover tariffs automatically applied.
          </p>
        </div>
      </div>

      {/* Core Performance Metrics (Task 11 & Task 13) */}
      <PerformanceMetricsGrid startingCapital={capital} />

      {/* Interactive Equity Curve & Drawdown Visualizer (Task 14) */}
      <ChartContainer />

      {/* Behavioral Leaks & Execution Discipline (Task 12) */}
      <BehavioralLeaksCard />

      {/* Monthly P&L Calendar & Execution Timing Diagnostics (Task 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CalendarHeatmap />
        <TimeBreakdownChart />
      </div>

      {/* Empty State / Upload Callout (Theme-adaptive styling) */}
      <div className="p-8 md:p-10 card-zerodha-glass border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-center space-y-4 transition-colors">
        <div className="w-10 h-10 rounded-[4px] bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center">
          <UploadCloud className="w-5 h-5 text-[#387ed1]" />
        </div>

        <div className="max-w-md mx-auto space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Tradebook is Empty</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload your tradebook CSV to compute FIFO round-trip trades, identify behavioral leak patterns, and start backtesting rules.
          </p>
        </div>

        <div className="pt-1">
          <Link
            href="/imports"
            className="btn-zerodha-primary text-xs py-2 px-4"
          >
            <span>Upload Broker Tradebook</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>

  );
}
