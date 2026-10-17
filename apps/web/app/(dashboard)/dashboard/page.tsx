import Link from "next/link";
import { UploadCloud, TrendingUp, Clock, Layers, ArrowRight, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/actions";
import { formatIndianDenomination } from "@/lib/utils/format";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Trader";
  const capital = profile?.starting_capital ? Number(profile.starting_capital) : 0;
  const timezone = profile?.timezone || "Asia/Kolkata";
  const segments = profile?.trading_segments || ["EQUITY", "FNO"];

  return (
    <div className="space-y-6">
      {/* Welcome Banner: Theme-adaptive Zerodha card aesthetic */}
      <div className="card-zerodha-glass p-6 sm:p-8 relative overflow-hidden border border-slate-200/80 dark:border-slate-800 transition-colors">
        {/* Subtle ambient light glow */}
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-slate-200/40 dark:from-slate-800/40 via-transparent to-transparent rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-[#387ed1] dark:text-sky-400" />
              <span>Profile Verified • Ready for Import</span>
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
              className="btn-zerodha-primary btn-groww-shimmer text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Starting Capital */}
        <div className="p-5 card-zerodha-glass space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Configured Capital</span>
            <div className="p-1.5 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {capital > 0 ? formatIndianDenomination(capital) : "Not Set"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Baseline for return on capital and drawdown limits.
          </p>
        </div>

        {/* Timezone & Market */}
        <div className="p-5 card-zerodha-glass space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Market Session</span>
            <div className="p-1.5 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            NSE / BSE
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Timezone: {timezone} (09:15 - 15:30 IST)
          </p>
        </div>

        {/* Segments */}
        <div className="p-5 card-zerodha-glass space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Segments</span>
            <div className="p-1.5 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {segments.map((seg: string) => (
              <span
                key={seg}
                className="px-2 py-0.5 rounded-[3px] text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                {seg}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            STT and exchange tax rates mapped automatically.
          </p>
        </div>
      </div>

      {/* Empty State / Upload Callout (Theme-adaptive styling) */}
      <div className="p-8 md:p-12 card-zerodha-glass border border-dashed border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 text-center space-y-4 transition-colors">
        <div className="w-14 h-14 rounded-[8px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center">
          <UploadCloud className="w-7 h-7 text-[#387ed1] dark:text-sky-400" />
        </div>

        <div className="max-w-md mx-auto space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Tradebook is Empty</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload your tradebook CSV to compute FIFO round-trip trades, identify behavioral leak patterns, and start backtesting rules.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/imports"
            className="btn-zerodha-primary btn-groww-shimmer"
          >
            <span>Upload Broker Tradebook</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>

  );
}
