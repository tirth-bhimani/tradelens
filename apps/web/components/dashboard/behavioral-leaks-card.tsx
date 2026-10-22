"use client";

import Link from "next/link";
import { ShieldCheck, Flame, Scale, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { formatIndianCurrency } from "@/lib/utils/format";

export interface BehavioralLeaksData {
  disciplineScore: number;
  topLeak: {
    title: string;
    financialImpactInr: number;
    description: string;
  };
  reentryTradesCount: number;
  reentryLossInr: number;
  reentryWinRate: number;
  overtradingDaysCount: number;
  overtradingLossInr: number;
  sizeCreepTradesCount: number;
  sizeCreepLossInr: number;
  holdingLosersRatio: number | null;
  avgWinnerDuration: string;
  avgLoserDuration: string;
}

interface BehavioralLeaksCardProps {
  data?: BehavioralLeaksData;
}

const DEFAULT_BEHAVIOR: BehavioralLeaksData = {
  disciplineScore: 78,
  topLeak: {
    title: "Re-entry Tilt After Losses",
    financialImpactInr: 12450.00,
    description: "Entering trades hastily within 15 minutes of a loss resulted in a 25.0% win rate and ₹12,450 in net losses.",
  },
  reentryTradesCount: 4,
  reentryLossInr: 12450.00,
  reentryWinRate: 25.0,
  overtradingDaysCount: 1,
  overtradingLossInr: 4200.00,
  sizeCreepTradesCount: 2,
  sizeCreepLossInr: 5800.00,
  holdingLosersRatio: 2.4,
  avgWinnerDuration: "4m 15s",
  avgLoserDuration: "10m 12s",
};

export function BehavioralLeaksCard({ data = DEFAULT_BEHAVIOR }: BehavioralLeaksCardProps) {
  const isGoodScore = data.disciplineScore >= 80;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2b7fff] animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
            Psychological & Execution Leak Analysis
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Discipline Score:
          </span>
          <span className={`text-xs font-bold font-mono tabular-nums px-2.5 py-0.5 rounded-[4px] border ${
            isGoodScore
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200"
          }`}>
            {data.disciplineScore} / 100
          </span>
        </div>
      </div>

      {/* Primary Leak Callout Strip (Institutional Hairline Card) */}
      <div className="card-luminous p-4 sm:p-5 rounded-[8px] border border-rose-300/60 dark:border-rose-900/40 bg-white dark:bg-[#090e1a] space-y-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">
                Primary Leak
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                {data.topLeak.title}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {data.topLeak.description}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link
                href="/tilt-autopsy"
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center space-x-1 group font-mono"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Forensic Tilt Autopsy</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <Link
                href="/rule-lab"
                className="text-xs font-semibold text-[#2b7fff] hover:text-[#3b82f6] inline-flex items-center space-x-1 group"
              >
                <span>Backtest tilt guardrail in Rule Lab</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 pt-1 sm:pt-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">Attributable Loss</span>
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              -{formatIndianCurrency(data.topLeak.financialImpactInr)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Leaks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Leak 1: Re-entry Tilt */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1.5 shadow-sm hover:border-[#2b7fff]/40 dark:hover:border-[#2b7fff]/50 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Re-entry After Loss</span>
            <Flame className="w-3.5 h-3.5 text-rose-500/80" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white flex items-center justify-between">
            <span>{data.reentryTradesCount} Trades</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal">
              {data.reentryWinRate.toFixed(1)}% WR
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Damage: -{formatIndianCurrency(data.reentryLossInr)} in &le;60m
          </p>
        </div>

        {/* Leak 2: Overtrading */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1.5 shadow-sm hover:border-[#2b7fff]/40 dark:hover:border-[#2b7fff]/50 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Overtrading Days</span>
            <Scale className="w-3.5 h-3.5 text-amber-500/80" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.overtradingDaysCount} {data.overtradingDaysCount === 1 ? "Day" : "Days"}
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Volume &gt; 1.5x median (-{formatIndianCurrency(data.overtradingLossInr)})
          </p>
        </div>

        {/* Leak 3: Size Creep */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1.5 shadow-sm hover:border-[#2b7fff]/40 dark:hover:border-[#2b7fff]/50 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Position Size Creep</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500/80" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.sizeCreepTradesCount} Spikes
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Loss chasing: -{formatIndianCurrency(data.sizeCreepLossInr)}
          </p>
        </div>

        {/* Leak 4: Disposition Effect */}
        <div className="card-luminous p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-1.5 shadow-sm hover:border-[#2b7fff]/40 dark:hover:border-[#2b7fff]/50 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Holding Time Asymmetry</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.holdingLosersRatio !== null ? `${data.holdingLosersRatio.toFixed(1)}x` : "1.0x"}
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Losers ({data.avgLoserDuration}) vs Winners ({data.avgWinnerDuration})
          </p>
        </div>
      </div>
    </div>
  );
}
