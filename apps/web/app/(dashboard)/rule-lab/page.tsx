import Link from "next/link";
import { Beaker, ArrowRight, ShieldCheck, Play, Sparkles } from "lucide-react";

export default function RuleLabPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-zerodha-glass p-6 sm:p-7 relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
              <Beaker className="w-3.5 h-3.5 text-[#387ed1]" />
              <span>Rule Lab • Deterministic Backtester</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trading Rule Lab
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Design behavioral guardrails from a fixed catalog (loss cutoffs, cooldowns, size caps) and backtest them on your past trades with a 70/30 train/test split.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3">
            <Link
              href="/imports"
              className="btn-zerodha-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <span>Import Tradebook First</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Rules Catalog: Unified Institutional Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] rounded-[6px] overflow-hidden">
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Rule 01</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            Daily Loss Circuit Breaker
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Halts trading when daily realized drawdown exceeds a configured percentage of starting capital.
          </p>
        </div>

        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Rule 02</span>
            <ShieldCheck className="w-4 h-4 text-[#387ed1]" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            Post-Loss Cooldown
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforces a mandatory 30-minute pause after 2 consecutive losing trades to prevent emotional revenge entries.
          </p>
        </div>

        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Rule 03</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            Expiry Day Position Cap
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Limits maximum lot exposure on Thursday Nifty/Sensex weekly expiry sessions to control gamma risk.
          </p>
        </div>
      </div>
    </div>
  );
}
