"use client";

import React from "react";
import { Users, TrendingUp, AlertTriangle, ShieldCheck, Flame } from "lucide-react";
import type { CohortAggregateStats } from "@/lib/coach/coach-types";

interface CohortStatsProps {
  stats: CohortAggregateStats;
}

export function CohortStats({ stats }: CohortStatsProps) {
  const {
    total_students,
    active_students,
    cohort_win_rate,
    cohort_net_pnl,
    cohort_adherence_avg,
    top_behavioral_leak,
    risk_distribution,
  } = stats;

  const totalActive = active_students || 1;
  const greenPct = Math.round((risk_distribution.green / totalActive) * 100);
  const yellowPct = Math.round((risk_distribution.yellow / totalActive) * 100);
  const redPct = Math.round((risk_distribution.red / totalActive) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Cohort Win Rate & Mentee Count */}
      <div className="card-luminous p-5 rounded-[10px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Cohort Win Rate
          </span>
          <div className="w-8 h-8 rounded-[6px] bg-blue-500/10 text-[#2b7fff] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {cohort_win_rate.toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across <span className="font-semibold text-slate-800 dark:text-slate-200">{active_students}</span> active mentees ({total_students} total)
          </p>
        </div>
      </div>

      {/* 2. Cumulative Net P&L */}
      <div className="card-luminous p-5 rounded-[10px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Cohort Net P&amp;L
          </span>
          <div
            className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${
              cohort_net_pnl >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div
            className={`text-2xl font-extrabold font-mono ${
              cohort_net_pnl >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {cohort_net_pnl >= 0
              ? `+₹${cohort_net_pnl.toLocaleString("en-IN")}`
              : `-₹${Math.abs(cohort_net_pnl).toLocaleString("en-IN")}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Average Adherence: <span className="font-semibold text-slate-800 dark:text-slate-200">{cohort_adherence_avg}%</span>
          </p>
        </div>
      </div>

      {/* 3. Top Behavioral Leak */}
      <div className="card-luminous p-5 rounded-[10px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Top Behavioral Leak
          </span>
          <div className="w-8 h-8 rounded-[6px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
            {top_behavioral_leak}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>High priority intervention</span>
          </p>
        </div>
      </div>

      {/* 4. Traffic-Light Risk Distribution */}
      <div className="card-luminous p-5 rounded-[10px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Risk Distribution
          </span>
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
        </div>

        <div className="space-y-2">
          {/* Segmented Distribution Bar */}
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden flex">
            {greenPct > 0 && (
              <div
                style={{ width: `${greenPct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Disciplined: ${risk_distribution.green}`}
              />
            )}
            {yellowPct > 0 && (
              <div
                style={{ width: `${yellowPct}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Moderate Risk: ${risk_distribution.yellow}`}
              />
            )}
            {redPct > 0 && (
              <div
                style={{ width: `${redPct}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`High Tilt Risk: ${risk_distribution.red}`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {risk_distribution.green} Clean
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {risk_distribution.yellow} Moderate
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {risk_distribution.red} Tilt Alert
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
