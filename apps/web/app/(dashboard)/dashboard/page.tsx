import Link from "next/link";
import { UploadCloud, TrendingUp, Clock, Layers, ArrowRight, BookOpen } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/actions";
import { formatIndianDenomination } from "@/lib/utils/format";
import { PerformanceMetricsGrid } from "@/components/dashboard/performance-metrics-grid";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { BehavioralLeaksCard } from "@/components/dashboard/behavioral-leaks-card";
import { AdherenceScorecard } from "@/components/rules/adherence-scorecard";
import { getUserRules } from "@/lib/rules/rulebook-actions";
import { evaluateClientAdherence } from "@/lib/rules/adherence-evaluator";
import { getUserTradesAction } from "@/lib/trades/actions";
import {
  computeDashboardMetrics,
  computeEquityChartPoints,
  computeBehavioralLeaks,
} from "@/lib/trades/dashboard-metrics";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Trader";
  const capital = profile?.starting_capital ? Number(profile.starting_capital) : 0;
  const timezone = profile?.timezone || "Asia/Kolkata";
  const segments = profile?.trading_segments || ["EQUITY", "FNO"];

  const { rules } = await getUserRules();
  const { trades } = await getUserTradesAction();

  const hasTrades = trades && trades.length > 0;
  const metrics = computeDashboardMetrics(trades, capital);
  const chartData = computeEquityChartPoints(trades);
  const leaksData = computeBehavioralLeaks(trades);
  const adherenceReport = evaluateClientAdherence(trades, rules);

  return (
    <div className="space-y-6">
      {/* Welcome Banner: Clean institutional header */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-all duration-200 border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        {/* Subtle Ambient Bloom Glow behind Welcome Card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TERMINAL ACTIVE • {hasTrades ? "INGESTION SYNCED" : "READY FOR INGESTION"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Track execution discipline, diagnose behavioral leaks (overtrading, revenge entries, holding losers), and backtest rule guardrails against your actual historical trades.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <Link
              href="/trades"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>View Trade Log</span>
            </Link>
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

      {/* Account Overview: Unified Institutional Terminal Ribbon */}
      <div className="card-luminous grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] rounded-[8px] overflow-hidden shadow-sm">
        {/* Starting Capital */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Configured Capital</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
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
            <span className="font-mono">NSE / BSE</span>
            <span className="text-xs font-medium font-mono tabular-nums text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                className="px-2.5 py-0.5 rounded-[4px] text-xs font-medium font-mono bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]"
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

      {/* Conditional: Main Analytics Dashboard or Fresh Isolated Account Welcome */}
      {!hasTrades ? (
        <div className="card-luminous p-8 md:p-10 text-center space-y-5 border border-dashed border-slate-300 dark:border-white/[0.12] rounded-[8px] bg-slate-50/50 dark:bg-[#070b14]">
          <div className="w-14 h-14 rounded-[8px] bg-blue-50 dark:bg-blue-950/40 text-[#2b7fff] border border-blue-200 dark:border-blue-900/60 mx-auto flex items-center justify-center shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Welcome to TradeLens! Your Dashboard is Clean &amp; Ready
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
              Your trading account is isolated, private, and pristine. You have not uploaded any tradebook files yet. Import your broker tradebook (CSV from Zerodha, Groww, AngelOne, or Dhan) to compute FIFO round-trips, identify behavioral leak patterns, and start backtesting rules.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/imports"
              className="kiro-btn-cta !h-10 !px-5 text-xs font-bold inline-flex items-center space-x-2 shadow-[0_0_20px_-3px_rgba(43,127,255,0.4)]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Broker Tradebook</span>
            </Link>
            <Link
              href="/rule-lab"
              className="kiro-btn-outline !h-10 !px-5 text-xs font-semibold inline-flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore Rule Lab</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Core Performance Metrics (Task 11 & Task 13) */}
          <PerformanceMetricsGrid metrics={metrics} startingCapital={capital} />

          {/* Interactive Equity Curve & Drawdown Visualizer (Task 14) */}
          <ChartContainer data={chartData} />

          {/* Behavioral Leaks & Execution Discipline (Task 12) */}
          <BehavioralLeaksCard data={leaksData} />

          {/* Rulebook Discipline & Adherence Scorecard (Task 23) */}
          <AdherenceScorecard report={adherenceReport} />
        </>
      )}
    </div>
  );
}
