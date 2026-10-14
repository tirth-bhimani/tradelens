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
      {/* Welcome Banner */}
      <div className="p-7 md:p-8 rounded-[8px] bg-gradient-to-tr from-[#387ed1] to-sky-600 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-white/20 border border-white/25 text-white text-[11px] font-bold">
            <Sparkles className="w-3 h-3 text-sky-200" />
            <span>Profile Verified • Ready for Import</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs md:text-sm text-blue-100 leading-relaxed max-w-xl">
            Upload your tradebook to uncover behavioral leaks (overtrading, revenge entries, holding losers) and test rule guardrails on your historical trades.
          </p>
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
            <div className="p-1.5 rounded-[4px] bg-blue-50 dark:bg-blue-950/60 text-[#387ed1] dark:text-sky-400">
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
            <div className="p-1.5 rounded-[4px] bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
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

      {/* Empty State / Upload Callout */}
      <div className="p-8 md:p-12 rounded-[8px] bg-white dark:bg-[#0f172a]/70 border border-dashed border-blue-200 dark:border-blue-900/60 text-center space-y-4 shadow-xs backdrop-blur-xs">
        <div className="w-14 h-14 rounded-[8px] bg-blue-50 dark:bg-blue-950/60 text-[#387ed1] dark:text-sky-400 border border-blue-100 dark:border-blue-900/50 mx-auto flex items-center justify-center">
          <UploadCloud className="w-7 h-7" />
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
