import React from "react";
import Link from "next/link";
import { Sliders, Beaker, BookOpen, ShieldCheck } from "lucide-react";
import { getUserRules } from "@/lib/rules/rulebook-actions";
import { RulebookList } from "@/components/rules/rulebook-list";

export const metadata = {
  title: "Trading Rulebook & Portfolio Guardrails | TradeLens",
  description: "Manage verified trading rules, active execution limits, and post-import adherence controls.",
};

export default async function RulesPage() {
  const { rules } = await getUserRules();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>ACTIVE PORTFOLIO GUARDRAILS • ZERO DRIFT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Personal Trading Rulebook
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Verified algorithmic guardrails activated in your portfolio. When you import new tradebooks, TradeLens evaluates every execution against your active rules to audit discipline and quantify avoidable losses.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <Link
              href="/rule-lab"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <Beaker className="w-3.5 h-3.5" />
              <span>Backtest in Rule Lab</span>
            </Link>
            <Link
              href="/trades"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>View Trade Log</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Rules Manager */}
      <RulebookList initialRules={rules} />
    </div>
  );
}
