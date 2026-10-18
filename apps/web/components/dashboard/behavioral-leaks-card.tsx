"use client";

import { ShieldCheck, Flame, Scale, Clock, AlertCircle } from "lucide-react";
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
          <span className="w-1.5 h-1.5 rounded-full bg-[#387ed1]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Psychological & Execution Leak Analysis
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Discipline Score:
          </span>
          <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-[3px] border ${
            isGoodScore
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          }`}>
            {data.disciplineScore} / 100
          </span>
        </div>
      </div>

      {/* Primary Leak Callout Strip (Institutional Hairline Card - Zero Yellow AI Format) */}
      <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1017] space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                #1 Primary Capital Leak: {data.topLeak.title}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {data.topLeak.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Attributable Leak</span>
            <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
              -{formatIndianCurrency(data.topLeak.financialImpactInr)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Leaks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Leak 1: Re-entry Tilt */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Re-entry After Loss</span>
            <Flame className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white flex items-center justify-between">
            <span>{data.reentryTradesCount} Trades</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {data.reentryWinRate.toFixed(1)}% WR
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Damage: -{formatIndianCurrency(data.reentryLossInr)} in &le;60m
          </p>
        </div>

        {/* Leak 2: Overtrading */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Overtrading Days</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.overtradingDaysCount} {data.overtradingDaysCount === 1 ? "Day" : "Days"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Volume &gt; 1.5x median (-{formatIndianCurrency(data.overtradingLossInr)})
          </p>
        </div>

        {/* Leak 3: Size Creep */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Position Size Creep</span>
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.sizeCreepTradesCount} Spikes
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Loss chasing damage: -{formatIndianCurrency(data.sizeCreepLossInr)}
          </p>
        </div>

        {/* Leak 4: Disposition Effect */}
        <div className="p-4 rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Holding Time Asymmetry</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {data.holdingLosersRatio !== null ? `${data.holdingLosersRatio.toFixed(1)}x` : "1.0x"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Losers ({data.avgLoserDuration}) vs Winners ({data.avgWinnerDuration})
          </p>
        </div>
      </div>
    </div>
  );
}
