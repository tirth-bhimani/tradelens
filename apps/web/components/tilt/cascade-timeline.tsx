"use client";

import React from "react";
import { Zap, AlertCircle } from "lucide-react";
import { TiltCascadeEvent } from "@/lib/tilt/types";
import { formatCurrencyINR } from "@/lib/utils/format";

export interface CascadeTimelineProps {
  cascade: TiltCascadeEvent;
}

export function CascadeTimeline({ cascade }: CascadeTimelineProps) {
  let runningLoss = 0;

  return (
    <div
      className="card-luminous border border-slate-200/80 dark:border-white/[0.08] rounded-[8px] bg-white dark:bg-[#090e1a] shadow-sm overflow-hidden"
      data-testid="cascade-timeline"
    >
      {/* Institutional Table Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 dark:bg-white/[0.02]">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Forensic Sequence Timeline ({cascade.trades.length} Connected Fills)
          </h4>
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Elapsed: {cascade.total_duration_minutes} mins • Min Re-entry Gap: {cascade.min_reentry_interval_minutes} mins
        </div>
      </div>

      {/* Execution Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-4 font-semibold w-24">Seq &amp; Phase</th>
              <th className="py-2.5 px-4 font-semibold">Instrument &amp; Execution</th>
              <th className="py-2.5 px-4 font-semibold">Velocity</th>
              <th className="py-2.5 px-4 font-semibold text-right">Trade P&amp;L</th>
              <th className="py-2.5 px-4 font-semibold text-right">Cumulative</th>
              <th className="py-2.5 px-4 font-semibold">Forensic Diagnosis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {cascade.trades.map((trade, idx) => {
              runningLoss += trade.net_pnl;
              const isTrigger = trade.is_trigger;

              const phaseBadge = isTrigger ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  TRIGGER LOSS
                </span>
              ) : trade.psychological_phase === "DESPERATION_REVENGE" ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  REVENGE
                </span>
              ) : trade.psychological_phase === "EXHAUSTION_BLOWUP" ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  BLOWUP
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  REACTION
                </span>
              );

              return (
                <tr
                  key={trade.trade_id}
                  className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] ${
                    isTrigger ? "bg-rose-50/20 dark:bg-rose-950/[0.06]" : ""
                  }`}
                >
                  {/* Sequence Node & Phase */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        T{idx}
                      </span>
                      {phaseBadge}
                    </div>
                  </td>

                  {/* Instrument & Time */}
                  <td className="py-3 px-4">
                    <div className="font-bold font-mono text-slate-900 dark:text-white">
                      {trade.symbol}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {trade.entry_time.slice(11, 16)} IST • {trade.quantity} qty ({trade.size_inflation_ratio}x size)
                    </div>
                  </td>

                  {/* Velocity Interval */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {trade.minutes_since_previous !== null ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>{trade.minutes_since_previous}m re-entry</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">
                        Initial Setup
                      </span>
                    )}
                  </td>

                  {/* Net P&L */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrencyINR(trade.net_pnl)}
                  </td>

                  {/* Running Cumulative Loss */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-500 dark:text-slate-400">
                    {formatCurrencyINR(runningLoss)}
                  </td>

                  {/* Forensic Root Cause Diagnosis */}
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-md leading-snug font-sans">
                    {trade.violation_summary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
